// Setup script for creating the booking_leads table in Supabase
const { createClient } = require('@supabase/supabase-js');

// You need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';

if (supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseKey === 'YOUR_SUPABASE_KEY') {
    console.error('Please set your Supabase credentials in the environment variables SUPABASE_URL and SUPABASE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBookingLeadsTable() {
    console.log('Setting up booking_leads table...');
    
    try {
        // Check if the table already exists by trying to select from it
        const { error: selectError } = await supabase
            .from('booking_leads')
            .select('*')
            .limit(1);
        
        // If we get an error about the table not existing, we need to create it
        if (selectError && selectError.message.includes('does not exist')) {
            console.log('booking_leads table does not exist. Please create it using the SQL commands in SUPABASE_SETUP.md');
            console.log('You can use the Supabase SQL editor to run the following command:');
            console.log(`
CREATE TABLE booking_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  duration TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
            `);
            return;
        }
        
        console.log('booking_leads table already exists or is accessible.');
        
        // Try to enable Row Level Security
        console.log('Enabling Row Level Security...');
        const { error: rlsError } = await supabase.rpc('exec', {
            query: 'ALTER TABLE booking_leads ENABLE ROW LEVEL SECURITY;'
        });
        
        if (rlsError && !rlsError.message.includes('already enabled')) {
            console.warn('Could not enable RLS:', rlsError.message);
        } else {
            console.log('Row Level Security enabled.');
        }
        
        console.log('Setup process completed. Please check SUPABASE_SETUP.md for additional instructions on setting up policies.');
    } catch (error) {
        console.error('Error during setup:', error.message);
        console.log('Please follow the manual instructions in SUPABASE_SETUP.md to create the table.');
    }
}

// Run the setup
setupBookingLeadsTable();