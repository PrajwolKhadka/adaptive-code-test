"use client";

import { ReactNode } from "react";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function FormField({
  label,
  type,
  value,
  onChange,
  autoComplete,
  maxLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
      />
    </label>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mb-4 text-sm text-red-600">{message}</p>;
}

export function OAuthButtons() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  return (
    <div className="mt-6 space-y-2 border-t border-gray-200 pt-6">
      {/* Full-page navigation, not fetch — these are browser redirects to
          the OAuth provider, not API calls. */}
      <a
        href={`${apiBase}/auth/google`}
        className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Continue with Google
      </a>
      <a
        href={`${apiBase}/auth/github`}
        className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Continue with GitHub
      </a>
    </div>
  );
}
