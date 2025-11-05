// Test script for email encryption functionality
const { encryptEmail, decryptEmail, encryptUserEmail, decryptUserEmail, decryptUsersEmails } = require('./encryption');

// Test data
const testEmail = 'test@example.com';
const testUser = {
    id: '123',
    username: 'testuser',
    email: testEmail,
    created_at: new Date().toISOString()
};

const testUsers = [
    testUser,
    {
        id: '456',
        username: 'anotheruser',
        email: 'another@example.com',
        created_at: new Date().toISOString()
    }
];

console.log('=== Testing Email Encryption/Decryption ===\n');

// Test 1: Basic email encryption/decryption
console.log('Test 1: Basic email encryption/decryption');
console.log('Original email:', testEmail);
const encrypted = encryptEmail(testEmail);
console.log('Encrypted email:', encrypted);
const decrypted = decryptEmail(encrypted);
console.log('Decrypted email:', decrypted);
console.log('Test 1 passed:', decrypted === testEmail ? '✅' : '❌');
console.log('');

// Test 2: User object encryption/decryption
console.log('Test 2: User object encryption/decryption');
console.log('Original user:', testUser);
const encryptedUser = encryptUserEmail(testUser);
console.log('Encrypted user email:', encryptedUser.email);
const decryptedUser = decryptUserEmail(encryptedUser);
console.log('Decrypted user:', decryptedUser);
console.log('Test 2 passed:', decryptedUser.email === testEmail ? '✅' : '❌');
console.log('');

// Test 3: Array of users encryption/decryption
console.log('Test 3: Array of users encryption/decryption');
console.log('Original users:', testUsers);
const encryptedUsers = testUsers.map(user => encryptUserEmail(user));
console.log('Encrypted users emails:', encryptedUsers.map(u => u.email));
const decryptedUsers = decryptUsersEmails(encryptedUsers);
console.log('Decrypted users:', decryptedUsers);
const allEmailsMatch = decryptedUsers.every((user, index) => user.email === testUsers[index].email);
console.log('Test 3 passed:', allEmailsMatch ? '✅' : '❌');
console.log('');

// Test 4: Edge cases
console.log('Test 4: Edge cases');

// Empty string
const emptyEncrypted = encryptEmail('');
const emptyDecrypted = decryptEmail(emptyEncrypted);
console.log('Empty string test passed:', emptyDecrypted === '' ? '✅' : '❌');

// Null/undefined
const nullEncrypted = encryptEmail(null);
const nullDecrypted = decryptEmail(nullEncrypted);
console.log('Null test passed:', nullDecrypted === null ? '✅' : '❌');

const undefinedEncrypted = encryptEmail(undefined);
const undefinedDecrypted = decryptEmail(undefinedEncrypted);
console.log('Undefined test passed:', undefinedDecrypted === undefined ? '✅' : '❌');

console.log('\n=== All Tests Completed ===');