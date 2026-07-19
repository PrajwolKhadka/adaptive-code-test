"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { AuthCard, FormField, SubmitButton, ErrorText } from "@/components/AuthForm";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/verify-email", { email, otp });
      router.push("/login?verified=1");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResendMessage(null);
    try {
      const res = await apiClient.post("/auth/resend-verification", { email });
      setResendMessage(res.data?.message ?? "If that account exists, a new code was sent.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <AuthCard title="Verify your email">
      <form onSubmit={handleSubmit}>
        <ErrorText message={error} />
        {resendMessage && <p className="mb-4 text-sm text-green-700">{resendMessage}</p>}
        <FormField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <FormField label="6-digit code" type="text" value={otp} onChange={setOtp} maxLength={6} autoComplete="one-time-code" />
        <SubmitButton loading={loading}>Verify</SubmitButton>
      </form>
      <button onClick={handleResend} className="mt-4 w-full text-center text-sm text-gray-600 underline">
        Resend code
      </button>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
