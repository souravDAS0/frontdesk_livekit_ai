-- Migration: Add 'unresolved' status to help_requests table
-- This allows rejecting responses to timed-out requests

-- Drop the existing constraints
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS help_requests_status_check;
ALTER TABLE help_requests DROP CONSTRAINT IF EXISTS valid_status;

-- Add updated status check constraint with 'unresolved'
ALTER TABLE help_requests
  ADD CONSTRAINT help_requests_status_check
  CHECK (status IN ('pending', 'resolved', 'timeout', 'unresolved'));

-- Add updated valid_status constraint with 'unresolved' logic
ALTER TABLE help_requests
  ADD CONSTRAINT valid_status CHECK (
    (status = 'pending' AND resolved_at IS NULL AND supervisor_response IS NULL) OR
    (status = 'resolved' AND resolved_at IS NOT NULL AND supervisor_response IS NOT NULL) OR
    (status = 'timeout' AND timeout_at IS NOT NULL) OR
    (status = 'unresolved' AND timeout_at IS NOT NULL)
  );

-- Update the status change logging function to handle 'unresolved'
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
                WHEN NEW.status = 'timeout' THEN 'Request timed out without response'
                WHEN NEW.status = 'unresolved' THEN 'Request timed out and response was rejected'
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comment to include 'unresolved' status
COMMENT ON COLUMN help_requests.status IS 'Current state: pending (waiting for supervisor), resolved (answered), timeout (no response within deadline), or unresolved (timed out and response rejected)';
