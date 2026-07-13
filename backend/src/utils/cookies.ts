import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; 
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

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
