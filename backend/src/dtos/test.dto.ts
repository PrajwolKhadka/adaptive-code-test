import { z } from "zod";

export const submitAttemptSchema = z.object({
  questionId: z.string().length(24), // Mongo ObjectId hex length
  code: z.string().min(1).max(20000),
  timeTakenMs: z.number().min(0).max(3_600_000),
});
export type SubmitAttemptDTO = z.infer<typeof submitAttemptSchema>;

export const purchaseHintSchema = z.object({
  questionId: z.string().length(24),
});
export type PurchaseHintDTO = z.infer<typeof purchaseHintSchema>;
