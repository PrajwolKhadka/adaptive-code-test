import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export function generateNumericOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(OTP_LENGTH, "0");
}

export function hashOtp(otp: string): string {
  const pepper = process.env.EMAIL_OTP_PEPPER as string;
  return crypto.createHmac("sha256", pepper).update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const candidate = hashOtp(otp);
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}

export { MAX_OTP_ATTEMPTS };