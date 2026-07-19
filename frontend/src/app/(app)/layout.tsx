"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Sidebar } from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, error } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    if (error || !user) {
      router.replace("/login");
      return;
    }
    // Admins land on their own dashboard, never the student "take a test"
    // flow — redirect away from /dashboard specifically rather than
    // blocking every student route, since admins may still legitimately
    // want to browse /resources or /profile.
    if (user.role === "admin" && pathname === "/dashboard") {
      router.replace("/admin/dashboard");
    }
  }, [loading, error, user, pathname, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex">
      <Sidebar user={user} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
