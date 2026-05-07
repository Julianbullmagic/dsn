-- ============================================================
-- Row Level Security (RLS) — Democratic Social Network
-- Run this in the Supabase SQL Editor (Settings → SQL Editor).
--
-- Safe to run multiple times (idempotent).
-- Skips any table that does not exist yet.
--
-- The Node.js backend connects with SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS entirely, so all server logic is unaffected.
-- These policies block anyone who connects with the anon key.
-- ============================================================

-- ── 1. Schema: add email_hash column ────────────────────────
-- Only runs if the users table exists.

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT UNIQUE;
    COMMENT ON COLUMN users.email      IS 'AES-256 encrypted email address';
    COMMENT ON COLUMN users.email_hash IS 'HMAC-SHA256 of lowercase email — used for lookups';
    COMMENT ON COLUMN users.location   IS 'AES-256 encrypted approximate location';
  END IF;
END;
$$;


-- ── 2. Drop all existing policies (clean slate) ─────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END;
$$;


-- ── 3. Enable RLS — skips tables that don't exist yet ───────

DO $$
DECLARE
  t TEXT;
  all_tables TEXT[] := ARRAY[
    'users', 'posts', 'suggestions', 'referenda', 'votes',
    'messages', 'booking_leads', 'admin_votes', 'leader_tenure',
    'restrictions', 'arbitration_panels', 'arbitration_members',
    'arbitration_messages'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables LOOP
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END;
$$;


-- ── 4. Create policies — each block checks table existence ───

-- users: no direct client access (PII — encrypted emails/location)
-- No permissive policies → every anon operation is denied by default.

-- posts: public news-feed, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
    CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);
  END IF;
END $$;

-- suggestions: public proposal board, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'suggestions') THEN
    CREATE POLICY "suggestions_public_read" ON suggestions FOR SELECT USING (true);
  END IF;
END $$;

-- referenda: public list, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referenda') THEN
    CREATE POLICY "referenda_public_read" ON referenda FOR SELECT USING (true);
  END IF;
END $$;

-- votes: transparent voting, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'votes') THEN
    CREATE POLICY "votes_public_read" ON votes FOR SELECT USING (true);
  END IF;
END $$;

-- messages: semi-public chat, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
    CREATE POLICY "messages_public_read" ON messages FOR SELECT USING (true);
  END IF;
END $$;

-- booking_leads: public board, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'booking_leads') THEN
    CREATE POLICY "booking_leads_public_read" ON booking_leads FOR SELECT USING (true);
  END IF;
END $$;

-- admin_votes: transparent elections, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_votes') THEN
    CREATE POLICY "admin_votes_public_read" ON admin_votes FOR SELECT USING (true);
  END IF;
END $$;

-- leader_tenure: public accountability record, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leader_tenure') THEN
    CREATE POLICY "leader_tenure_public_read" ON leader_tenure FOR SELECT USING (true);
  END IF;
END $$;

-- restrictions: community moderation log, read-only for anon clients
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restrictions') THEN
    CREATE POLICY "restrictions_public_read" ON restrictions FOR SELECT USING (true);
  END IF;
END $$;

-- arbitration tables: private — no policies → anon access fully denied
-- (arbitration_panels, arbitration_members, arbitration_messages)
