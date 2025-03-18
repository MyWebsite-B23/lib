const crypto = require('crypto');

const generateKeyPair = () => {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair(
            'rsa',
            {
                modulusLength: 2048, // Key size in bits
                publicKeyEncoding: {
                    type: 'spki', // Recommended format for public keys
                    format: 'pem',
                },
                privateKeyEncoding: {
                    type: 'pkcs8', // Recommended format for private keys
                    format: 'pem',
                },
            },
            (err, publicKey, privateKey) => {
                if (err) {
                    console.error('Error generating key pair:', err);
                    reject(err);
                }

                console.log('RSA key pair generated successfully.');
                console.log('Private Key:\n', JSON.stringify([privateKey]));
                console.log('Public Key:\n', JSON.stringify([publicKey]));
                resolve({ publicKey, privateKey });
            }
        );
    });
};

// Call the function to generate keys
// generateKeyPair();

module.exports = { generateKeyPair };