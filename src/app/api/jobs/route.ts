import { NextResponse } from "next/server";
import { createAndEnqueueJob } from "@/lib/jobs/queue";
import type { AspectRatio, CreateJobRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateJobRequest;
    const aspect = body.aspectRatio;
    if (aspect && !["16:9", "9:16", "1:1"].includes(aspect)) {
      return NextResponse.json(
        { error: "Invalid aspect ratio" },
        { status: 400 }
      );
    }

    const job = await createAndEnqueueJob({
      synopsis: body.synopsis,
      targetDurationSeconds: body.targetDurationSeconds,
      aspectRatio: aspect as AspectRatio | undefined,
      adapter: body.adapter === "http" ? "http" : "demo",
    });

    return NextResponse.json({ job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create job";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
