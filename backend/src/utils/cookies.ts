import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; 
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const MFA_CHALLENGE_COOKIE_MAX_AGE_MS = 5 * 60 * 1000;
const OAUTH_STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;
export function setMfaChallengeCookie(res: Response, token: string) {
  res.cookie("mfa_challenge_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth",
    maxAge: MFA_CHALLENGE_COOKIE_MAX_AGE_MS,
  });
}

export function clearMfaChallengeCookie(res: Response) {
  res.clearCookie("mfa_challenge_token", {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth",
  });
}

export function setOAuthStateCookie(res: Response, state: string) {
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
  });
}

export function clearOAuthStateCookie(res: Response) {
  res.clearCookie("oauth_state", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    domain: process.env.COOKIE_DOMAIN,
    path: "/api/auth",
  });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const common = {
    httpOnly: true,
    secure: isProd, 
    sameSite: "strict" as const,
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
  };

  res.cookie("access_token", accessToken, { ...common, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
  res.cookie("refresh_token", refreshToken, {
    ...common,
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    path: "/api/auth/refresh",
  });
}

export function clearAuthCookies(res: Response) {
  const common = {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    domain: process.env.COOKIE_DOMAIN,
    path: "/",
  };
  res.clearCookie("access_token", common);
  res.clearCookie("refresh_token", { ...common, path: "/api/auth/refresh" });
}
