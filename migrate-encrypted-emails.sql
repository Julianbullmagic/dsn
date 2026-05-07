-- ============================================================
-- Migration: encrypt existing plaintext emails & locations
-- ============================================================
-- Step 1 — add the email_hash column (idempotent; also in enable-rls.sql)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash TEXT UNIQUE;

-- Step 2 — run the Node.js script below to populate email_hash and
--           replace plaintext email / location values with ciphertext.
--
-- Run with:  node migrate-encrypted-emails.js
-- (Requires ENCRYPTION_KEY and EMAIL_HASH_KEY env vars to match server.js)

/*
  ── migrate-encrypted-emails.js ──────────────────────────────────────────
  Save as migrate-encrypted-emails.js, then:
    node -r dotenv/config migrate-encrypted-emails.js

const { encryptEmail, hashEmail, encryptLocation, decryptEmail } = require('./encryption');
const { initSupabase } = require('./supabaseClient');

async function main() {
    const supabase = await initSupabase();

    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, location');

    if (error) { console.error('Fetch error:', error); process.exit(1); }

    console.log(`Migrating ${users.length} users...`);
    let ok = 0, skip = 0, fail = 0;

    for (const user of users) {
        // Detect already-encrypted rows: CryptoJS ciphertext is base64
        // and always much longer than a real email address.
        const looksEncrypted = user.email && user.email.length > 80 && !user.email.includes('@');

        if (looksEncrypted) {
            // Row already encrypted — just populate the hash if missing.
            if (!user.email_hash) {
                // We cannot recover the plaintext to hash it, so skip.
                // Re-run after a fresh registration or manual reset.
                console.warn(`  SKIP  ${user.id} — already encrypted, hash missing`);
                skip++;
            } else {
                skip++;
            }
            continue;
        }

        try {
            const plainEmail    = user.email.toLowerCase();
            const encryptedEmail = encryptEmail(plainEmail);
            const emailHash      = hashEmail(plainEmail);
            const encryptedLoc   = user.location ? encryptLocation(user.location) : null;

            const { error: upErr } = await supabase
                .from('users')
                .update({
                    email:      encryptedEmail,
                    email_hash: emailHash,
                    location:   encryptedLoc
                })
                .eq('id', user.id);

            if (upErr) throw upErr;
            console.log(`  OK    ${user.id}  ${plainEmail}`);
            ok++;
        } catch (e) {
            console.error(`  FAIL  ${user.id}:`, e.message);
            fail++;
        }
    }

    console.log(`\nDone. ok=${ok}  skip=${skip}  fail=${fail}`);
}

main();
*/

-- Step 3 — after the script completes, verify no plaintext emails remain:
-- SELECT id, email FROM users WHERE email LIKE '%@%';
-- The result should be empty (all rows now hold ciphertext, not raw addresses).
