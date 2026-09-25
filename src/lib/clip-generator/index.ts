import { DemoClipAdapter } from "./demo";
import { HttpClipAdapter } from "./http";
import type { ClipGeneratorAdapter } from "./types";

export * from "./types";
export { DemoClipAdapter } from "./demo";
export { HttpClipAdapter } from "./http";

export function getAdapter(name: "demo" | "http" = "demo"): ClipGeneratorAdapter {
  if (name === "http") return new HttpClipAdapter();
  return new DemoClipAdapter();
}
