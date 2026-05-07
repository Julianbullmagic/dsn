const CryptoJS = require('crypto-js');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'democratic_social_network_default_encryption_key';

function encrypt(text) {
    if (!text) return text;
    try {
        return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        // If decryption returns empty, the value was probably not encrypted — return as-is
        return decrypted || encryptedText;
    } catch (error) {
        // Return original value for backward compatibility with unencrypted rows
        return encryptedText;
    }
}

// HMAC-SHA256 of the email for deterministic database lookups.
// AES produces a different ciphertext each time (random IV), so we can't
// search the encrypted column directly — we store this hash alongside it.
function hashEmail(email) {
    if (!email) return email;
    const hmacKey = process.env.EMAIL_HASH_KEY || ENCRYPTION_KEY;
    return crypto.createHmac('sha256', hmacKey).update(email.toLowerCase()).digest('hex');
}

function encryptEmail(email) {
    return encrypt(email);
}

function decryptEmail(encryptedEmail) {
    return decrypt(encryptedEmail);
}

function encryptLocation(location) {
    return encrypt(location);
}

function decryptLocation(encryptedLocation) {
    return decrypt(encryptedLocation);
}

function encryptUserEmail(user) {
    if (!user) return user;
    const encryptedUser = { ...user };
    if (encryptedUser.email) {
        encryptedUser.email = encryptEmail(encryptedUser.email);
    }
    return encryptedUser;
}

function decryptUserEmail(user) {
    if (!user) return user;
    const decryptedUser = { ...user };
    if (decryptedUser.email) {
        decryptedUser.email = decryptEmail(decryptedUser.email);
    }
    return decryptedUser;
}

function decryptUsersEmails(users) {
    if (!Array.isArray(users)) return users;
    return users.map(user => decryptUserEmail(user));
}

module.exports = {
    encrypt,
    decrypt,
    hashEmail,
    encryptEmail,
    decryptEmail,
    encryptLocation,
    decryptLocation,
    encryptUserEmail,
    decryptUserEmail,
    decryptUsersEmails
};
