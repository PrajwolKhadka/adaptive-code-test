import { z } from "zod";
import { Difficulty } from "../models/index.models";

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean().default(true),
  weight: z.number().min(0).default(1),
});

export const createQuestionSchema = z.object({
  title: z.string().min(3).max(200),
  prompt: z.string().min(10).max(10000),
  difficulty: z.nativeEnum(Difficulty),
  starterCode: z.string().max(5000).default(""),
  testCases: z.array(testCaseSchema).min(1).max(20),
  timeLimitMs: z.number().min(500).max(10000).default(3000),
  memoryLimitMb: z.number().min(16).max(512).default(128),
  hintCostExp: z.number().min(0).max(1000).default(10),
  hints: z.array(z.string().max(1000)).max(5).default([]),
});
export type CreateQuestionDTO = z.infer<typeof createQuestionSchema>;

export const updateQuestionSchema = createQuestionSchema.partial();
export type UpdateQuestionDTO = z.infer<typeof updateQuestionSchema>;

export const bulkImportQuestionsSchema = z.array(createQuestionSchema).min(1).max(200);
export type BulkImportQuestionsDTO = z.infer<typeof bulkImportQuestionsSchema>;