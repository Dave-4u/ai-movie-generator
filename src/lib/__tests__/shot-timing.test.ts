import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { templateScript } from "../scriptwriter";
import {
  clampTarget,
  planShots,
  splitSceneIntoShots,
  timingError,
} from "../shot-planner";

describe("shot timing math", () => {
  it("splitSceneIntoShots sums to budget", () => {
    for (const budget of [10, 24, 45, 90, 180]) {
      const parts = splitSceneIntoShots(budget);
      const sum = parts.reduce((a, b) => a + b, 0);
      assert.equal(sum, Math.max(4, budget));
      assert.ok(parts.length >= 2 && parts.length <= 5);
    }
  });

  it("planShots total ≈ target for demo and hour-scale", () => {
    const synopsis =
      "Alex and Jordan uncover a map that redraws the city every midnight.";
    for (const target of [30, 120, 300, 900, 3600]) {
      const script = templateScript(synopsis, target);
      const shots = planShots(script, target, "16:9");
      assert.equal(shots.targetDurationSeconds, clampTarget(target));
      assert.equal(timingError(shots), 0);
      assert.ok(shots.shots.length >= 2);
      assert.ok(
        shots.shots.every((s) => s.durationSeconds >= 2),
        "each shot >= 2s"
      );
    }
  });
});
