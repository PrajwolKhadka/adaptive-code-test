import {z} from "zod";

export const registerSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(12).max(120),
});
export type RegisterDTO = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
    email:z.string().email().max(254),
    password: z.string().min(1).max(128),
    captchaToekn: z.string().optional(),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const verifyMfaSchema = z.object({
    mfaChallengeToken: z.string(),
    totpCode: z.string().length(6).regex(/^\d+$/),
});
export type VerifyMfaSchema = z.infer<typeof verifyMfaSchema>;

export const enableMfaSchema = z.object({
    totpcode: z.string().length(6).regex(/^d\d+$/),
});
export type EnableMfaSchema = z.infer<typeof enableMfaSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(120),
    newPassword: z.string().min(12).max(120),
});

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email().max(254),
  otp: z.string().length(6).regex(/^\d+$/),
});
export type VerifyEmailDTO = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
  email: z.string().email().max(254),
});
export type ResendVerificationDTO = z.infer<typeof resendVerificationSchema>;
