const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generates a secure random secret key for AES-256-CTR encryption.
 * @returns {string} The base64-encoded secret key.
 */
function generateAES256CTRKey() {
    const key = crypto.randomBytes(32); // AES-256 requires a 256-bit (32-byte) key
    return key.toString('base64'); // Encode the key in base64 for easy storage and use
}

// Example usage:
if (require.main === module) {
    const secretKey = generateAES256CTRKey();
    try {
        const secretKeyPath = path.join(process.cwd(), 'secret.key');
        fs.writeFileSync(secretKeyPath, secretKey, 'utf8');
        console.log(`Generated AES-256-CTR Secret Key saved to ${secretKeyPath}`);
    } catch (err) {
        console.error('Error writing secret key file:', err);
    }
}

module.exports = { generateAES256CTRKey };
