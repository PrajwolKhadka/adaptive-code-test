import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; 

function getKey(): Buffer {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret) throw new Error("MFA_ENCRYPTION_KEY is not set");

  return crypto.createHash("sha256").update(secret).digest();
}
/**
 * Encrypts a plaintext MFA secret using AES-256-GCM.
 * Generates a fresh random IV for every encryption, appends the auth tag,
 * and returns a single string (iv:tag:ciphertext). GCM provides both
 * confidentiality and integrity — any tampering is detected on decrypt.
 * The key is derived from MFA_ENCRYPTION_KEY and never stored alongside
 * the ciphertext, so a database leak alone does not expose the secrets.
 */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}
/**
 * Decrypts a payload previously produced by encryptSecret.
 * Splits iv / authTag / ciphertext, verifies the GCM auth tag, and only
 * then returns the plaintext. Throws on malformed input or failed
 * authentication, preventing use of tampered or corrupted secrets.
 */
export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted payload");

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
