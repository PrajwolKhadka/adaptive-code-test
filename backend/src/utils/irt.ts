import { Difficulty, difficultyMap } from "../models/index.models";



const LEARNING_RATE = 0.4; // how much a single response moves theta — tune + justify in report
const HINT_PENALTY_PER_HINT = 0.15; // discount applied to correctness signal per hint used

export function computeEffectiveCorrectness(testCaseResults: { passed: boolean; weight: number }[], hintsUsed: number): number {
  const totalWeight = testCaseResults.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight === 0) return 0;

  const passedWeight = testCaseResults.filter((r) => r.passed).reduce((sum, r) => sum + r.weight, 0);
  const rawCorrectness = passedWeight / totalWeight; // 0..1, supports partial credit

  const discount = Math.max(0, 1 - HINT_PENALTY_PER_HINT * hintsUsed);
  return Math.max(0, Math.min(1, rawCorrectness * discount));
}


export function updateTheta(currentTheta: number, itemDifficulty: Difficulty, effectiveCorrectness: number): number {
  const b = difficultyMap[itemDifficulty];
  const expectedP = 1 / (1 + Math.exp(-(currentTheta - b)));
  const delta = LEARNING_RATE * (effectiveCorrectness - expectedP);
  return currentTheta + delta;
}

export function selectNextItem<T extends { difficulty: Difficulty; exposureCount: number }>(
  candidates: T[],
  theta: number,
): T {
  if (candidates.length === 0) {
    throw new Error("selectNextItem called with an empty candidate list");
  }

  const scored = candidates.map((item) => ({
    item,
    distance: Math.abs(difficultyMap[item.difficulty] - theta),
  }));

  scored.sort((a, b) => a.distance - b.distance);

  const closestDistance = scored[0].distance;
  const EXPOSURE_BAND = 0.25; // items within this distance of the closest are treated as "equally good" for exposure control
  const withinBand = scored.filter((s) => s.distance <= closestDistance + EXPOSURE_BAND);

  withinBand.sort((a, b) => a.item.exposureCount - b.item.exposureCount);
  return withinBand[0].item;
}
