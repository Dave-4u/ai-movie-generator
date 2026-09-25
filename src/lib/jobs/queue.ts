import path from "node:path";
import { generateScript } from "../scriptwriter";
import { planShots } from "../shot-planner";
import { getAdapter, resolutionForAspect } from "../clip-generator";
import { stitchClips } from "../stitcher";
import type { CreateJobRequest, MovieJob } from "../types";
import {
  clipsDir,
  loadJob,
  newJobId,
  outputPathFor,
  saveJob,
} from "./store";

const running = new Set<string>();

export async function createAndEnqueueJob(
  req: CreateJobRequest
): Promise<MovieJob> {
  const synopsis = (req.synopsis || "").trim();
  if (synopsis.length < 10) {
    throw new Error("Please provide a longer story idea (at least 10 characters).");
  }

  const targetDurationSeconds = req.targetDurationSeconds ?? 150;
  const aspectRatio = req.aspectRatio ?? "16:9";
  const adapter = req.adapter ?? "demo";

  const id = newJobId();
  const now = new Date().toISOString();
  const job: MovieJob = {
    id,
    createdAt: now,
    updatedAt: now,
    synopsis,
    targetDurationSeconds,
    aspectRatio,
    adapter,
    progress: {
      phase: "queued",
      message: "Queued…",
      clipsDone: 0,
      clipsTotal: 0,
      percent: 0,
    },
    clips: [],
  };

  await saveJob(job);
  void processJob(id);
  return job;
}

export async function getJob(id: string): Promise<MovieJob | null> {
  return loadJob(id);
}

async function update(
  id: string,
  patch: Partial<MovieJob> & {
    progress?: Partial<MovieJob["progress"]>;
  }
): Promise<MovieJob> {
  const job = await loadJob(id);
  if (!job) throw new Error("Job not found");
  const next: MovieJob = {
    ...job,
    ...patch,
    progress: { ...job.progress, ...(patch.progress || {}) },
    clips: patch.clips ?? job.clips,
  };
  await saveJob(next);
  return next;
}

export async function processJob(id: string): Promise<void> {
  if (running.has(id)) return;
  running.add(id);

  try {
    const job = await loadJob(id);
    if (!job) return;

    // 1) Script
    await update(id, {
      progress: {
        phase: "script",
        message: "Writing script from synopsis…",
        percent: 5,
        clipsDone: 0,
        clipsTotal: 0,
      },
    });
    const script = await generateScript(job.synopsis, job.targetDurationSeconds);
    await update(id, {
      script,
      progress: {
        phase: "shots",
        message: "Planning timed shot list…",
        percent: 15,
        clipsDone: 0,
        clipsTotal: 0,
      },
    });

    // 2) Shots
    const shotList = planShots(
      script,
      job.targetDurationSeconds,
      job.aspectRatio
    );
    await update(id, {
      shotList,
      progress: {
        phase: "clips",
        message: `Generating clips 0/${shotList.shots.length}…`,
        percent: 20,
        clipsDone: 0,
        clipsTotal: shotList.shots.length,
      },
    });

    // 3) Clips
    const adapter = getAdapter(job.adapter);
    const res = resolutionForAspect(job.aspectRatio);
    const workDir = clipsDir(id);
    const clips = [];

    for (let i = 0; i < shotList.shots.length; i++) {
      const shot = shotList.shots[i];
      const clip = await adapter.generateClip(shot, {
        jobId: id,
        workDir,
        aspectRatio: job.aspectRatio,
        bible: script.bible,
        width: res.width,
        height: res.height,
      });
      clips.push(clip);
      const done = i + 1;
      const percent = 20 + Math.round((done / shotList.shots.length) * 65);
      await update(id, {
        clips: [...clips],
        progress: {
          phase: "clips",
          message: `Generating clips ${done}/${shotList.shots.length}…`,
          percent,
          clipsDone: done,
          clipsTotal: shotList.shots.length,
        },
      });
    }

    // 4) Stitch
    await update(id, {
      progress: {
        phase: "stitch",
        message: "Stitching final MP4…",
        percent: 90,
        clipsDone: clips.length,
        clipsTotal: clips.length,
      },
    });

    const out = outputPathFor(id);
    await stitchClips({
      clipPaths: clips.map((c) => c.path),
      outputPath: out,
      workDir: path.join(workDir, "_stitch"),
    });

    await update(id, {
      outputPath: out,
      clips,
      progress: {
        phase: "done",
        message: "Movie ready — download your MP4.",
        percent: 100,
        clipsDone: clips.length,
        clipsTotal: clips.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await update(id, {
      error: message,
      progress: {
        phase: "error",
        message: `Failed: ${message}`,
        percent: 0,
        clipsDone: 0,
        clipsTotal: 0,
      },
    }).catch(() => undefined);
  } finally {
    running.delete(id);
  }
}
