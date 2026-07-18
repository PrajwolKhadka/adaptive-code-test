"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { AuthCard, FormField, SubmitButton, ErrorText, OAuthButtons } from "@/components/AuthForm";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/register", { email, password });
      // Registration never issues a session — the account is unusable
      // until the emailed OTP is confirmed.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create an account">
      <form onSubmit={handleSubmit}>
        <ErrorText message={error} />
        <FormField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <p className="mb-4 text-xs text-gray-500">
          At least 12 characters, with uppercase, lowercase, a number, and a special character.
        </p>
        <SubmitButton loading={loading}>Register</SubmitButton>
      </form>
      <OAuthButtons />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-gray-900 underline">
          Log in
        </a>
      </p>
    </AuthCard>
  );
}
