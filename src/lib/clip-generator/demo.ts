import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { ClipGeneratorAdapter, ClipGeneratorContext, GeneratedClip } from "./types";
import type { Shot } from "../types";

const execFileAsync = promisify(execFile);

const COLORS = [
  "0x1a1a2e",
  "0x16213e",
  "0x0f3460",
  "0xe94560",
  "0x1b263b",
  "0x415a77",
  "0x2d6a4f",
  "0x801336",
  "0x3a506b",
  "0x5bc0be",
];

function colorForShot(index: number): string {
  return COLORS[(index - 1) % COLORS.length];
}

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "")
    .replace(/%/g, "")
    .replace(/\n/g, " ")
    .slice(0, 80);
}

async function hasBinary(name: string): Promise<boolean> {
  try {
    await execFileAsync("which", [name]);
    return true;
  } catch {
    return false;
  }
}

async function maybeTts(
  text: string,
  wavPath: string
): Promise<boolean> {
  const speak = (await hasBinary("espeak-ng"))
    ? "espeak-ng"
    : (await hasBinary("espeak"))
      ? "espeak"
      : null;
  if (!speak || !text.trim()) return false;
  try {
    await execFileAsync(speak, ["-w", wavPath, text.slice(0, 200)]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Demo adapter: colored slides via ffmpeg (+ optional espeak TTS).
 * Always produces a real MP4 without GPU or paid APIs.
 */
export class DemoClipAdapter implements ClipGeneratorAdapter {
  readonly name = "demo";

  async generateClip(
    shot: Shot,
    ctx: ClipGeneratorContext
  ): Promise<GeneratedClip> {
    await fs.mkdir(ctx.workDir, { recursive: true });
    const outPath = path.join(ctx.workDir, `${shot.id}.mp4`);
    const color = colorForShot(shot.index);
    const label = escapeDrawtext(
      `Shot ${shot.index}: ${shot.camera} (${shot.durationSeconds}s)`
    );
    const sub = escapeDrawtext(
      (shot.dialogue || shot.description).slice(0, 70)
    );

    const wavPath = path.join(ctx.workDir, `${shot.id}.wav`);
    const hasAudio = await maybeTts(
      shot.dialogue?.replace(/^[^:]+:\s*/, "") || `Shot ${shot.index}`,
      wavPath
    );

    const { width, height } = ctx;
    const duration = Math.max(1, shot.durationSeconds);

    if (hasAudio) {
      // Color slide + TTS audio (pad/trim audio to duration)
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=${width}x${height}:d=${duration}`,
        "-i",
        wavPath,
        "-vf",
        `drawtext=text='${label}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h*0.35:box=1:boxcolor=black@0.45:boxborderw=8,drawtext=text='${sub}':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=h*0.55:box=1:boxcolor=black@0.35:boxborderw=6`,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-t",
        String(duration),
        outPath,
      ]);
      await fs.unlink(wavPath).catch(() => undefined);
    } else {
      // Silent color slide with silent AAC track for concat consistency
      await execFileAsync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        `color=c=${color}:s=${width}x${height}:d=${duration}`,
        "-f",
        "lavfi",
        "-i",
        `anullsrc=channel_layout=stereo:sample_rate=44100`,
        "-vf",
        `drawtext=text='${label}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=h*0.35:box=1:boxcolor=black@0.45:boxborderw=8,drawtext=text='${sub}':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=h*0.55:box=1:boxcolor=black@0.35:boxborderw=6`,
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-t",
        String(duration),
        outPath,
      ]);
    }

    return {
      shotId: shot.id,
      path: outPath,
      durationSeconds: duration,
      adapter: this.name,
    };
  }
}
