import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job || job.progress.phase !== "done" || !job.outputPath) {
    return NextResponse.json(
      { error: "Movie not ready" },
      { status: 404 }
    );
  }

  try {
    const data = await fs.readFile(job.outputPath);
    const title = (job.script?.title || "movie")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${title || "movie"}-${id.slice(0, 8)}.mp4"`,
        "Content-Length": String(data.length),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Output file missing" },
      { status: 404 }
    );
  }
}
