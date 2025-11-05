-- Initial Database Schema for Frontdesk AI Supervisor
-- This migration creates the core tables for the human-in-the-loop system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Help Requests Table
-- Tracks all escalations from the AI agent to human supervisors
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_phone VARCHAR(20) NOT NULL,
  question TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'resolved', 'timeout')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE,
  supervisor_response TEXT,
  call_id VARCHAR(100),

  -- Metadata for tracking and debugging
  agent_confidence FLOAT, -- AI confidence score when it decided to escalate
  conversation_context JSONB, -- Store conversation history if needed

  -- Constraints
  CONSTRAINT valid_status CHECK (
    (status = 'pending' AND resolved_at IS NULL AND supervisor_response IS NULL) OR
    (status = 'resolved' AND resolved_at IS NOT NULL AND supervisor_response IS NOT NULL) OR
    (status = 'timeout' AND timeout_at IS NOT NULL)
  )
);

-- Knowledge Base Table
-- Stores learned Q&A pairs from supervisor responses
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_pattern TEXT NOT NULL,
  answer TEXT NOT NULL,
  learned_from_request_id UUID REFERENCES help_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  times_used INTEGER DEFAULT 0,

  -- Additional metadata
  confidence_threshold FLOAT DEFAULT 0.8, -- Minimum confidence to use this answer
  is_active BOOLEAN DEFAULT true, -- Allow disabling outdated answers
  tags TEXT[], -- Categorize answers for better retrieval

  -- Prevent duplicate patterns
  CONSTRAINT unique_question_pattern UNIQUE (question_pattern)
);

-- Request History Log
-- Audit trail for all state changes on help requests
CREATE TABLE IF NOT EXISTS request_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  changed_by VARCHAR(100), -- 'system' or supervisor identifier
  notes TEXT
);

-- Indexes for performance
-- Help requests queries
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_created_at ON help_requests(created_at DESC);
CREATE INDEX idx_help_requests_customer_phone ON help_requests(customer_phone);
CREATE INDEX idx_help_requests_timeout ON help_requests(timeout_at) WHERE status = 'pending';

-- Knowledge base queries
CREATE INDEX idx_knowledge_base_active ON knowledge_base(is_active) WHERE is_active = true;
CREATE INDEX idx_knowledge_base_times_used ON knowledge_base(times_used DESC);
CREATE INDEX idx_knowledge_base_created_at ON knowledge_base(created_at DESC);

-- Full-text search on knowledge base (for better question matching)
CREATE INDEX idx_knowledge_base_question_pattern_fts ON knowledge_base USING gin(to_tsvector('english', question_pattern));

-- Request history queries
CREATE INDEX idx_request_history_request_id ON request_history(request_id);
CREATE INDEX idx_request_history_changed_at ON request_history(changed_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on knowledge_base
CREATE TRIGGER update_knowledge_base_updated_at
    BEFORE UPDATE ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically log request status changes
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
                ELSE NULL
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-log status changes
CREATE TRIGGER log_help_request_status_change
    AFTER UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_request_status_change();

-- Comments for documentation
COMMENT ON TABLE help_requests IS 'Stores all help requests escalated from AI agent to human supervisors';
COMMENT ON TABLE knowledge_base IS 'Learned Q&A pairs that the AI agent can use to answer future questions';
COMMENT ON TABLE request_history IS 'Audit trail of all status changes on help requests';

COMMENT ON COLUMN help_requests.status IS 'Current state: pending (waiting for supervisor), resolved (answered), or timeout (no response within deadline)';
COMMENT ON COLUMN help_requests.timeout_at IS 'Calculated timestamp when request should timeout if not answered';
COMMENT ON COLUMN knowledge_base.times_used IS 'Counter for how many times this answer has been used by the agent';
COMMENT ON COLUMN knowledge_base.confidence_threshold IS 'Minimum similarity score required to use this answer';
