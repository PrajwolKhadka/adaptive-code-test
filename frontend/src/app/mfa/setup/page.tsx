"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { AuthCard, FormField, SubmitButton, ErrorText } from "@/components/AuthForm";

export default function MfaSetupPage() {
  const router = useRouter();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecretHint, setManualSecretHint] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      try {
        // Authenticated via the mfa_challenge_token HttpOnly cookie set by
        // /auth/login — no token to pass explicitly here, the browser
        // sends it automatically (withCredentials on apiClient).
        const res = await apiClient.post("/auth/mfa/setup-with-challenge");
        const otpauthUrl: string = res.data.data.otpauthUrl;
        const dataUrl = await QRCode.toDataURL(otpauthUrl);
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          // Extract the secret param for manual entry as a fallback to scanning.
          const secretMatch = otpauthUrl.match(/secret=([^&]+)/);
          setManualSecretHint(secretMatch ? decodeURIComponent(secretMatch[1]) : null);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSetup();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setConfirming(true);
    setError(null);
    try {
      // This single call both enrolls TOTP AND completes login — a full
      // session is issued on success.
      await apiClient.post("/auth/mfa/confirm-with-challenge", { totpCode });
      router.push("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <AuthCard title="Set up two-factor authentication">
      <p className="mb-4 text-sm text-gray-600">
        Scan this with an authenticator app (Google Authenticator, Authy, 1Password, etc). This is required for
        every account — you won&apos;t be able to log in without it.
      </p>

      {loading && <p className="text-sm text-gray-500">Generating your QR code…</p>}
      {error && <ErrorText message={error} />}

      {qrDataUrl && (
        <div className="mb-4 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="TOTP QR code" className="h-48 w-48" />
          {manualSecretHint && (
            <p className="mt-2 break-all text-center text-xs text-gray-500">
              Can&apos;t scan? Enter manually: <span className="font-mono">{manualSecretHint}</span>
            </p>
          )}
        </div>
      )}

      {qrDataUrl && (
        <form onSubmit={handleConfirm}>
          <FormField label="6-digit code from your app" type="text" value={totpCode} onChange={setTotpCode} maxLength={6} />
          <SubmitButton loading={confirming}>Confirm and finish login</SubmitButton>
        </form>
      )}
    </AuthCard>
  );
}
