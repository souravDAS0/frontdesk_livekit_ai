-- Migration 007: Remove confidence_threshold field from knowledge_base
-- This field was defined but never actually used in the application logic.
-- The agent uses hardcoded thresholds instead of per-answer thresholds.

-- Remove confidence_threshold column from knowledge_base
ALTER TABLE knowledge_base
DROP COLUMN IF EXISTS confidence_threshold;

-- Update log_request_status_change() function to update the unresolved status message
-- Changed from "Request timed out without response or response was rejected"
-- to "Request timed out without response"
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
                WHEN NEW.status = 'unresolved' THEN 'Request timed out without response'
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
