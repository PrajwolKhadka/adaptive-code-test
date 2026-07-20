"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ExitConfirmToastProps {
  message: string;
  destination: string;
}

export function ExitConfirmToast({ message, destination }: ExitConfirmToastProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Exit
      </button>

      {confirming && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
            <p className="text-sm text-gray-800">{message}</p>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
              >
                Stay
              </button>
              <button
                onClick={() => router.push(destination)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}