import argon2 from "argon2";
import zxcvbn from "zxcvbn";
import { AppError } from "../middlewares/errorHandler.middleware";
/**
 * Password hashing & verification section.
 * Configures Argon2id (memory-hard, side-channel resistant) and exposes
 * hash/verify helpers. Only irreversible hashes are ever stored; the chosen
 * parameters (≈19 MB memory, 2 iterations) make offline brute-force and
 * GPU/ASIC cracking expensive. verifyPassword never throws, preventing
 * information leaks and DoS from malformed hashes.
 */
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {

    return false;
  }
}
/**
 * Password policy enforcement section.
 * Enforces minimum/maximum length, required character classes, and a
 * zxcvbn strength score ≥ 3. Rejects short, overly long (DoS risk),
 * low-entropy, dictionary, or pattern-based passwords before they can
 * be hashed and stored. assertPasswordPolicy centralizes the check so
 * callers cannot forget to validate.
 */
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const COMPLEXITY_REGEX = {
  upper: /[A-Z]/,
  lower: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};
const MIN_ZXCVBN_SCORE = 3;

interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
  score: number;
}
/**
 * Password policy enforcement block.
 * Validates length, required character classes, and zxcvbn strength score.
 * Rejects short, overly long (DoS risk), low-entropy, dictionary, or
 * pattern-based passwords before they can be hashed and stored.
 * assertPasswordPolicy centralizes the check so callers cannot skip validation.
 */
export function checkPasswordPolicy(password: string, userInputs: string[] = []): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) errors.push(`Password must be at least ${MIN_LENGTH} characters.`);
  if (password.length > MAX_LENGTH) errors.push(`Password must be at most ${MAX_LENGTH} characters.`);
  if (!COMPLEXITY_REGEX.upper.test(password)) errors.push("Password must include an uppercase letter.");
  if (!COMPLEXITY_REGEX.lower.test(password)) errors.push("Password must include a lowercase letter.");
  if (!COMPLEXITY_REGEX.number.test(password)) errors.push("Password must include a number.");
  if (!COMPLEXITY_REGEX.special.test(password)) errors.push("Password must include a special character.");

  const { score } = zxcvbn(password, userInputs);
  if (score < MIN_ZXCVBN_SCORE) {
    errors.push("Password is too predictable or common. Try something less guessable.");
  }

  return { valid: errors.length === 0, errors, score };
}

export function assertPasswordPolicy(password: string, userInputs: string[] = []): void {
  const result = checkPasswordPolicy(password, userInputs);
  if (!result.valid) {
    throw new AppError(result.errors.join(" "), 400);
  }
}

const PASSWORD_HISTORY_LIMIT = 5;
const PASSWORD_EXPIRY_DAYS = 90;

export async function isPasswordReused(candidate: string, passwordHistory: string[]): Promise<boolean> {
  for (const oldHash of passwordHistory.slice(-PASSWORD_HISTORY_LIMIT)) {
    if (await verifyPassword(oldHash, candidate)) return true;
  }
  return false;
}

export function pushPasswordHistory(history: string[], newHash: string): string[] {
  return [...history, newHash].slice(-PASSWORD_HISTORY_LIMIT);
}

export function isPasswordExpired(passwordChangedAt: Date): boolean {
  const ageMs = Date.now() - passwordChangedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays >= PASSWORD_EXPIRY_DAYS;
}
