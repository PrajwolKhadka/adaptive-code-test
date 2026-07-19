import { AppError } from "../middlewares/errorHandler.middleware";

// Extracts and validates a YouTube video ID from common URL shapes.
// Deliberately strict — only accepts youtube.com/youtu.be hosts and an
// 11-character alphanumeric ID pattern. This matters because the
// frontend embeds this ID directly into a youtube-nocookie.com iframe src;
// if arbitrary strings were accepted here, a malicious "video URL" could
// attempt to inject markup or point the iframe at an attacker-controlled
// origin. Storing only the extracted ID (never the raw URL) removes that
// surface entirely.
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeId(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError("Invalid video URL.", 400);
  }

  const host = parsed.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1);
  } else if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/embed/")[1];
    } else if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/shorts/")[1];
    }
  }

  if (!id || !YOUTUBE_ID_REGEX.test(id)) {
    throw new AppError("Could not extract a valid YouTube video ID from that URL.", 400);
  }

  return id;
}
