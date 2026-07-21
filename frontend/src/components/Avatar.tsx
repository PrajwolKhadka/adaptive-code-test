"use client";

import { getAvatarSrc, getInitials } from "@/lib/avatar";

interface AvatarProps {
  avatarUrl: string | null;
  email: string;
  size?: number;
  className?: string;
}

export function Avatar({ avatarUrl, email, size = 36, className = "" }: AvatarProps) {
  const src = getAvatarSrc(avatarUrl);
  const dimension = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt="Profile picture"
        style={dimension}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={dimension}
      className={`flex items-center justify-center rounded-full bg-cyan-600 text-xs font-medium text-white ${className}`}
    >
      {getInitials(email)}
    </div>
  );
}