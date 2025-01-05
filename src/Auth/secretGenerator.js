const crypto = require('crypto');

/**
 * Generates a secure random secret key for AES-256-CTR encryption.
 * @returns {string} The base64-encoded secret key.
 */
function generateAES256CTRKey() {
    const key = crypto.randomBytes(32); // AES-256 requires a 256-bit (32-byte) key
    return key.toString('base64'); // Encode the key in base64 for easy storage and use
}

// Example usage:
const secretKey = generateAES256CTRKey();
console.log('Generated AES-256-CTR Secret Key:', secretKey);
