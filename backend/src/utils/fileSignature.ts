export type AllowedImageMime = "image/png" | "image/jpeg";

const SIGNATURES: Record<AllowedImageMime, number[][]> = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xdb],
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xee],
  ],
};

export function detectImageMimeFromBuffer(buffer: Buffer): AllowedImageMime | null {
  for (const [mime, signatures] of Object.entries(SIGNATURES) as [AllowedImageMime, number[][]][]) {
    for (const sig of signatures) {
      if (buffer.length >= sig.length && sig.every((byte, i) => buffer[i] === byte)) {
        return mime;
      }
    }
  }
  return null;
}