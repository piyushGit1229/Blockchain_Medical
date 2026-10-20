// Cryptographic primitives for the medical record sharing prototype.
// Mirrors the paper's design: AES-256-GCM content encryption, per-grantee
// wrapped data-encryption keys (attribute/consent based key release), and
// RSA-OAEP wrapping for key transport (real Fabric deployments would use
// private data collections or an attribute-based cryptosystem [8][9]).
import crypto from 'node:crypto';

export function generateIdentity({ id, name, role, org, department, specialty }) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { id, name, role, org, department, specialty, publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/** AES-256-GCM content encryption. Returns data-encryption key (DEK) + ciphertext payload. */
export function encryptContent(buffer) {
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return { dek, iv, tag: cipher.getAuthTag(), ciphertext };
}

/** Wrap a DEK for a grantee using their RSA public key (OAEP-SHA256). */
export function wrapKey(dek, publicKeyPem) {
  return crypto.publicEncrypt(
    { key: publicKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    dek
  );
}

export function unwrapKey(wrappedKeyB64, privateKeyPem) {
  return crypto.privateDecrypt(
    { key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    Buffer.from(wrappedKeyB64, 'base64')
  );
}

export function decryptContent({ dek, iv, tag, ciphertext }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
}

export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function txId() {
  return crypto.randomBytes(16).toString('hex');
}
