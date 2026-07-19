"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";

interface StudentRow {
  _id: string;
  email: string;
  exp: number;
  theta: number;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lockedUntil?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/users");
      setUsers(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string, email: string) {
    if (!confirm(`Delete ${email}? This permanently removes their account.`)) return;
    try {
      await apiClient.delete(`/admin/users/${id}`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Users</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">EXP</th>
                <th className="px-4 py-2">θ</th>
                <th className="px-4 py-2">Verified</th>
                <th className="px-4 py-2">2FA</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.exp}</td>
                  <td className="px-4 py-2">{u.theta.toFixed(2)}</td>
                  <td className="px-4 py-2">{u.isEmailVerified ? "✓" : "—"}</td>
                  <td className="px-4 py-2">{u.mfaEnabled ? "✓" : "—"}</td>
                  <td className="px-4 py-2">
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() ? (
                      <span className="text-red-600">Locked</span>
                    ) : (
                      "Active"
                    )}
                  </td>
                  <td className="px-4 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(u._id, u.email)} className="text-xs text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">No students yet.</p>}
        </div>
      )}
    </main>
  );
}
