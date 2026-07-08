import rateLimit from "express-rate-limit";

// Stricter limiter for auth endpoints (login, register, password reset).
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 900_000), // 15 min
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again later." },
  // Consider keying by email+IP combo at the controller level for account
  // lockout, in addition to this IP-based limiter, so a distributed
  // attacker can't bypass this by rotating IPs against a single account.
});

// Looser general-purpose limiter for the rest of the API.
export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict limiter for code submission — this endpoint triggers sandboxed
// execution, so it's also your resource-exhaustion / DoS choke point.
export const submissionLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Submission rate limit exceeded." },
});
