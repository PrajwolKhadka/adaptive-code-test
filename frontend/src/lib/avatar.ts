// Prefer the canonical API base URL used elsewhere in the app. Some
// environments set `NEXT_PUBLIC_API_BASE_URL` (includes the `/api` path),
// while older configs may set `NEXT_PUBLIC_API_URL` directly. Normalize
// both into an origin (no `/api` suffix) so avatar paths resolve to the
// backend static files correctly.
const rawApiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
const API_ORIGIN = rawApiBase.replace(/\/api\/?$/i, "");

export function getAvatarSrc(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  // If no API origin configured, fall back to the relative path.
  return API_ORIGIN ? `${API_ORIGIN}${avatarUrl}` : avatarUrl;
}

/** Simple initials fallback when there's no avatar yet. */
export function getInitials(email: string): string {
  return email.trim().slice(0, 2).toUpperCase();
}