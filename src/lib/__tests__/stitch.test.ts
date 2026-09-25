import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { makeColorClip, stitchClips } from "../stitcher";

describe("stitcher", () => {
  it("stitches ffmpeg color clips into one mp4", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "amg-stitch-"));
    const a = path.join(dir, "a.mp4");
    const b = path.join(dir, "b.mp4");
    const out = path.join(dir, "out.mp4");
    await makeColorClip(a, "0xff0000", 1);
    await makeColorClip(b, "0x0000ff", 1);
    await stitchClips({
      clipPaths: [a, b],
      outputPath: out,
      workDir: path.join(dir, "work"),
    });
    const stat = await fs.stat(out);
    assert.ok(stat.size > 1000, `expected non-trivial mp4, got ${stat.size}`);
  });
});
