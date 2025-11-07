-- Migration: Expand knowledge base tags to include common domain terms
-- Purpose: Improve semantic matching by adding synonyms and related terms to existing KB entries
-- Date: 2025-11-05

-- Update "Where are you located?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['location', 'address', 'directions', 'salon', 'place', 'business', 'where', 'find']
WHERE question_pattern = 'Where are you located?';

-- Update "What are your business hours?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['hours', 'schedule', 'timing', 'open', 'closed', 'time', 'when']
WHERE question_pattern = 'What are your business hours?';

-- Update "How much does a haircut cost?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['pricing', 'haircut', 'services', 'cost', 'price', 'rates', 'how-much', 'fees']
WHERE question_pattern = 'How much does a haircut cost?';

-- Update "Do you take walk-ins?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['appointments', 'booking', 'walk-ins', 'reservation', 'schedule', 'availability']
WHERE question_pattern = 'Do you take walk-ins?';

-- Update "What services do you offer?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['services', 'offerings', 'treatments', 'menu', 'options', 'what', 'available']
WHERE question_pattern = 'What services do you offer?';

-- Update "Can I book an appointment online?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['booking', 'appointments', 'online', 'reservation', 'schedule', 'how', 'website']
WHERE question_pattern = 'Can I book an appointment online?';

-- Update "What is your cancellation policy?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['policy', 'cancellation', 'fees', 'rules', 'cancel', 'no-show', 'refund']
WHERE question_pattern = 'What is your cancellation policy?';

-- Update "Do you offer bridal services?" entry with expanded tags
UPDATE knowledge_base
SET tags = ARRAY['bridal', 'wedding', 'special-events', 'bride', 'makeup', 'packages']
WHERE question_pattern = 'Do you offer bridal services?';

-- Log the updates
SELECT
  question_pattern,
  tags
FROM knowledge_base
WHERE question_pattern IN (
  'Where are you located?',
  'What are your business hours?',
  'How much does a haircut cost?',
  'Do you take walk-ins?',
  'What services do you offer?',
  'Can I book an appointment online?',
  'What is your cancellation policy?',
  'Do you offer bridal services?'
)
ORDER BY created_at;
