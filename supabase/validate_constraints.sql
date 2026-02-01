-- =====================================================
-- Constraint Validation Script
-- Run this in Supabase SQL Editor after cleaning bad data
-- =====================================================

-- Step 1: Find invalid data (review before deleting)
-- =====================================================

-- Check invalid emails in contact_messages
SELECT 'contact_messages' as table_name, id, email, 'invalid email format' as issue
FROM public.contact_messages 
WHERE email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
UNION ALL

-- Check invalid names in contact_messages
SELECT 'contact_messages' as table_name, id, email, 'name too short/long' as issue
FROM public.contact_messages 
WHERE length(trim(name)) NOT BETWEEN 2 AND 80
UNION ALL

-- Check invalid messages in contact_messages
SELECT 'contact_messages' as table_name, id, email, 'message too short/long' as issue
FROM public.contact_messages 
WHERE length(trim(message)) NOT BETWEEN 10 AND 2000
UNION ALL

-- Check invalid emails in newsletter_subscribers
SELECT 'newsletter_subscribers' as table_name, null as id, email, 'invalid email format' as issue
FROM public.newsletter_subscribers 
WHERE email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
UNION ALL

-- Check invalid names in itinerary_queries
SELECT 'itinerary_queries' as table_name, id::text, name as email, 'name too short/long' as issue
FROM public.itinerary_queries 
WHERE length(trim(name)) NOT BETWEEN 2 AND 80
UNION ALL

-- Check invalid whatsapp numbers in itinerary_queries
SELECT 'itinerary_queries' as table_name, id::text, whatsapp_number as email, 'whatsapp number invalid' as issue
FROM public.itinerary_queries 
WHERE length(regexp_replace(whatsapp_number, '[^0-9]', '', 'g')) NOT BETWEEN 8 AND 15
UNION ALL

-- Check invalid planning_time in itinerary_queries
SELECT 'itinerary_queries' as table_name, id::text, planning_time as email, 'planning_time too short/long' as issue
FROM public.itinerary_queries 
WHERE length(trim(planning_time)) NOT BETWEEN 2 AND 50
UNION ALL

-- Check invalid trip_title in itinerary_queries
SELECT 'itinerary_queries' as table_name, id::text, trip_title as email, 'trip_title too short/long' as issue
FROM public.itinerary_queries 
WHERE length(trim(trip_title)) NOT BETWEEN 2 AND 140
UNION ALL

-- Check invalid status in itinerary_queries
SELECT 'itinerary_queries' as table_name, id::text, status as email, 'invalid status' as issue
FROM public.itinerary_queries 
WHERE status NOT IN ('new', 'contacted', 'closed');


-- Step 2: Clean up invalid data (CAREFUL - THIS DELETES DATA!)
-- =====================================================
-- Uncomment and run these after reviewing the results above

/*
-- Delete invalid contact messages
DELETE FROM public.contact_messages 
WHERE email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
   OR length(trim(name)) NOT BETWEEN 2 AND 80
   OR length(trim(message)) NOT BETWEEN 10 AND 2000;

-- Delete invalid newsletter subscribers
DELETE FROM public.newsletter_subscribers 
WHERE email !~* '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$';

-- Delete invalid itinerary queries
DELETE FROM public.itinerary_queries 
WHERE length(trim(name)) NOT BETWEEN 2 AND 80
   OR length(regexp_replace(whatsapp_number, '[^0-9]', '', 'g')) NOT BETWEEN 8 AND 15
   OR length(trim(planning_time)) NOT BETWEEN 2 AND 50
   OR length(trim(trip_title)) NOT BETWEEN 2 AND 140
   OR status NOT IN ('new', 'contacted', 'closed');
*/


-- Step 3: Validate all constraints (enforces them on existing data)
-- =====================================================
-- Run these AFTER cleaning invalid data

ALTER TABLE public.itinerary_queries 
  VALIDATE CONSTRAINT itinerary_queries_name_len;

ALTER TABLE public.itinerary_queries 
  VALIDATE CONSTRAINT itinerary_queries_whatsapp_len;

ALTER TABLE public.itinerary_queries 
  VALIDATE CONSTRAINT itinerary_queries_planning_time_len;

ALTER TABLE public.itinerary_queries 
  VALIDATE CONSTRAINT itinerary_queries_trip_title_len;

ALTER TABLE public.itinerary_queries 
  VALIDATE CONSTRAINT itinerary_queries_status_chk;

ALTER TABLE public.contact_messages 
  VALIDATE CONSTRAINT contact_messages_name_len;

ALTER TABLE public.contact_messages 
  VALIDATE CONSTRAINT contact_messages_email_fmt;

ALTER TABLE public.contact_messages 
  VALIDATE CONSTRAINT contact_messages_message_len;

ALTER TABLE public.newsletter_subscribers 
  VALIDATE CONSTRAINT newsletter_subscribers_email_fmt;


-- Step 4: Verify all constraints are now valid
-- =====================================================

SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name,
  convalidated as is_validated
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND contype = 'c'  -- check constraints
  AND conrelid::regclass::text IN (
    'public.itinerary_queries',
    'public.contact_messages', 
    'public.newsletter_subscribers'
  )
ORDER BY table_name, constraint_name;

-- All constraints should show is_validated = true ✅
