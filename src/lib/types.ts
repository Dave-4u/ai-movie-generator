export type AspectRatio = "16:9" | "9:16" | "1:1";

export type JobPhase =
  | "queued"
  | "script"
  | "shots"
  | "clips"
  | "stitch"
  | "done"
  | "error";

export interface Character {
  name: string;
  description: string;
  role: string;
}

export interface StyleBible {
  visualStyle: string;
  colorPalette: string[];
  mood: string;
  cameraLanguage: string;
  characters: Character[];
}

export interface ScriptScene {
  id: string;
  number: number;
  heading: string;
  action: string;
  dialogue: { character: string; line: string }[];
  estimatedSeconds: number;
}

export interface MovieScript {
  title: string;
  logline: string;
  synopsis: string;
  scenes: ScriptScene[];
  bible: StyleBible;
}

export interface Shot {
  id: string;
  index: number;
  sceneId: string;
  description: string;
  visualPrompt: string;
  dialogue?: string;
  durationSeconds: number;
  camera: string;
}

export interface ShotList {
  targetDurationSeconds: number;
  aspectRatio: AspectRatio;
  shots: Shot[];
  totalDurationSeconds: number;
}

export interface ClipResult {
  shotId: string;
  path: string;
  durationSeconds: number;
  adapter: string;
}

export interface JobProgress {
  phase: JobPhase;
  message: string;
  clipsDone: number;
  clipsTotal: number;
  percent: number;
}

export interface MovieJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  synopsis: string;
  targetDurationSeconds: number;
  aspectRatio: AspectRatio;
  adapter: "demo" | "http";
  progress: JobProgress;
  script?: MovieScript;
  shotList?: ShotList;
  clips: ClipResult[];
  outputPath?: string;
  error?: string;
}

export interface CreateJobRequest {
  synopsis: string;
  targetDurationSeconds?: number;
  aspectRatio?: AspectRatio;
  adapter?: "demo" | "http";
}
