// Migration script to encrypt existing emails in the database
// Run this once after implementing email encryption

require('dotenv').config();
const { initSupabase } = require('./supabaseClient');
const { encryptEmail } = require('./encryption');

async function migrateExistingEmails() {
    try {
        console.log('Starting email migration...');
        
        // Initialize Supabase
        const supabase = await initSupabase();
        
        if (supabase.__mock) {
            console.log('Running with mock client - no actual migration will occur');
            return;
        }
        
        // Get all users
        const { data: users, error } = await supabase
            .from('users')
            .select('id, email');
        
        if (error) {
            console.error('Error fetching users:', error);
            return;
        }
        
        console.log(`Found ${users.length} users to check`);
        
        let migratedCount = 0;
        let skippedCount = 0;
        
        for (const user of users) {
            try {
                // Check if email is already encrypted (encrypted emails are longer and contain specific patterns)
                const isAlreadyEncrypted = user.email.length > 50 && user.email.startsWith('U2FsdGVkX1');
                
                if (isAlreadyEncrypted) {
                    console.log(`Skipping user ${user.id} - email already encrypted`);
                    skippedCount++;
                    continue;
                }
                
                // Encrypt the email
                const encryptedEmail = encryptEmail(user.email);
                
                // Update the user record with encrypted email
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ email: encryptedEmail })
                    .eq('id', user.id);
                
                if (updateError) {
                    console.error(`Error updating user ${user.id}:`, updateError);
                } else {
                    console.log(`Migrated user ${user.id}: ${user.email} -> ${encryptedEmail.substring(0, 30)}...`);
                    migratedCount++;
                }
            } catch (e) {
                console.error(`Error processing user ${user.id}:`, e);
            }
        }
        
        console.log(`\nMigration completed:`);
        console.log(`- Successfully migrated: ${migratedCount} users`);
        console.log(`- Already encrypted: ${skippedCount} users`);
        console.log(`- Total processed: ${users.length} users`);
        
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Run the migration
migrateExistingEmails();
