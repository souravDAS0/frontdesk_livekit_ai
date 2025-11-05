-- Migration: Update knowledge base with Priya's Beauty Lounge comprehensive data
-- Purpose: Fix tag issues, update business info, and add comprehensive service questions
-- Date: 2025-11-05

-- =============================================================================
-- SECTION 1: Update existing entries
-- =============================================================================

-- Fix tags on "What services do you offer?" - remove 'available' to prevent false matches
UPDATE knowledge_base
SET tags = ARRAY['services', 'offerings', 'treatments', 'menu', 'options']
WHERE question_pattern = 'What services do you offer?';

-- Update business hours with new schedule (Monday closed, updated times)
UPDATE knowledge_base
SET
  answer = 'We are open Tuesday through Friday from 10 AM to 7 PM, Saturday from 9 AM to 8 PM, and Sunday from 10 AM to 6 PM. We are closed on Mondays.',
  tags = ARRAY['hours', 'schedule', 'timing', 'open', 'closed', 'time', 'when', 'monday']
WHERE question_pattern = 'What are your business hours?';

-- Update location with Edison, NJ address and parking details
UPDATE knowledge_base
SET
  answer = 'We are located at 847 Oak Street, Edison, NJ 07820, in a shopping plaza with ample parking near Route 27.',
  tags = ARRAY['location', 'address', 'directions', 'salon', 'place', 'business', 'where', 'find', 'parking']
WHERE question_pattern = 'Where are you located?';

-- =============================================================================
-- SECTION 2: Insert new knowledge base entries
-- =============================================================================

-- Contact: Phone number
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'What is your phone number?',
  'You can reach us at (732) 555-0194. We are available during business hours to take your calls and answer questions.',
  ARRAY['contact', 'phone', 'call', 'number', 'reach', 'telephone']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Contact: Email address
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'What is your email address?',
  'You can email us at appointments@priyasbeautylounge.com for inquiries and appointment requests.',
  ARRAY['email', 'contact', 'correspondence', 'write', 'message']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Makeup pricing
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'How much does makeup cost?',
  'Basic makeup starts at $50-$70. Party or event makeup ranges from $100-$150. Bridal makeup packages start at $200.',
  ARRAY['makeup', 'pricing', 'cost', 'party', 'event', 'bridal', 'price']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Facial treatments
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'What facial treatments do you offer?',
  'We offer classic facials ($65-$85), anti-aging facials ($95-$130), acne treatment facials ($80-$110), and gold facials ($150).',
  ARRAY['facial', 'skincare', 'treatments', 'anti-aging', 'acne', 'gold', 'skin']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Threading
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Do you do threading?',
  'Yes! We offer eyebrow threading for $12 and full face threading for $35.',
  ARRAY['threading', 'eyebrows', 'facial-hair', 'hair-removal', 'brows']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Waxing
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'What waxing services do you have?',
  'We offer upper lip waxing ($8), full arms ($35), and full legs ($60). Additional waxing services are available upon request.',
  ARRAY['waxing', 'hair-removal', 'legs', 'arms', 'upper-lip']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Nails and manicures
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Do you do manicures and nails?',
  'Yes! We offer basic manicures for $25 and nail art starting at $5-$15 per nail.',
  ARRAY['nails', 'manicure', 'nail-art', 'polish', 'hands']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Henna/Mehndi
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Do you offer henna or mehndi?',
  'Yes! We specialize in bridal henna/mehndi services ranging from $200-$400 depending on the design complexity.',
  ARRAY['henna', 'mehndi', 'bridal', 'special', 'indian', 'design']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Amenities: WiFi and waiting area
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Do you have WiFi or a waiting area?',
  'Yes! We have a comfortable waiting lounge with complimentary tea and coffee, plus free WiFi for all clients.',
  ARRAY['amenities', 'wifi', 'waiting', 'lounge', 'features', 'comfort']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Hours: Monday closure specific
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Are you open on Mondays?',
  'No, we are closed on Mondays. We are open Tuesday through Sunday with varying hours.',
  ARRAY['monday', 'closed', 'hours', 'schedule', 'days', 'day-off']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Staff: Stylist information
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'Who are the stylists?',
  'Our team includes Priya Sharma, the owner and senior stylist with 12 years of experience, and Kavya Desai, our junior stylist and assistant.',
  ARRAY['staff', 'stylists', 'team', 'who', 'employees', 'priya', 'kavya']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- Services: Hair coloring pricing
INSERT INTO knowledge_base (question_pattern, answer, tags)
VALUES (
  'How much does hair coloring cost?',
  'Full hair coloring services range from $120 to $200 depending on hair length and color complexity.',
  ARRAY['coloring', 'pricing', 'hair', 'dye', 'color', 'highlights', 'cost']
)
ON CONFLICT (question_pattern) DO UPDATE
SET answer = EXCLUDED.answer, tags = EXCLUDED.tags;

-- =============================================================================
-- SECTION 3: Verification query
-- =============================================================================

-- Log all knowledge base entries after migration
SELECT
  question_pattern,
  answer,
  tags,
  created_at,
  times_used
FROM knowledge_base
ORDER BY created_at DESC;

-- Summary statistics
SELECT
  COUNT(*) as total_entries,
  COUNT(CASE WHEN learned_from_request_id IS NULL THEN 1 END) as seed_entries,
  COUNT(CASE WHEN learned_from_request_id IS NOT NULL THEN 1 END) as learned_entries
FROM knowledge_base;
