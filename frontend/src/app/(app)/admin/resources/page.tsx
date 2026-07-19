"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { Resource } from "@/types/resource";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);

  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfDescription, setPdfDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/resources");
      setResources(res.data.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddVideo(e: React.FormEvent) {
    e.preventDefault();
    setAddingVideo(true);
    setError(null);
    try {
      await apiClient.post("/resources/video", { title: videoTitle, description: videoDescription, url: videoUrl });
      setVideoTitle("");
      setVideoDescription("");
      setVideoUrl("");
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAddingVideo(false);
    }
  }

  async function handleUploadPdf(e: React.FormEvent) {
    e.preventDefault();
    if (!pdfFile) return;
    setUploadingPdf(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("title", pdfTitle);
      formData.append("description", pdfDescription);
      formData.append("file", pdfFile);
      await apiClient.post("/resources/pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPdfTitle("");
      setPdfDescription("");
      setPdfFile(null);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this resource?")) return;
    try {
      await apiClient.delete(`/resources/${id}`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Manage resources</h1>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <form onSubmit={handleAddVideo} className="rounded-md border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Add YouTube video</h2>
          <input
            className={`${inputClass} mb-2`}
            placeholder="Title"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
            required
          />
          <input
            className={`${inputClass} mb-2`}
            placeholder="Description (optional)"
            value={videoDescription}
            onChange={(e) => setVideoDescription(e.target.value)}
          />
          <input
            className={`${inputClass} mb-3`}
            placeholder="https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={addingVideo}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {addingVideo ? "Adding…" : "Add video"}
          </button>
        </form>

        <form onSubmit={handleUploadPdf} className="rounded-md border border-gray-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Upload PDF</h2>
          <input
            className={`${inputClass} mb-2`}
            placeholder="Title"
            value={pdfTitle}
            onChange={(e) => setPdfTitle(e.target.value)}
            required
          />
          <input
            className={`${inputClass} mb-2`}
            placeholder="Description (optional)"
            value={pdfDescription}
            onChange={(e) => setPdfDescription(e.target.value)}
          />
          <input
            type="file"
            accept="application/pdf"
            className={`${inputClass} mb-3`}
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            required
          />
          <button
            type="submit"
            disabled={uploadingPdf || !pdfFile}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {uploadingPdf ? "Uploading…" : "Upload PDF"}
          </button>
        </form>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && (
        <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {resources.map((r) => (
            <div key={r._id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {r.title} <span className="ml-2 text-xs text-gray-400">({r.type})</span>
                  {!r.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                </p>
                {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
              </div>
              <button onClick={() => handleDelete(r._id)} className="text-xs text-red-600 underline">
                Delete
              </button>
            </div>
          ))}
          {resources.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-500">No resources yet.</p>}
        </div>
      )}
    </main>
  );
}
