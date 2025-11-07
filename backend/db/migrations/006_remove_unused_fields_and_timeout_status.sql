-- Migration: Remove unused fields and 'timeout' status
-- Removes agent_confidence and conversation_context (never used)
-- Removes 'timeout' status (replaced by 'unresolved' in practice)

-- Step 1: Drop unused columns
ALTER TABLE help_requests DROP COLUMN IF EXISTS agent_confidence;
ALTER TABLE help_requests DROP COLUMN IF EXISTS conversation_context;

-- Step 2: Update status constraint to remove 'timeout'
-- Drop existing constraints
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_status_check;
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS valid_status;

-- Add updated status check constraint WITHOUT 'timeout'
ALTER TABLE help_requests
  ADD CONSTRAINT help_requests_status_check
  CHECK (status IN ('pending', 'resolved', 'unresolved'));

-- Add updated valid_status constraint WITHOUT 'timeout'
ALTER TABLE help_requests
  ADD CONSTRAINT valid_status CHECK (
    (status = 'pending' AND resolved_at IS NULL AND supervisor_response IS NULL) OR
    (status = 'resolved' AND resolved_at IS NOT NULL AND supervisor_response IS NOT NULL) OR
    (status = 'unresolved' AND timeout_at IS NOT NULL)
  );

-- Step 3: Update the status change logging function to remove 'timeout'
CREATE OR REPLACE FUNCTION log_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO request_history (request_id, previous_status, new_status, changed_by, notes)
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(current_setting('app.current_user', true), 'system'),
            CASE
                WHEN NEW.status = 'resolved' THEN 'Supervisor provided response'
                WHEN NEW.status = 'unresolved' THEN 'Request timed out without response or response was rejected'
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comment to remove 'timeout' status
COMMENT ON COLUMN help_requests.status IS 'Current state: pending (waiting for supervisor), resolved (answered), or unresolved (timed out without response or response rejected after timeout)';
