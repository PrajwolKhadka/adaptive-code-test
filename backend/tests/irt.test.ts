import { computeEffectiveCorrectness, updateTheta, selectNextItem } from "../src/utils/irt";
import { Difficulty } from "../src/models/index.models";

describe("computeEffectiveCorrectness", () => {
  it("returns 1 when all test cases pass with no hints used", () => {
    const result = computeEffectiveCorrectness(
      [{ passed: true, weight: 1 }, { passed: true, weight: 1 }],
      0,
    );
    expect(result).toBe(1);
  });

  it("returns 0 when all test cases fail", () => {
    const result = computeEffectiveCorrectness(
      [{ passed: false, weight: 1 }, { passed: false, weight: 1 }],
      0,
    );
    expect(result).toBe(0);
  });

  it("gives partial credit proportional to weighted passes", () => {
    const result = computeEffectiveCorrectness(
      [{ passed: true, weight: 1 }, { passed: false, weight: 1 }],
      0,
    );
    expect(result).toBeCloseTo(0.5);
  });

  it("respects unequal weights", () => {
    const result = computeEffectiveCorrectness(
      [{ passed: false, weight: 1 }, { passed: true, weight: 3 }],
      0,
    );
    expect(result).toBeCloseTo(0.75);
  });

  it("discounts correctness by hints used", () => {
    const noHints = computeEffectiveCorrectness([{ passed: true, weight: 1 }], 0);
    const twoHints = computeEffectiveCorrectness([{ passed: true, weight: 1 }], 2);
    expect(twoHints).toBeLessThan(noHints);
    expect(twoHints).toBeCloseTo(0.7); // 1 - 0.15*2
  });

  it("never goes negative even with excessive hints", () => {
    const result = computeEffectiveCorrectness([{ passed: true, weight: 1 }], 20);
    expect(result).toBe(0);
  });

  it("returns 0 for an empty test case list rather than dividing by zero", () => {
    const result = computeEffectiveCorrectness([], 0);
    expect(result).toBe(0);
  });
});

describe("updateTheta", () => {
  it("increases theta after an unexpectedly correct (hard) answer", () => {
    const before = -1;
    const after = updateTheta(before, Difficulty.HARD, 1);
    expect(after).toBeGreaterThan(before);
  });

  it("decreases theta after an unexpectedly wrong (easy) answer", () => {
    const before = 1;
    const after = updateTheta(before, Difficulty.VERY_EASY, 0);
    expect(after).toBeLessThan(before);
  });

  it("moves theta only slightly when the outcome matches expectation", () => {
    const before = 0;
    const afterCorrect = updateTheta(before, Difficulty.MEDIUM, 1);
    const afterWrong = updateTheta(before, Difficulty.MEDIUM, 0);
    expect(afterCorrect).toBeGreaterThan(before);
    expect(afterWrong).toBeLessThan(before);
    expect(Math.abs(afterCorrect - before)).toBeCloseTo(Math.abs(afterWrong - before), 5);
  });

  it("is deterministic for the same inputs", () => {
    const a = updateTheta(0.3, Difficulty.EASY, 0.6);
    const b = updateTheta(0.3, Difficulty.EASY, 0.6);
    expect(a).toBe(b);
  });
});

describe("selectNextItem", () => {
  const makeItem = (difficulty: Difficulty, exposureCount: number) => ({ difficulty, exposureCount });

  it("throws on an empty candidate list rather than returning undefined", () => {
    expect(() => selectNextItem([], 0)).toThrow();
  });

  it("picks the item whose difficulty is closest to theta", () => {
    const candidates = [
      makeItem(Difficulty.VERY_EASY, 0),
      makeItem(Difficulty.MEDIUM, 0),
      makeItem(Difficulty.VERY_HARD, 0),
    ];
    const picked = selectNextItem(candidates, 0);
    expect(picked.difficulty).toBe(Difficulty.MEDIUM);
  });

  it("breaks ties between similarly-difficult items by preferring lower exposure", () => {
    const candidates = [
      makeItem(Difficulty.EASY, 50),
      makeItem(Difficulty.MEDIUM, 1),
    ];
    const picked = selectNextItem(candidates, -0.5);
    expect(picked.difficulty).toBe(Difficulty.MEDIUM);
  });

  it("does not apply the exposure tiebreak across items outside the distance band", () => {
    const candidates = [
      makeItem(Difficulty.VERY_EASY, 100),
      makeItem(Difficulty.VERY_HARD, 0),
    ];
    const picked = selectNextItem(candidates, -2);
    expect(picked.difficulty).toBe(Difficulty.VERY_EASY);
  });
});