const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
                    return reject(err);
                }

                try {
                    const privateKeyPath = path.join(process.cwd(), 'private_key.pem');
                    const publicKeyPath = path.join(process.cwd(), 'public_key.pem');
                    const privateKeyJsonPath = path.join(process.cwd(), 'private_key.json');
                    const publicKeyJsonPath = path.join(process.cwd(), 'public_key.json');

                    fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
                    fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
                    fs.writeFileSync(privateKeyJsonPath, JSON.stringify([privateKey], null, 2), 'utf8');
                    fs.writeFileSync(publicKeyJsonPath, JSON.stringify([publicKey], null, 2), 'utf8');

                    console.log('RSA key pair generated successfully.');
                    console.log(`Saved private key to ${privateKeyPath} and ${privateKeyJsonPath}`);
                    console.log(`Saved public key to ${publicKeyPath} and ${publicKeyJsonPath}`);
                    resolve({ publicKey, privateKey });
                } catch (writeErr) {
                    console.error('Error writing key files:', writeErr);
                    reject(writeErr);
                }
            }
        );
    });
};

// Call the function to generate keys if run directly
if (require.main === module) {
    generateKeyPair().catch(err => {
        console.error('Error running keyGenerator:', err);
    });
}

module.exports = { generateKeyPair };