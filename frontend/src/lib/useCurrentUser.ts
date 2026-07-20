// "use client";

// import { useEffect, useState } from "react";
// import { apiClient } from "./apiClient";

// export interface CurrentUser {
//   id: string;
//   email: string;
//   role: "student" | "admin";
//   isEmailVerified: boolean;
//   mfaEnabled: boolean;
//   exp: number;
//   theta: number;
// }

// interface UseCurrentUserResult {
//   user: CurrentUser | null;
//   loading: boolean;
//   error: boolean;
// }

// /**
//  * Fetches the current session's user via GET /auth/me. Returns
//  * loading=false, user=null, error=true on any failure (expired session,
//  * network error, etc) — callers decide what to do (usually redirect to
//  * /login), this hook doesn't navigate on its own so it stays reusable
//  * across pages with different auth requirements (e.g. admin-only pages).
//  */
// export function useCurrentUser(): UseCurrentUserResult {
//   const [user, setUser] = useState<CurrentUser | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(false);

//   useEffect(() => {
//     let cancelled = false;

//     apiClient
//       .get("/auth/me")
//       .then((res) => {
//         if (!cancelled) setUser(res.data.data);
//       })
//       .catch(() => {
//         if (!cancelled) setError(true);
//       })
//       .finally(() => {
//         if (!cancelled) setLoading(false);
//       });

//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   return { user, loading, error };
// }
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "./apiClient";

export interface CurrentUser {
  id: string;
  email: string;
  role: "student" | "admin";
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  exp: number;
  theta: number;
}

interface UseCurrentUserResult {
  user: CurrentUser | null;
  loading: boolean;
  error: boolean;
  refreshUser: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get("/auth/me");
      setUser(res.data.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    user,
    loading,
    error,
    refreshUser,
  };
}