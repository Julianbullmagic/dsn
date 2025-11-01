-- SQL commands to create the booking_leads table
-- Run these commands in the Supabase SQL editor

-- Create the booking_leads table
CREATE TABLE IF NOT EXISTS booking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE booking_leads ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view all booking leads
CREATE POLICY "Users can view booking leads" ON booking_leads
FOR SELECT USING (true);

-- Users can insert their own booking leads
CREATE POLICY "Users can create their own booking leads" ON booking_leads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own booking leads
CREATE POLICY "Users can delete their own booking leads" ON booking_leads
FOR DELETE USING (auth.uid() = user_id);