const CryptoJS = require('crypto-js');

// Get encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'democratic_social_network_default_encryption_key';

/**
 * Encrypts a string using AES encryption
 * @param {string} text - The text to encrypt
 * @returns {string} - The encrypted text
 */
function encrypt(text) {
    if (!text) return text;
    
    try {
        const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts a string using AES decryption
 * @param {string} encryptedText - The encrypted text to decrypt
 * @returns {string} - The decrypted text
 */
function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

/**
 * Encrypts an email address
 * @param {string} email - The email to encrypt
 * @returns {string} - The encrypted email
 */
function encryptEmail(email) {
    return encrypt(email);
}

/**
 * Decrypts an email address
 * @param {string} encryptedEmail - The encrypted email to decrypt
 * @returns {string} - The decrypted email
 */
function decryptEmail(encryptedEmail) {
    return decrypt(encryptedEmail);
}

/**
 * Encrypts user object emails
 * @param {object} user - The user object
 * @returns {object} - User object with encrypted email
 */
function encryptUserEmail(user) {
    if (!user) return user;
    
    const encryptedUser = { ...user };
    if (encryptedUser.email) {
        encryptedUser.email = encryptEmail(encryptedUser.email);
    }
    return encryptedUser;
}

/**
 * Decrypts user object emails
 * @param {object} user - The user object with encrypted email
 * @returns {object} - User object with decrypted email
 */
function decryptUserEmail(user) {
    if (!user) return user;
    
    const decryptedUser = { ...user };
    if (decryptedUser.email) {
        decryptedUser.email = decryptEmail(decryptedUser.email);
    }
    return decryptedUser;
}

/**
 * Decrypts emails in an array of users
 * @param {array} users - Array of user objects with encrypted emails
 * @returns {array} - Array of user objects with decrypted emails
 */
function decryptUsersEmails(users) {
    if (!Array.isArray(users)) return users;
    
    return users.map(user => decryptUserEmail(user));
}

module.exports = {
    encrypt,
    decrypt,
    encryptEmail,
    decryptEmail,
    encryptUserEmail,
    decryptUserEmail,
    decryptUsersEmails
};