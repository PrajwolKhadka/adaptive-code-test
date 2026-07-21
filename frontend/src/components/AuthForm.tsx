// "use client";

// import { ReactNode } from "react";

// export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
//   return (
//     <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
//       <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
//         <h1 className="mb-6 text-xl font-semibold text-gray-900">{title}</h1>
//         {children}
//       </div>
//     </main>
//   );
// }

// export function FormField({
//   label,
//   type,
//   value,
//   onChange,
//   autoComplete,
//   maxLength,
// }: {
//   label: string;
//   type: string;
//   value: string;
//   onChange: (v: string) => void;
//   autoComplete?: string;
//   maxLength?: number;
// }) {
//   return (
//     <label className="mb-4 block">
//       <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
//       <input
//         type={type}
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         autoComplete={autoComplete}
//         maxLength={maxLength}
//         required
//         className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
//       />
//     </label>
//   );
// }

// export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
//   return (
//     <button
//       type="submit"
//       disabled={loading}
//       className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
//     >
//       {loading ? "Please wait…" : children}
//     </button>
//   );
// }

// export function ErrorText({ message }: { message: string | null }) {
//   if (!message) return null;
//   return <p className="mb-4 text-sm text-red-600">{message}</p>;
// }

// export function OAuthButtons() {
//   const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
//   return (
//     <div className="mt-6 space-y-2 border-t border-gray-200 pt-6">
//       {/* Full-page navigation, not fetch — these are browser redirects to
//           the OAuth provider, not API calls. */}
//       <a
//         href={`${apiBase}/auth/google`}
//         className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
//       >
//         Continue with Google
//       </a>
//       <a
//         href={`${apiBase}/auth/github`}
//         className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
//       >
//         Continue with GitHub
//       </a>
//     </div>
//   );
// }
"use client";

import { ReactNode } from "react";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#020617] via-[#07162F] to-[#0F172A] px-6 py-10">
      {/* Background glow */}
      <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute bottom-[-120px] right-[-120px] h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-700/60 bg-white/10 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-5 flex h-30 w-30 items-center justify-center rounded-2xl bg-transparent">
            <img
              src="/logo2.png"
              alt="Logo"
              className="h-16 w-auto object-contain"
            />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>

          <p className="mt-2 text-center text-sm text-slate-400">
            Sign in to continue to your account
          </p>
        </div>

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
    <label className="mb-5 block">
      <span className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        className="
          w-full
          rounded-xl
          border
          border-slate-700
          bg-slate-900
          px-4
          py-3
          text-sm
          text-white
          placeholder:text-slate-500
          outline-none
          transition-all
          duration-200
          focus:border-blue-500
          focus:ring-4
          focus:ring-blue-500/20
        "
      />
    </label>
  );
}

export function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        mt-2
        w-full
        rounded-xl
        bg-blue-600
        px-4
        py-3
        text-sm
        font-semibold
        text-white
        transition-all
        duration-200
        hover:bg-blue-700
        active:scale-[0.99]
        disabled:cursor-not-allowed
        disabled:bg-blue-900
        disabled:text-slate-300
      "
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}

export function ErrorText({
  message,
}: {
  message: string | null;
}) {
  if (!message) return null;

  return (
    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

export function OAuthButtons() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  return (
    <>
      {/* Divider */}
      <div className="my-8 flex items-center">
        <div className="h-px flex-1 bg-slate-700" />

        <span className="mx-4 text-xs font-medium uppercase tracking-widest text-slate-500">
          OR
        </span>

        <div className="h-px flex-1 bg-slate-700" />
      </div>

      <div className="space-y-3">
        {/* Google */}
        <a
          href={`${apiBase}/auth/google`}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-3
            rounded-xl
            border
            border-slate-700
            bg-slate-900
            px-4
            py-3
            text-sm
            font-medium
            text-white
            transition
            hover:border-blue-500
            hover:bg-slate-800
          "
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.2c-2.1 1.6-4.7 2.5-7.3 2.5-5.3 0-9.8-3.3-11.4-8l-6.6 5.1C9.3 39.6 16 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.4-4.3 5.8l6.3 5.2C36.9 38.6 44 33 44 24c0-1.3-.1-2.3-.4-3.5z"
            />
          </svg>

          Continue with Google
        </a>

        {/* GitHub */}
        <a
          href={`${apiBase}/auth/github`}
          className="
            flex
            w-full
            items-center
            justify-center
            gap-3
            rounded-xl
            border
            border-slate-700
            bg-slate-900
            px-4
            py-3
            text-sm
            font-medium
            text-white
            transition
            hover:border-blue-500
            hover:bg-slate-800
          "
        >
          <svg
            className="h-5 w-5 fill-white"
            viewBox="0 0 24 24"
          >
            <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.38 7.86 10.9.58.1.79-.25.79-.57v-2.03c-3.2.7-3.88-1.38-3.88-1.38-.53-1.35-1.29-1.71-1.29-1.71-1.05-.72.08-.71.08-.71 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.69 1.26 3.35.97.1-.75.4-1.27.73-1.56-2.56-.29-5.25-1.29-5.25-5.74 0-1.27.45-2.3 1.2-3.12-.12-.3-.52-1.48.11-3.08 0 0 .98-.31 3.2 1.19a11.2 11.2 0 015.82 0c2.22-1.5 3.2-1.19 3.2-1.19.63 1.6.23 2.78.11 3.08.75.82 1.2 1.85 1.2 3.12 0 4.46-2.69 5.44-5.26 5.73.41.35.78 1.04.78 2.1v3.12c0 .31.21.67.8.56A11.52 11.52 0 0023.5 12C23.5 5.66 18.35.5 12 .5z" />
          </svg>

          Continue with GitHub
        </a>
      </div>
    </>
  );
}