// Supabase client configuration
// You need to replace these with your actual Supabase credentials
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL', // Replace with your Supabase URL
    key: process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY'  // Replace with your Supabase anon key
};

// Function to initialize Supabase client
function initSupabase() {
    try {
        // Try to import and initialize the Supabase client
        const { createClient } = require('@supabase/supabase-js');
        
        // Check if credentials are provided
        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.key) {
            console.error('Supabase credentials are missing. Please set SUPABASE_URL and SUPABASE_KEY in your environment variables.');
            return null;
        }

        const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

        // Test the connection
        supabase.auth.getSession().then(session => {
            if (session.error) {
                console.error('Failed to get session:', session.error);
            } else {
                console.log('Supabase client initialized successfully.');
            }
        });

        return supabase;
    } catch (error) {
        console.error('Supabase client could not be initialized:', error);
        console.warn('Make sure to install @supabase/supabase-js and set your credentials.');
        return null;
    }
}

// Example of how the database tables are structured:
/*
TABLE users {
    id: UUID (Primary Key)
    username: STRING
    email: STRING
    created_at: TIMESTAMP
}

TABLE posts {
    id: UUID (Primary Key)
    user_id: UUID (Foreign Key to users)
    content: TEXT
    created_at: TIMESTAMP
}

TABLE suggestions {
    id: UUID (Primary Key)
    user_id: UUID (Foreign Key to users)
    title: STRING
    description: TEXT
    vote_count: INTEGER (default: 0)
    created_at: TIMESTAMP
}

TABLE referenda {
    id: UUID (Primary Key)
    suggestion_id: UUID (Foreign Key to suggestions)
    title: STRING
    description: TEXT
    yes_votes: INTEGER (default: 0)
    no_votes: INTEGER (default: 0)
    status: STRING (active, passed, failed)
    created_at: TIMESTAMP
    ended_at: TIMESTAMP (nullable)
}

TABLE votes {
    id: UUID (Primary Key)
    user_id: UUID (Foreign Key to users)
    suggestion_id: UUID (Foreign Key to suggestions, nullable)
    referendum_id: UUID (Foreign Key to referenda, nullable)
    vote_type: STRING (support, oppose, yes, no)
    created_at: TIMESTAMP
}

TABLE messages {
    id: UUID (Primary Key)
    user_id: UUID (Foreign Key to users)
    room: STRING
    content: TEXT
    created_at: TIMESTAMP
}

TABLE booking_leads {
    id: UUID (Primary Key)
    user_id: UUID (Foreign Key to users)
    date: DATE
    duration: STRING
    description: TEXT
    created_at: TIMESTAMP DEFAULT NOW()
}
*/

module.exports = { initSupabase, SUPABASE_CONFIG };