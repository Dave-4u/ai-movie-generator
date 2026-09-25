import { promises as fs } from "node:fs";
import path from "node:path";
import type { MovieJob } from "../types";

const ROOT = path.join(process.cwd(), "jobs");

export function jobDir(id: string): string {
  return path.join(ROOT, id);
}

export function jobJsonPath(id: string): string {
  return path.join(jobDir(id), "job.json");
}

export function clipsDir(id: string): string {
  return path.join(jobDir(id), "clips");
}

export function outputPathFor(id: string): string {
  return path.join(process.cwd(), "outputs", `${id}.mp4`);
}

export async function ensureRoots(): Promise<void> {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "outputs"), { recursive: true });
}

export async function saveJob(job: MovieJob): Promise<void> {
  await ensureRoots();
  await fs.mkdir(jobDir(job.id), { recursive: true });
  job.updatedAt = new Date().toISOString();
  await fs.writeFile(jobJsonPath(job.id), JSON.stringify(job, null, 2), "utf8");
}

export async function loadJob(id: string): Promise<MovieJob | null> {
  try {
    const raw = await fs.readFile(jobJsonPath(id), "utf8");
    return JSON.parse(raw) as MovieJob;
  } catch {
    return null;
  }
}

export function newJobId(): string {
  return crypto.randomUUID();
}
