import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface StitchOptions {
  clipPaths: string[];
  outputPath: string;
  workDir: string;
}

/**
 * Concatenate clips into one MP4 using ffmpeg concat demuxer.
 * Re-encodes for consistent params across demo slides.
 */
export async function stitchClips(opts: StitchOptions): Promise<string> {
  const { clipPaths, outputPath, workDir } = opts;
  if (clipPaths.length === 0) {
    throw new Error("No clips to stitch");
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.mkdir(workDir, { recursive: true });

  const listFile = path.join(workDir, "concat.txt");
  const lines = clipPaths.map((p) => {
    const abs = path.resolve(p).replace(/'/g, "'\\''");
    return `file '${abs}'`;
  });
  await fs.writeFile(listFile, lines.join("\n") + "\n", "utf8");

  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  return outputPath;
}

/** Create a solid-color sample clip (for tests). */
export async function makeColorClip(
  outputPath: string,
  color: string,
  durationSeconds: number,
  width = 640,
  height = 360
): Promise<string> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${width}x${height}:d=${durationSeconds}`,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    "-t",
    String(durationSeconds),
    outputPath,
  ]);
  return outputPath;
}
