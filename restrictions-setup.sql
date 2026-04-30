-- Run this in the Supabase SQL editor to set up the restriction/arbitration system

CREATE TABLE IF NOT EXISTS restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  accused_id UUID REFERENCES users(id) ON DELETE CASCADE,
  accuser_id UUID REFERENCES users(id) ON DELETE SET NULL,
  restriction_type TEXT NOT NULL CHECK (restriction_type IN ('chat', 'newsfeed', 'referenda', 'elections', 'complete')),
  reason TEXT NOT NULL,
  duration_hours INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS arbitration_panels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restriction_id UUID REFERENCES restrictions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assembling' CHECK (status IN ('assembling', 'active', 'decided')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arbitration_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES arbitration_panels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  seat INTEGER NOT NULL CHECK (seat IN (1, 2, 3)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  vote TEXT CHECK (vote IN ('approve', 'reject')),
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (panel_id, seat)
);

CREATE TABLE IF NOT EXISTS arbitration_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  panel_id UUID REFERENCES arbitration_panels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add approximate location to users (run separately if users table already exists)
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
