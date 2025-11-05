-- Migration script to encrypt existing emails in the database
-- Run this script once after implementing email encryption

-- Step 1: Add a temporary column to store encrypted emails
ALTER TABLE users ADD COLUMN email_encrypted TEXT;

-- Step 2: Update existing users with encrypted emails
-- Note: This needs to be done in the application code since we need to use the encryption key
-- The following is a placeholder - you should run this through your application

-- Example application code (run this in Node.js with your encryption utilities):
/*
const { encryptEmail } = require('./encryption');
const { initSupabase } = require('./supabaseClient');

async function migrateEmails() {
    const supabase = await initSupabase();
    
    // Get all users with unencrypted emails
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email')
        .is('email_encrypted', null);
    
    if (error) {
        console.error('Error fetching users:', error);
        return;
    }
    
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
        try {
            const encryptedEmail = encryptEmail(user.email);
            
            const { error: updateError } = await supabase
                .from('users')
                .update({ email_encrypted: encryptedEmail })
                .eq('id', user.id);
            
            if (updateError) {
                console.error(`Error updating user ${user.id}:`, updateError);
            } else {
                console.log(`Migrated user ${user.id}: ${user.email} -> ${encryptedEmail.substring(0, 20)}...`);
            }
        } catch (e) {
            console.error(`Error encrypting email for user ${user.id}:`, e);
        }
    }
    
    console.log('Migration completed');
}

migrateEmails();
*/

-- Step 3: After running the application code above, run these SQL commands:

-- Replace the original email column with encrypted emails
UPDATE users SET email = email_encrypted WHERE email_encrypted IS NOT NULL;

-- Drop the temporary column
ALTER TABLE users DROP COLUMN email_encrypted;

-- Step 4: Update the table comment to indicate emails are encrypted
COMMENT ON COLUMN users.email IS 'Encrypted email address using AES encryption';