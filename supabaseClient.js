// Supabase client configuration
// You need to replace these with your actual Supabase credentials
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL', // Replace with your Supabase URL
    key: process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY'  // Replace with your Supabase anon key
};

// Function to initialize Supabase client
async function initSupabase() {
    try {
        // Try to load the library (ESM-first, then CJS fallback)
        let createClient;
        try {
            ({ createClient } = await import('@supabase/supabase-js'));
        } catch (e1) {
            try {
                ({ createClient } = require('@supabase/supabase-js'));
            } catch (e2) {
                console.warn('Supabase import failed:', e1?.message || e1);
                console.warn('CJS require fallback failed:', e2?.message || e2);
                throw e1;
            }
        }

        // Accept common env var aliases and trim any accidental whitespace
        const pickFirst = (pairs) => {
            for (const [name, val] of pairs) {
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return { name, value: String(val).trim() };
                }
            }
            return { name: undefined, value: undefined };
        };

        const urlPick = pickFirst([
            ['SUPABASE_URL', process.env.SUPABASE_URL],
            ['NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL],
            ['VITE_SUPABASE_URL', process.env.VITE_SUPABASE_URL],
            ['SUPABASE_CONFIG.url', SUPABASE_CONFIG.url]
        ]);

        const keyPick = pickFirst([
            ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
            ['SUPABASE_KEY', process.env.SUPABASE_KEY],
            ['SUPABASE_ANON_KEY', process.env.SUPABASE_ANON_KEY],
            ['NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY],
            ['VITE_SUPABASE_ANON_KEY', process.env.VITE_SUPABASE_ANON_KEY],
            ['SUPABASE_CONFIG.key', SUPABASE_CONFIG.key]
        ]);

        const url = urlPick.value;
        const key = keyPick.value;

        // Log non-sensitive diagnostics
        let urlHost = 'invalid';
        try { urlHost = url ? new URL(url).host : 'missing'; } catch {}
        const keyPreview = key ? `${String(key).slice(0,6)}... (len:${String(key).length})` : 'missing';
        console.log('[Supabase] Env detection:', {
            node: process.version,
            urlVar: urlPick.name,
            urlHost,
            keyVar: keyPick.name,
            keyPreview
        });

        if (!url || !key || /YOUR_SUPABASE_URL|YOUR_SUPABASE_KEY/.test(`${url}${key}`)) {
            console.warn('Supabase credentials missing or placeholder values detected.');
            throw new Error('MissingSupabaseEnv');
        }

        const client = createClient(url, key);
        // Mark as real for downstream logs
        Object.defineProperty(client, '__mock', { value: false });
        console.log('[Supabase] Client initialized successfully.');
        return client;
    } catch (error) {
        console.warn('Supabase client could not be initialized. Using mock implementation.');
        console.warn('Make sure @supabase/supabase-js is installed and credentials are set.');
        console.warn('Init reason:', error?.message || error);
        
        // Return a chain-friendly and await-able mock client if Supabase is not available
        const createBuilder = (_table) => {
            const state = { mode: 'list', lastInserted: null };
            const builder = {
                // Starters
                select: () => builder,
                insert: (data) => { state.lastInserted = Array.isArray(data) ? data[0] : data; return builder; },
                update: () => builder,
                delete: () => builder,
                // Filters/clauses (all chainable)
                or: () => builder,
                eq: () => builder,
                lt: () => builder,
                is: () => builder,
                in: () => builder,
                order: () => builder,
                // Finalizer
                single: () => { state.mode = 'single'; return builder; },
                // Thenable so `await` works at any point
                then: (resolve) => resolve({ data: state.mode === 'single' ? (state.lastInserted || null) : [], error: null }),
                catch: () => builder,
                finally: () => {}
            };
            return builder;
        };

        const mock = {
            from: (table) => createBuilder(table)
        };
        Object.defineProperty(mock, '__mock', { value: true });
        console.log('[Supabase] Mock client active.');
        return mock;
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