import { z } from "zod";

export const createVideoResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).default(""),
  url: z.string().url(),
});
export type CreateVideoResourceDTO = z.infer<typeof createVideoResourceSchema>;

export const createPdfResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).default(""),
});
export type CreatePdfResourceDTO = z.infer<typeof createPdfResourceSchema>;
