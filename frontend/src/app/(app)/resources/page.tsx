"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { Resource } from "@/types/resource";

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/resources")
      .then((res) => setResources(res.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const videos = resources.filter((r) => r.type === "video" && r.isActive);
  const pdfs = resources.filter((r) => r.type === "pdf" && r.isActive);

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Resources</h1>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && videos.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Videos</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {videos.map((v) => (
              <div key={v._id} className="overflow-hidden rounded-md border border-gray-200">
                <div className="aspect-video w-full">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${v.youtubeVideoId}`}
                    title={v.title}
                    className="h-full w-full"
                    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900">{v.title}</h3>
                  {v.description && <p className="mt-1 text-xs text-gray-500">{v.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && pdfs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">PDFs</h2>
          <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
            {pdfs.map((p) => (
              <div key={p._id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.title}</p>
                  {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                  <p className="text-xs text-gray-400">{formatBytes(p.fileSizeBytes)}</p>
                </div>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL}/resources/${p._id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && videos.length === 0 && pdfs.length === 0 && (
        <p className="text-sm text-gray-500">No resources have been added yet.</p>
      )}
    </main>
  );
}
