"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { useCurrentUser } from "@/lib/useCurrentUser";

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post("/auth/change-password", { currentPassword, newPassword });
      setSuccess("Password changed. You've been logged out of all devices — log in again with your new password.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoutAll() {
    if (!confirm("Log out of all devices, including this one?")) return;
    await apiClient.post("/auth/logout-all");
    window.location.href = "/login";
  }

  if (loading || !user) {
    return (
      <main className="px-6 py-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Profile</h1>

      <div className="mb-8 space-y-2 rounded-md border border-gray-200 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Email</span>
          <span className="font-medium">{user.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Role</span>
          <span className="font-medium capitalize">{user.role}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Two-factor auth</span>
          <span className="font-medium">{user.mfaEnabled ? "Enabled" : "Not enabled"}</span>
        </div>
        {user.role === "student" && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">EXP</span>
              <span className="font-medium">{user.exp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ability estimate (θ)</span>
              <span className="font-medium">{user.theta.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-gray-900">Change password</h2>
      <form onSubmit={handleChangePassword} className="mb-8">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-700">{success}</p>}
        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Change password"}
        </button>
      </form>

      <h2 className="mb-3 text-sm font-semibold text-gray-900">Sessions</h2>
      <button onClick={handleLogoutAll} className="text-sm text-red-600 underline">
        Log out of all devices
      </button>
    </main>
  );
}
