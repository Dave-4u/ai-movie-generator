/**
 * Smoke: generate a tiny demo movie via the demo adapter pipeline (no HTTP server).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateScript } from "../src/lib/scriptwriter";
import { planShots } from "../src/lib/shot-planner";
import { getAdapter, resolutionForAspect } from "../src/lib/clip-generator";
import { stitchClips } from "../src/lib/stitcher";

async function main() {
  const synopsis =
    "A lighthouse keeper finds a message in a bottle that replies to letters she has not written yet.";
  const target = 12; // short smoke
  const aspect = "16:9" as const;
  const work = path.join(process.cwd(), "outputs", "_demo_smoke");
  await fs.mkdir(work, { recursive: true });

  console.log("script…");
  const script = await generateScript(synopsis, target);
  console.log("title:", script.title);

  console.log("shots…");
  const shotList = planShots(script, target, aspect);
  console.log(
    `shots=${shotList.shots.length} total=${shotList.totalDurationSeconds}s`
  );

  const adapter = getAdapter("demo");
  const res = resolutionForAspect(aspect);
  const clipsDir = path.join(work, "clips");
  const clips = [];
  for (const shot of shotList.shots) {
    process.stdout.write(`clip ${shot.index}/${shotList.shots.length}…\n`);
    clips.push(
      await adapter.generateClip(shot, {
        jobId: "demo-smoke",
        workDir: clipsDir,
        aspectRatio: aspect,
        bible: script.bible,
        width: res.width,
        height: res.height,
      })
    );
  }

  const out = path.join(process.cwd(), "outputs", "demo-smoke.mp4");
  console.log("stitch…");
  await stitchClips({
    clipPaths: clips.map((c) => c.path),
    outputPath: out,
    workDir: path.join(work, "stitch"),
  });
  const st = await fs.stat(out);
  console.log("OK", out, `${st.size} bytes`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
