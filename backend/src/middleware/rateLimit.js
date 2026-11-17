import rateLimit from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;

// Per client IP, per 15 minutes. Login/signup allow for typos; the OTP routes send
// email or check 8-character codes, so they are kept tighter.
export const AUTH_LIMIT = 20;
export const OTP_LIMIT = 10;

export function createLimiter(limit) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many attempts, please try again later" },
  });
}

export const authLimiter = createLimiter(AUTH_LIMIT);
export const otpLimiter = createLimiter(OTP_LIMIT);
