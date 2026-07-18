"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { AuthCard, FormField, SubmitButton, ErrorText, OAuthButtons } from "@/components/AuthForm";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post("/auth/login", {
        email,
        password,
        captchaToken: captchaToken || undefined,
      });

      // mfa_challenge_token is set as an HttpOnly cookie by the server —
      // nothing to store client-side. Just route based on what step comes next.
      if (res.data.mfaSetupRequired) {
        router.push("/mfa/setup");
      } else {
        router.push("/mfa/verify");
      }
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      // Server returns 400 "CAPTCHA verification required." once an
      // account has enough recent failed attempts — surface the widget.
      if (message.toLowerCase().includes("captcha")) {
        setShowCaptcha(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit}>
        <ErrorText message={error} />
        <FormField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {showCaptcha && (
          <div className="mb-4">
            {/*
              hCaptcha widget goes here — e.g. @hcaptcha/react-hcaptcha,
              calling setCaptchaToken(token) in its onVerify callback.
              Left as a placeholder input for now so the flow is testable
              end-to-end before wiring the actual widget + site key.
            */}
            <FormField label="CAPTCHA token (placeholder)" type="text" value={captchaToken} onChange={setCaptchaToken} />
          </div>
        )}
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
      <OAuthButtons />
      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-medium text-gray-900 underline">
          Register
        </a>
      </p>
    </AuthCard>
  );
}
