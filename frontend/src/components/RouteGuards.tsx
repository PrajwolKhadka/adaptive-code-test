"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

/** Wrap any page that requires a logged-in user, of any role. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, error } = useCurrentUser();

  useEffect(() => {
    if (!loading && (error || !user)) {
      router.replace("/login");
    }
  }, [loading, error, user, router]);

  if (loading) return <CenteredMessage text="Loading…" />;
  if (error || !user) return null; // redirect is in-flight

  return <>{children}</>;
}

/** Wrap any page that requires an authenticated ADMIN. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, error } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    if (error || !user) {
      router.replace("/login");
    } else if (user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, error, user, router]);

  if (loading) return <CenteredMessage text="Loading…" />;
  if (error || !user || user.role !== "admin") return null;

  return <>{children}</>;
}

function CenteredMessage({ text }: { text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-500">{text}</p>
    </main>
  );
}
