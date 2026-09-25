import { promises as fs } from "node:fs";
import path from "node:path";
import type { ClipGeneratorAdapter, ClipGeneratorContext, GeneratedClip } from "./types";
import type { Shot } from "../types";
import { DemoClipAdapter } from "./demo";

/**
 * HTTP adapter stub for self-hosted open video models (e.g. CogVideoX-style).
 *
 * Expected endpoint (POST JSON):
 *   { prompt, duration_seconds, width, height, negative_prompt? }
 * Response:
 *   - video/mp4 binary body, OR
 *   - JSON { video_base64 } / { url }
 *
 * Set VIDEO_MODEL_URL to enable. If unset or request fails, falls back to demo.
 */
export class HttpClipAdapter implements ClipGeneratorAdapter {
  readonly name = "http";
  private fallback = new DemoClipAdapter();

  async generateClip(
    shot: Shot,
    ctx: ClipGeneratorContext
  ): Promise<GeneratedClip> {
    const base = process.env.VIDEO_MODEL_URL;
    if (!base) {
      const clip = await this.fallback.generateClip(shot, ctx);
      return { ...clip, adapter: "http-fallback-demo" };
    }

    await fs.mkdir(ctx.workDir, { recursive: true });
    const outPath = path.join(ctx.workDir, `${shot.id}.mp4`);

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(base.replace(/\/$/, "") + "/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: shot.visualPrompt,
          duration_seconds: shot.durationSeconds,
          width: ctx.width,
          height: ctx.height,
          negative_prompt: "blurry, watermark, text overlay, low quality",
          shot_id: shot.id,
        }),
        signal: controller.signal,
      });
      clearTimeout(t);

      if (!res.ok) {
        throw new Error(`HTTP adapter status ${res.status}`);
      }

      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("video") || ctype.includes("octet-stream")) {
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(outPath, buf);
      } else {
        const json = (await res.json()) as {
          video_base64?: string;
          url?: string;
        };
        if (json.video_base64) {
          await fs.writeFile(outPath, Buffer.from(json.video_base64, "base64"));
        } else if (json.url) {
          const v = await fetch(json.url);
          await fs.writeFile(outPath, Buffer.from(await v.arrayBuffer()));
        } else {
          throw new Error("HTTP adapter: no video in response");
        }
      }

      return {
        shotId: shot.id,
        path: outPath,
        durationSeconds: shot.durationSeconds,
        adapter: this.name,
      };
    } catch {
      const clip = await this.fallback.generateClip(shot, ctx);
      return { ...clip, adapter: "http-fallback-demo" };
    }
  }
}
