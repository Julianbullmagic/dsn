# Email Encryption Implementation

This document describes the email encryption implementation for the Democratic Social Network application.

## Overview

All user email addresses are now encrypted in the database using AES encryption to protect user privacy and comply with data protection requirements.

## Implementation Details

### Encryption Method
- **Algorithm**: AES (Advanced Encryption Standard)
- **Library**: crypto-js
- **Key**: Configurable via `ENCRYPTION_KEY` environment variable
- **Storage**: Encrypted emails are stored as base64-encoded strings in the database

### Files Modified

1. **encryption.js** - New file containing encryption/decryption utilities
2. **server.js** - Updated to encrypt emails before storage and decrypt after retrieval
3. **.env.example** - Added ENCRYPTION_KEY configuration
4. **SUPABASE_SETUP.md** - Updated database schema documentation

### Key Functions

#### Encryption Functions
- `encryptEmail(email)` - Encrypts a single email address
- `encryptUserEmail(user)` - Encrypts email in a user object
- `decryptEmail(encryptedEmail)` - Decrypts a single email address
- `decryptUserEmail(user)` - Decrypts email in a user object
- `decryptUsersEmails(users)` - Decrypts emails in an array of user objects

#### Updated Endpoints
- `POST /api/register` - Encrypts email before storing
- `POST /api/login` - Encrypts email for lookup, decrypts for response
- All user retrieval endpoints - Decrypt emails before returning to client

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
ENCRYPTION_KEY=your_strong_encryption_key_at_least_32_characters_long
```

**Important**: Use a strong, unique encryption key. The key should be at least 32 characters long and kept secure.

### 2. Database Migration

If you have existing users with unencrypted emails, run the migration script:

```bash
node migrate-existing-emails.js
```

This script will:
- Detect existing unencrypted emails
- Encrypt them in place
- Skip already encrypted emails
- Provide progress feedback

### 3. Testing

Run the encryption tests to verify functionality:

```bash
node test-encryption.js
```

## Security Considerations

1. **Key Management**: The encryption key should be stored securely and not committed to version control
2. **Key Rotation**: If you need to change the encryption key, you'll need to re-encrypt all existing emails
3. **Backup**: Ensure database backups are encrypted at rest
4. **Access Control**: Limit access to the encryption key and database

## How It Works

### Registration Flow
1. User submits registration form with email
2. Email is encrypted using `encryptEmail()`
3. Encrypted email is stored in database
4. Plain text email is never persisted

### Login Flow
1. User submits login form with email
2. Email is encrypted for database lookup
3. User record is found using encrypted email
4. Password is verified
5. Email is decrypted for JWT token and response

### Data Retrieval
1. User data is fetched from database (emails encrypted)
2. Emails are decrypted using `decryptUsersEmails()`
3. Decrypted data is returned to client
4. Emails are only encrypted at rest, not in transit

## Migration Notes

### Existing Data
- The migration script detects already encrypted emails by checking length and prefix
- Encrypted emails start with "U2FsdGVkX1" (crypto-js default prefix)
- Unencrypted emails are shorter and don't have this prefix

### Backward Compatibility
- The system handles both encrypted and unencrypted emails during transition
- Once migration is complete, all emails will be encrypted

## Troubleshooting

### Common Issues

1. **Invalid encryption key**: Ensure ENCRYPTION_KEY is set and matches the key used for existing data
2. **Migration failures**: Check database connectivity and permissions
3. **Login failures**: Verify that emails were properly encrypted during migration

### Debug Mode

Set `DEBUG=encryption` environment variable to see detailed encryption/decryption logs.

## Performance Impact

- **Encryption**: Minimal overhead during registration/login
- **Decryption**: Small overhead when retrieving user data
- **Storage**: Encrypted emails are larger than plain text (approximately 1.5x size)

## Compliance

This implementation helps with:
- GDPR compliance (data protection by design)
- Data privacy regulations
- Security best practices
- Protection against database breaches

## Future Enhancements

1. **Key rotation mechanism**
2. **Field-level encryption for other sensitive data**
3. **Audit logging for encryption operations**
4. **Hardware security module (HSM) integration**