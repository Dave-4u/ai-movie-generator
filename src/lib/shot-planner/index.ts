import { biblePromptBlock } from "../bible";
import type {
  AspectRatio,
  MovieScript,
  Shot,
  ShotList,
} from "../types";

const CAMERA_MOVES = [
  "wide establishing",
  "medium two-shot",
  "close-up",
  "over-the-shoulder",
  "insert detail",
  "slow push-in",
  "tracking follow",
  "reaction close-up",
];

/**
 * Plan shots so durations sum to (approximately) the target.
 * Default demo targets 2–5 minutes; UI allows up to 60 minutes.
 */
export function planShots(
  script: MovieScript,
  targetDurationSeconds: number,
  aspectRatio: AspectRatio = "16:9"
): ShotList {
  const target = clampTarget(targetDurationSeconds);
  const bibleBlock = biblePromptBlock(script.bible);
  const shots: Shot[] = [];
  let index = 0;

  for (const scene of script.scenes) {
    const sceneBudget = Math.max(4, scene.estimatedSeconds);
    const sceneShots = splitSceneIntoShots(sceneBudget);

    let assigned = 0;
    sceneShots.forEach((dur, si) => {
      const isLast = si === sceneShots.length - 1;
      const durationSeconds = isLast
        ? Math.max(2, sceneBudget - assigned)
        : dur;
      assigned += isLast ? durationSeconds : dur;

      const camera = CAMERA_MOVES[(index + si) % CAMERA_MOVES.length];
      const dialogueLine = scene.dialogue[si % Math.max(scene.dialogue.length, 1)];
      const dialogue =
        dialogueLine && si < scene.dialogue.length
          ? `${dialogueLine.character}: ${dialogueLine.line}`
          : undefined;

      const description = [
        scene.heading,
        scene.action.slice(0, 160),
        dialogue ? `Dialogue — ${dialogue}` : "Visual beat, no dialogue",
      ].join(" | ");

      const visualPrompt = [
        `Shot ${index + 1}: ${camera}.`,
        description,
        bibleBlock,
        `Aspect ${aspectRatio}. No text overlays. Cinematic still suitable for a ${durationSeconds}s hold.`,
      ].join(" ");

      shots.push({
        id: `shot-${index + 1}`,
        index: index + 1,
        sceneId: scene.id,
        description,
        visualPrompt,
        dialogue,
        durationSeconds,
        camera,
      });
      index += 1;
    });
  }

  // Normalize total to target (fix residual into last shot)
  const rawTotal = shots.reduce((s, sh) => s + sh.durationSeconds, 0);
  if (shots.length > 0 && rawTotal !== target) {
    const delta = target - rawTotal;
    const last = shots[shots.length - 1];
    last.durationSeconds = Math.max(2, last.durationSeconds + delta);
  }

  const totalDurationSeconds = shots.reduce(
    (s, sh) => s + sh.durationSeconds,
    0
  );

  return {
    targetDurationSeconds: target,
    aspectRatio,
    shots,
    totalDurationSeconds,
  };
}

export function clampTarget(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 150; // 2.5 min default
  return Math.min(3600, Math.max(30, Math.round(seconds)));
}

/**
 * Split a scene budget into 2–5 shot durations that sum exactly to budget.
 */
export function splitSceneIntoShots(sceneBudget: number): number[] {
  const budget = Math.max(4, Math.round(sceneBudget));
  // Aim ~6–12s per shot for demos; longer films allow longer holds
  const idealShot = budget >= 300 ? 12 : budget >= 120 ? 8 : 6;
  let count = Math.max(2, Math.round(budget / idealShot));
  count = Math.min(5, count);

  const base = Math.floor(budget / count);
  const remainder = budget - base * count;
  const durs: number[] = Array.from({ length: count }, () =>
    Math.max(2, base)
  );
  for (let i = 0; i < remainder; i++) {
    durs[i % durs.length] += 1;
  }
  // Ensure exact sum
  const sum = durs.reduce((a, b) => a + b, 0);
  if (sum !== budget) {
    durs[durs.length - 1] += budget - sum;
  }
  return durs;
}

/** Test helper: absolute difference between shot sum and target. */
export function timingError(shotList: ShotList): number {
  return Math.abs(shotList.totalDurationSeconds - shotList.targetDurationSeconds);
}
