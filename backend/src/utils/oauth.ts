import crypto from "crypto";

export interface OAuthProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) throw new Error("Google token exchange failed");
  const tokenData = (await tokenRes.json()) as any;

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) throw new Error("Google profile fetch failed");
  const profile = (await profileRes.json()) as any;

  return {
    providerId: profile.sub,
    email: profile.email,
    emailVerified: profile.email_verified === true,
  };
}

export function buildGithubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID as string,
    redirect_uri: process.env.GITHUB_REDIRECT_URI as string,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGithubCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GITHUB_CLIENT_ID as string,
      client_secret: process.env.GITHUB_CLIENT_SECRET as string,
      redirect_uri: process.env.GITHUB_REDIRECT_URI as string,
    }),
  });
  if (!tokenRes.ok) throw new Error("GitHub token exchange failed");
  const tokenData = (await tokenRes.json()) as any;
  if (!tokenData.access_token) throw new Error("GitHub token exchange returned no access_token");

  const profileRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "adaptive-code-platform" },
  });
  if (!profileRes.ok) throw new Error("GitHub profile fetch failed");
  const profile = (await profileRes.json()) as any;

  const emailsRes = await fetch("https://api.github.com/user/emails", {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "adaptive-code-platform" },
  });
  if (!emailsRes.ok) throw new Error("GitHub emails fetch failed");
  const emails = (await emailsRes.json()) as any[];
  const primary = emails.find((e) => e.primary) ?? emails[0];

  if (!primary) throw new Error("GitHub account has no accessible email");

  return {
    providerId: profile.id.toString(),
    email: primary.email,
    emailVerified: primary.verified === true,
  };
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}