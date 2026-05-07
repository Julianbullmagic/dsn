-- ============================================================
-- Fix ON DELETE behaviour for all foreign keys referencing users
-- Run this in the Supabase SQL Editor BEFORE trying to delete users.
-- Safe to run multiple times. Skips tables that don't exist.
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='posts') THEN
    ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
    ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='suggestions') THEN
    ALTER TABLE suggestions DROP CONSTRAINT IF EXISTS suggestions_user_id_fkey;
    ALTER TABLE suggestions ADD CONSTRAINT suggestions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='referenda') THEN
    ALTER TABLE referenda DROP CONSTRAINT IF EXISTS referenda_suggestion_id_fkey;
    ALTER TABLE referenda ADD CONSTRAINT referenda_suggestion_id_fkey
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='votes') THEN
    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_user_id_fkey;
    ALTER TABLE votes ADD CONSTRAINT votes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_suggestion_id_fkey;
    ALTER TABLE votes ADD CONSTRAINT votes_suggestion_id_fkey
      FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE;

    ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_referendum_id_fkey;
    ALTER TABLE votes ADD CONSTRAINT votes_referendum_id_fkey
      FOREIGN KEY (referendum_id) REFERENCES referenda(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='messages') THEN
    ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
    ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='booking_leads') THEN
    ALTER TABLE booking_leads DROP CONSTRAINT IF EXISTS booking_leads_user_id_fkey;
    ALTER TABLE booking_leads ADD CONSTRAINT booking_leads_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='admin_votes') THEN
    ALTER TABLE admin_votes DROP CONSTRAINT IF EXISTS admin_votes_voter_id_fkey;
    ALTER TABLE admin_votes ADD CONSTRAINT admin_votes_voter_id_fkey
      FOREIGN KEY (voter_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE admin_votes DROP CONSTRAINT IF EXISTS admin_votes_candidate_id_fkey;
    ALTER TABLE admin_votes ADD CONSTRAINT admin_votes_candidate_id_fkey
      FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='leader_tenure') THEN
    ALTER TABLE leader_tenure DROP CONSTRAINT IF EXISTS leader_tenure_user_id_fkey;
    ALTER TABLE leader_tenure ADD CONSTRAINT leader_tenure_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- restrictions / arbitration tables already have correct CASCADE — no changes needed.
