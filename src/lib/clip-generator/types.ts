import type { AspectRatio, Shot, StyleBible } from "../types";

export interface ClipGeneratorContext {
  jobId: string;
  workDir: string;
  aspectRatio: AspectRatio;
  bible: StyleBible;
  /** width x height derived from aspect */
  width: number;
  height: number;
}

export interface GeneratedClip {
  shotId: string;
  path: string;
  durationSeconds: number;
  adapter: string;
}

export interface ClipGeneratorAdapter {
  readonly name: string;
  generateClip(
    shot: Shot,
    ctx: ClipGeneratorContext
  ): Promise<GeneratedClip>;
}

export function resolutionForAspect(
  aspect: AspectRatio
): { width: number; height: number } {
  switch (aspect) {
    case "9:16":
      return { width: 720, height: 1280 };
    case "1:1":
      return { width: 720, height: 720 };
    case "16:9":
    default:
      return { width: 1280, height: 720 };
  }
}
