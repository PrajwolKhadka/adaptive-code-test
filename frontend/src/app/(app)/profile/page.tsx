// "use client";

// import { useState } from "react";
// import { apiClient } from "@/lib/apiClient";
// import { getApiErrorMessage } from "@/lib/apiError";
// import { useCurrentUser } from "@/lib/useCurrentUser";

// export default function ProfilePage() {
//   const { user, loading } = useCurrentUser();
//   const [currentPassword, setCurrentPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState<string | null>(null);

//   async function handleChangePassword(e: React.FormEvent) {
//     e.preventDefault();
//     setSaving(true);
//     setError(null);
//     setSuccess(null);
//     try {
//       await apiClient.post("/auth/change-password", { currentPassword, newPassword });
//       setSuccess("Password changed. You've been logged out of all devices — log in again with your new password.");
//       setCurrentPassword("");
//       setNewPassword("");
//     } catch (err) {
//       setError(getApiErrorMessage(err));
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleLogoutAll() {
//     if (!confirm("Log out of all devices, including this one?")) return;
//     await apiClient.post("/auth/logout-all");
//     window.location.href = "/login";
//   }

//   if (loading || !user) {
//     return (
//       <main className="px-6 py-8">
//         <p className="text-sm text-gray-500">Loading…</p>
//       </main>
//     );
//   }

//   return (
//     <main className="mx-auto max-w-lg px-6 py-8">
//       <h1 className="mb-6 text-xl font-semibold">Profile</h1>

//       <div className="mb-8 space-y-2 rounded-md border border-gray-200 p-4 text-sm">
//         <div className="flex justify-between">
//           <span className="text-gray-500">Email</span>
//           <span className="font-medium">{user.email}</span>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-500">Role</span>
//           <span className="font-medium capitalize">{user.role}</span>
//         </div>
//         <div className="flex justify-between">
//           <span className="text-gray-500">Two-factor auth</span>
//           <span className="font-medium">{user.mfaEnabled ? "Enabled" : "Not enabled"}</span>
//         </div>
//         {user.role === "student" && (
//           <>
//             <div className="flex justify-between">
//               <span className="text-gray-500">EXP</span>
//               <span className="font-medium">{user.exp}</span>
//             </div>
//             <div className="flex justify-between">
//               <span className="text-gray-500">Ability estimate (θ)</span>
//               <span className="font-medium">{user.theta.toFixed(2)}</span>
//             </div>
//           </>
//         )}
//       </div>

//       <h2 className="mb-3 text-sm font-semibold text-gray-900">Change password</h2>
//       <form onSubmit={handleChangePassword} className="mb-8">
//         {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
//         {success && <p className="mb-3 text-sm text-green-700">{success}</p>}
//         <label className="mb-3 block">
//           <span className="mb-1 block text-sm font-medium text-gray-700">Current password</span>
//           <input
//             type="password"
//             value={currentPassword}
//             onChange={(e) => setCurrentPassword(e.target.value)}
//             required
//             className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
//           />
//         </label>
//         <label className="mb-4 block">
//           <span className="mb-1 block text-sm font-medium text-gray-700">New password</span>
//           <input
//             type="password"
//             value={newPassword}
//             onChange={(e) => setNewPassword(e.target.value)}
//             required
//             className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
//           />
//         </label>
//         <button
//           type="submit"
//           disabled={saving}
//           className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
//         >
//           {saving ? "Saving…" : "Change password"}
//         </button>
//       </form>

//       <h2 className="mb-3 text-sm font-semibold text-gray-900">Sessions</h2>
//       <button onClick={handleLogoutAll} className="text-sm text-red-600 underline">
//         Log out of all devices
//       </button>
//     </main>
//   );
// }
"use client";

import { useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Avatar } from "@/components/Avatar";

const ALLOWED_TYPES = ["image/png", "image/jpeg"];
const MAX_SIZE_BYTES = 3 * 1024 * 1024; // keep in sync with backend limit

export default function ProfilePage() {
  const { user, loading, refreshUser } = useCurrentUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError(null);

    // Client-side pre-check only, for fast feedback — the backend is the
    // real authority and re-validates the actual file bytes regardless of
    // what's declared here.
    if (!ALLOWED_TYPES.includes(file.type)) {
      setAvatarError("Only PNG or JPG images are allowed.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setAvatarError("Image must be 3MB or smaller.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setAvatarUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      // apiClient sets a default "Content-Type: application/json" header
      // on the instance. That must be cleared here so axios/the browser
      // can set "multipart/form-data; boundary=..." instead — otherwise
      // this silently ships as JSON and multer rejects it.
      await apiClient.post("/auth/me/avatar", formData, {
        headers: { "Content-Type": undefined },
      });
      await refreshUser();
    } catch (err) {
      setAvatarError(getApiErrorMessage(err));
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(null);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      await apiClient.delete("/auth/me/avatar");
      await refreshUser();
    } catch (err) {
      setAvatarError(getApiErrorMessage(err));
    } finally {
      setAvatarUploading(false);
    }
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

      <div className="mb-8 flex items-center gap-4">
        <div className="relative">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-full object-cover opacity-60" />
          ) : (
            <Avatar avatarUrl={user.avatarUrl} email={user.email} size={64} />
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileSelected}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePickFile}
              disabled={avatarUploading}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {avatarUploading ? "Uploading…" : "Change photo"}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={avatarUploading}
                className="text-sm text-red-600 underline disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">PNG or JPG, up to 3MB.</p>
          {avatarError && <p className="mt-1 text-xs text-red-600">{avatarError}</p>}
        </div>
      </div>

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