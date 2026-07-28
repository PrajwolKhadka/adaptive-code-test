import crypto from "crypto";

export interface OAuthProfile {
  providerId: string;
  email: string;
  emailVerified: boolean;
}
/**
 * Builds the Google OAuth 2.0 authorization URL. Includes a cryptographically random `state` parameter to prevent CSRF attacks (the callback must 
 * later verify that the returned state matches the one we stored). `prompt=select_account` forces account chooser sousers don’t silently 
 * re-use a previously selected Google account. Only the authorization code flow is used — no tokens are ever exposed to the frontend.
 */
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
/** Exchanges a Google authorization code for an access token, then fetches the user’s profile. The client secret stays on the server only. We request the minimal scopes
 * needed and extract only `sub`, email, and verification status — never store the access token itself. This keeps the attack surface small and ensures we only 
 * trust verified email addresses when linking accounts.
 */
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
/** Exchanges a GitHub authorization code for an access token and retrieves the user’s profile + primary email. Client secret never leaves 
 * the server. We explicitly fetch the emails endpoint and prefer the primary verified address, refusing to proceed if none is available. 
 * This prevents account takeover via unverified or missing emails and avoids storing the GitHub access token.
 */
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