import { authenticator } from "otplib";
import { encryptSecret, decryptSecret } from "./crypto";

export function generateMfaSecret(): { plainSecret: string; encryptedSecret: string } {
  const plainSecret = authenticator.generateSecret();
  return { plainSecret, encryptedSecret: encryptSecret(plainSecret) };
}

export function buildOtpAuthUrl(email: string, plainSecret: string): string {
  const issuer = process.env.MFA_ISSUER ?? "AdaptiveCodePlatform";
  return authenticator.keyuri(email, issuer, plainSecret);
}

export function verifyTotp(token: string, encryptedSecret: string): boolean {
  try {
    const plainSecret = decryptSecret(encryptedSecret);
    // otplib checks a small window (±1 step) by default to tolerate clock drift.
    return authenticator.check(token, plainSecret);
  } catch {
    return false;
  }
}
