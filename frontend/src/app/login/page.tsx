"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HCaptcha from "@hcaptcha/react-hcaptcha";
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
  const captchaRef = useRef<HCaptcha>(null);

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

      if (res.data.mfaSetupRequired) {
        router.push("/mfa/setup");
      } else {
        router.push("/mfa/verify");
      }
    } catch (err) {
      const message = getApiErrorMessage(err);
      setError(message);
      if (message.toLowerCase().includes("captcha")) {
        setShowCaptcha(true);
      }
      captchaRef.current?.resetCaptcha();
      setCaptchaToken("");
    } finally {
      setLoading(false);
    }
  }

  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

  return (
    <AuthCard title="Log in">
      <form onSubmit={handleSubmit}>
        <ErrorText message={error} />
        <FormField label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <FormField label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
        {showCaptcha && (
          <div className="mb-4">
            {siteKey ? (
              <HCaptcha ref={captchaRef} sitekey={siteKey} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken("")} />
            ) : (
              <p className="text-xs text-red-600">
                CAPTCHA required but NEXT_PUBLIC_HCAPTCHA_SITE_KEY isn&apos;t configured.
              </p>
            )}
          </div>
        )}
        <SubmitButton loading={loading || (showCaptcha && !captchaToken)}>Log in</SubmitButton>
      </form>
      <OAuthButtons />
      <p className="mt-4 text-center text-sm text-white">
        Don&apos;t have an account?{" "}
        <a href="/register" className="font-medium text-white underline">
          Register
        </a>
      </p>
    </AuthCard>
  );
}