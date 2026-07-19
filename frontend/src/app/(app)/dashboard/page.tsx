"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { RequireAuth } from "@/components/RouteGuards";
import { useCurrentUser } from "@/lib/useCurrentUser";

function DashboardContent() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient.post("/auth/logout");
    } finally {
      router.push("/login");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Welcome{user ? `, ${user.email}` : ""}</h1>
        {user && (
          <p className="mt-1 text-sm text-gray-500">
            {user.exp} EXP · θ {user.theta.toFixed(2)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href="/test" className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Take a test
        </a>
        {user?.role === "admin" && (
          <a href="/admin/questions" className="rounded-md border border-gray-300 px-6 py-2 text-sm font-medium hover:bg-gray-50">
            Manage questions
          </a>
        )}
      </div>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="text-sm text-gray-500 underline disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
