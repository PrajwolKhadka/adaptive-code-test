interface SummaryInput {
  totalQuestions: number;
  correctCount: number;
  finalTheta: number;
  thetaTrajectory: { afterQuestionIndex: number; theta: number }[];
  hintsUsedTotal: number;
}

export class AiSummaryService {
  async generateSummary(input: SummaryInput): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return "AI summary unavailable (no API key configured).";

    // Only aggregate, non-identifying performance stats are sent — no
    // email, name, or submitted code content. Minimizes what leaves the
    // system via a third-party API call (data minimization principle,
    // worth citing in your report's privacy/GDPR-adjacent discussion).
    const prompt = `A student just completed a ${input.totalQuestions}-question adaptive coding test.
Correct answers: ${input.correctCount}/${input.totalQuestions}.
Final ability estimate (theta, roughly -2 to +2 scale): ${input.finalTheta.toFixed(2)}.
Theta trajectory across the test: ${input.thetaTrajectory.map((t) => t.theta.toFixed(2)).join(", ")}.
Total hints used: ${input.hintsUsedTotal}.

Write a short (3-4 sentence), encouraging, specific performance summary for the student. Mention their trend (improving/plateauing/struggling) and one concrete suggestion.`;

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        return "AI summary unavailable (service error).";
      }

      const data = (await res.json()) as any;
      return data?.choices?.[0]?.message?.content ?? "AI summary unavailable.";
    } catch {
      // Never let an AI-provider outage break test finalization — this is
      // a nice-to-have enhancement, not core functionality.
      return "AI summary unavailable.";
    }
  }
}
