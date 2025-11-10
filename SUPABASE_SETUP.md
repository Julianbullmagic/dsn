# Supabase Database Setup Guide

This guide will help you set up the Supabase database for the Democratic Social Network application.

## 1. Create a Supabase Account and Project

1. Go to [https://supabase.io](https://supabase.io)
2. Click "Start your project" and sign up for an account
3. Create a new project:
   - Choose a name for your project (e.g., "Democratic Social Network")
   - Select a region closest to you
   - Set a strong database password
   - Click "Create new project"

Wait for your project to be created (this may take a few minutes).

## 2. Get Your API Credentials

Once your project is ready:

1. Click on "Settings" in the left sidebar
2. Go to "API" in the settings menu
3. Copy your "Project URL" and "anon" public key - you'll need these later

## 3. Set Up Authentication

Before creating tables, let's set up authentication:

1. In the Supabase dashboard, click on "Authentication" in the left sidebar
2. Go to "Settings" and make sure "Enable email signup" is checked
3. Enable "Confirm email" to ensure users verify their email addresses
4. You can customize other authentication settings as needed

## 4. Create Database Tables

Navigate to the "Table Editor" in the left sidebar and create the following tables:

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  admin_votes INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token TEXT
);
```

### Posts Table

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Suggestions Table

```sql
CREATE TABLE suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Referenda Table

```sql
CREATE TABLE referenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES suggestions(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  yes_votes INTEGER DEFAULT 0,
  no_votes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, passed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);
```

### Votes Table

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  suggestion_id UUID REFERENCES suggestions(id),
  referendum_id UUID REFERENCES referenda(id),
  vote_type TEXT NOT NULL, -- support, oppose, yes, no
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  room TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Booking Leads Table

```sql
CREATE TABLE booking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Admin Votes Table

```sql
CREATE TABLE admin_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id UUID REFERENCES users(id),
  candidate_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(voter_id, candidate_id) -- Each voter can only vote once for each candidate
);
```

Alternatively, you can use the provided `booking_leads_setup.sql` file which contains all the necessary commands.

## 5. Set Up Row Level Security (RLS)

To ensure data security, you should enable Row Level Security on your tables:

1. In the Supabase dashboard, go to "Authentication" > "Policies"
2. Enable RLS for each table
3. Create policies as needed for your application

Example policies:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_leads ENABLE ROW LEVEL SECURITY;

-- Users can view all users
CREATE POLICY "Users can view all users" ON users
FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can create their own posts" ON posts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view all posts
CREATE POLICY "Users can view all posts" ON posts
FOR SELECT USING (true);

-- Users can insert their own suggestions
CREATE POLICY "Users can create their own suggestions" ON suggestions
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view all suggestions
CREATE POLICY "Users can view all suggestions" ON suggestions
FOR SELECT USING (true);

-- Users can view all referenda
CREATE POLICY "Users can view all referenda" ON referenda
FOR SELECT USING (true);

-- Users can insert their own booking leads
CREATE POLICY "Users can create their own booking leads" ON booking_leads
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own booking leads
CREATE POLICY "Users can delete their own booking leads" ON booking_leads
FOR DELETE USING (auth.uid() = user_id);
```

## 6. Testing Your Setup

1. Make sure your environment variables are set:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anon key
   - `EMAIL_USER` - Your email account for sending notifications
   - `EMAIL_PASS` - Your email password or app-specific password
   - `JWT_SECRET` - Your JWT secret for authentication

2. Start your application:
   ```
   npm run dev
   ```

3. Visit `http://localhost:3000` in your browser

4. Try registering, verifying your email, and logging in

## 7. Troubleshooting

If you encounter issues:

1. Check that your Supabase credentials are correct
2. Verify that all required tables have been created
3. Ensure that Row Level Security policies are properly configured
4. Check the browser console and server logs for error messages

## 8. Next Steps

1. Implement user authentication with Supabase Auth
2. Add more sophisticated email notification templates
3. Enhance the UI with additional features like lead filtering or search
4. Add admin controls for managing leads
5. Implement real-time updates using Supabase Realtime