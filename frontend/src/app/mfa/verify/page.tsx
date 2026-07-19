"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { AuthCard, FormField, SubmitButton, ErrorText } from "@/components/AuthForm";

export default function MfaVerifyPage() {
  const router = useRouter();
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post("/auth/verify-mfa", { totpCode });
      router.push("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Enter your authentication code">
      <form onSubmit={handleSubmit}>
        <ErrorText message={error} />
        <FormField label="6-digit code" type="text" value={totpCode} onChange={setTotpCode} maxLength={6} autoComplete="one-time-code" />
        <SubmitButton loading={loading}>Verify</SubmitButton>
      </form>
    </AuthCard>
  );
}
