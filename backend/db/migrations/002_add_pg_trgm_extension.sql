-- Migration: Add pg_trgm extension for better fuzzy text matching
-- This enables similarity() and other trigram functions for improved knowledge base search

-- Enable pg_trgm extension for trigram similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a trigram similarity index on question_pattern for faster searches
-- This index supports the similarity() function and LIKE/ILIKE queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_question_pattern_trgm
ON knowledge_base USING gin (question_pattern gin_trgm_ops);

-- Add a computed column for normalized question text (optional, for future enhancement)
-- This can help with better matching by removing common words and standardizing format
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS normalized_question TEXT;

-- Create index on normalized question for faster matching
CREATE INDEX IF NOT EXISTS idx_knowledge_base_normalized_trgm
ON knowledge_base USING gin (normalized_question gin_trgm_ops)
WHERE normalized_question IS NOT NULL;

-- Function to normalize questions (removes common filler words, lowercase, trim)
CREATE OR REPLACE FUNCTION normalize_question(question TEXT)
RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
    filler_words TEXT[] := ARRAY['the', 'is', 'are', 'do', 'does', 'a', 'an', 'what', 'where', 'when', 'how', 'which', 'who'];
    word TEXT;
BEGIN
    -- Convert to lowercase and trim
    normalized := LOWER(TRIM(question));

    -- Remove punctuation except apostrophes
    normalized := REGEXP_REPLACE(normalized, '[^\w\s'']', '', 'g');

    -- Remove multiple spaces
    normalized := REGEXP_REPLACE(normalized, '\s+', ' ', 'g');

    -- Note: For now, we keep all words. In the future, we could:
    -- 1. Remove filler words from the array above
    -- 2. Use stemming/lemmatization
    -- This is left as a future enhancement for Option 2

    RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-populate normalized_question when question_pattern changes
CREATE OR REPLACE FUNCTION update_normalized_question()
RETURNS TRIGGER AS $$
BEGIN
    NEW.normalized_question := normalize_question(NEW.question_pattern);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update normalized_question
CREATE TRIGGER trigger_normalize_question
    BEFORE INSERT OR UPDATE OF question_pattern ON knowledge_base
    FOR EACH ROW
    EXECUTE FUNCTION update_normalized_question();

-- Backfill normalized_question for existing entries
UPDATE knowledge_base
SET normalized_question = normalize_question(question_pattern)
WHERE normalized_question IS NULL;

-- Comments for documentation
COMMENT ON COLUMN knowledge_base.normalized_question IS 'Normalized version of question_pattern for improved fuzzy matching (auto-populated)';
COMMENT ON FUNCTION normalize_question(TEXT) IS 'Normalizes question text by lowercasing, removing punctuation, and trimming whitespace';

-- Show migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 002_add_pg_trgm_extension completed successfully';
    RAISE NOTICE 'pg_trgm extension enabled for improved fuzzy text matching';
    RAISE NOTICE 'Trigram indexes created on question_pattern and normalized_question';
END $$;
