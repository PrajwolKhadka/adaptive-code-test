import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

interface SummaryInput {
  totalQuestions: number;
  correctCount: number;
  finalTheta: number;
  thetaTrajectory: { afterQuestionIndex: number; theta: number }[];
  hintsUsedTotal: number;
}

const GEMINI_MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash"];

const OPENROUTER_MODELS_TO_TRY = [
  'gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'openrouter/free',
];

function buildPrompt(input: SummaryInput): string {
  return `A student just completed a ${input.totalQuestions}-question adaptive coding test.
Correct answers: ${input.correctCount}/${input.totalQuestions}.
Final ability estimate (theta, roughly -2 to +2 scale): ${input.finalTheta.toFixed(2)}.
Theta trajectory across the test: ${input.thetaTrajectory.map((t) => t.theta.toFixed(2)).join(", ")}.
Total hints used: ${input.hintsUsedTotal}.

Write a short (3-4 sentence), encouraging, specific performance summary for the student. Mention their trend (improving/plateauing/struggling) and one concrete suggestion. Respond with plain text only, no markdown formatting.`;
}

async function tryGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenAI({ apiKey });

  for (const model of GEMINI_MODELS_TO_TRY) {
    try {
      console.log(`[aiSummary] Trying Gemini model: ${model}`);
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
      });

      const text = response.text?.trim();
      if (!text) throw new Error(`Gemini model ${model} returned empty response`);

      console.log(`[aiSummary] Success with Gemini model: ${model}`);
      return text;
    } catch (error) {
      console.error(`[aiSummary] Gemini model ${model} failed:`, error);
      continue;
    }
  }
  return null;
}

async function tryOpenRouter(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const openrouter = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });

  for (const model of OPENROUTER_MODELS_TO_TRY) {
    try {
      console.log(`[aiSummary] Trying OpenRouter model: ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) throw new Error(`OpenRouter model ${model} returned empty response`);

      console.log(`[aiSummary] Success with OpenRouter model: ${model}`);
      return text;
    } catch (error) {
      console.error(`[aiSummary] OpenRouter model ${model} failed:`, error);
      continue;
    }
  }
  return null;
}

export class AiSummaryService {
  async generateSummary(input: SummaryInput): Promise<string> {
    const prompt = buildPrompt(input);

    const geminiResult = await tryGemini(prompt);
    if (geminiResult) return geminiResult;

    console.warn("[aiSummary] Gemini failed on all models, falling back to OpenRouter...");
    const openrouterResult = await tryOpenRouter(prompt);
    if (openrouterResult) return openrouterResult;

    console.error("[aiSummary] All providers/models failed — returning fallback text");
    return "AI summary unavailable right now, but your score and progress above are accurate.";
  }
}