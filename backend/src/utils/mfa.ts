import { authenticator } from "otplib";
import { encryptSecret, decryptSecret } from "./crypto";
/**
 * Generates a new TOTP secret for MFA enrollment.
 * Returns both the plain secret (needed once to show the user / QR code)
 * and an encrypted version for safe storage. The secret is never persisted
 * in plaintext, reducing the impact of a database leak.
 */
export function generateMfaSecret(): { plainSecret: string; encryptedSecret: string } {
  const plainSecret = authenticator.generateSecret();
  return { plainSecret, encryptedSecret: encryptSecret(plainSecret) };
}
/**
 * Builds the otpauth:// URI used by authenticator apps (Google Authenticator,
 * Authy, etc.) to set up the account. Includes the user’s email and a
 * configurable issuer name so the entry is clearly labeled in the app.
 * Only the plain secret is used here — it is never stored afterward.
 */
export function buildOtpAuthUrl(email: string, plainSecret: string): string {
  const issuer = process.env.MFA_ISSUER ?? "AdaptiveCodePlatform";
  return authenticator.keyuri(email, issuer, plainSecret);
}
/**
 * Verifies a user-supplied TOTP token against the stored (encrypted) secret.
 * Decrypts the secret only in memory for the check, then discards it.
 * Returns false on any error (bad ciphertext, invalid token, etc.) instead
 * of throwing, preventing information leakage and avoiding crashes from
 * malformed input.
 */
export function verifyTotp(token: string, encryptedSecret: string): boolean {
  try {
    const plainSecret = decryptSecret(encryptedSecret);

    return authenticator.check(token, plainSecret);
  } catch {
    return false;
  }
}
