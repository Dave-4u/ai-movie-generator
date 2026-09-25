"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AspectRatio, MovieJob } from "@/lib/types";

const DURATION_PRESETS = [
  { label: "Demo 30s", seconds: 30 },
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
  { label: "15 min", seconds: 900 },
  { label: "30 min", seconds: 1800 },
  { label: "60 min", seconds: 3600 },
];

function phaseLabel(job: MovieJob): string {
  return job.progress.message;
}

export default function MovieGenerator() {
  const [synopsis, setSynopsis] = useState(
    "Maya discovers a forgotten radio that plays tomorrow's news. When she hears her own name in a warning, she and her neighbor Leo race across the city to change a future that already knows their names."
  );
  const [targetDurationSeconds, setTargetDurationSeconds] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [adapter, setAdapter] = useState<"demo" | "http">("demo");
  const [job, setJob] = useState<MovieJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = useMemo(() => {
    if (submitting) return true;
    if (!job) return false;
    return !["done", "error"].includes(job.progress.phase);
  }, [job, submitting]);

  const poll = useCallback(async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error("Failed to fetch job");
    const data = (await res.json()) as { job: MovieJob };
    setJob(data.job);
    return data.job;
  }, []);

  useEffect(() => {
    if (!job || ["done", "error"].includes(job.progress.phase)) return;
    const t = setInterval(() => {
      void poll(job.id).catch((e) =>
        setError(e instanceof Error ? e.message : String(e))
      );
    }, 1000);
    return () => clearInterval(t);
  }, [job, poll]);

  async function onGenerate() {
    setError(null);
    setSubmitting(true);
    setJob(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          synopsis,
          targetDurationSeconds,
          aspectRatio,
          adapter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      setJob(data.job as MovieJob);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-violet-300/80">
          Free · Offline-first · Open adapters
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          AI Movie Generator
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          Paste a story idea. We write a script, plan a timed shot list, generate
          each clip through free adapters, and stitch one MP4 — one{" "}
          <span className="text-zinc-200">Generate movie</span> action with live
          progress. Honest note: this is an automated scene pipeline (demo slides
          by default), not a magic one-shot hour-long film. Target up to ~60
          minutes; start with a short demo.
        </p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 shadow-xl shadow-black/30 backdrop-blur sm:p-6">
        <label className="block text-sm font-medium text-zinc-300">
          Story idea / synopsis
        </label>
        <textarea
          className="mt-2 min-h-32 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none ring-violet-500/40 placeholder:text-zinc-600 focus:ring-2"
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          disabled={busy}
          placeholder="Describe your movie idea…"
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Target duration
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/40"
              value={targetDurationSeconds}
              disabled={busy}
              onChange={(e) => setTargetDurationSeconds(Number(e.target.value))}
            >
              {DURATION_PRESETS.map((p) => (
                <option key={p.seconds} value={p.seconds}>
                  {p.label}
                </option>
              ))}
            </select>
            {targetDurationSeconds >= 900 && (
              <p className="mt-1 text-xs text-amber-300/90">
                Longer targets mean more clips and time. Demo adapter uses still
                slides — fine for pipeline tests, not cinema.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Aspect ratio
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/40"
              value={aspectRatio}
              disabled={busy}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            >
              <option value="16:9">16:9 (default)</option>
              <option value="9:16">9:16 vertical</option>
              <option value="1:1">1:1 square</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Clip adapter
            </label>
            <select
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/80 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-2 focus:ring-violet-500/40"
              value={adapter}
              disabled={busy}
              onChange={(e) =>
                setAdapter(e.target.value === "http" ? "http" : "demo")
              }
            >
              <option value="demo">Demo (free, no GPU)</option>
              <option value="http">HTTP self-hosted model</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy || synopsis.trim().length < 10}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate movie"}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </section>

      {job && (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Progress</h2>
              <p className="text-sm text-zinc-400">{phaseLabel(job)}</p>
            </div>
            <p className="font-mono text-xs text-zinc-500">job {job.id.slice(0, 8)}</p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
              style={{ width: `${job.progress.percent}%` }}
            />
          </div>

          <ol className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-4">
            {(
              [
                ["script", "Script"],
                ["shots", "Shots"],
                ["clips", `Clips ${job.progress.clipsDone}/${job.progress.clipsTotal || "—"}`],
                ["stitch", "Stitch"],
              ] as const
            ).map(([key, label]) => {
              const order = ["queued", "script", "shots", "clips", "stitch", "done"];
              const cur = order.indexOf(job.progress.phase);
              const mine = order.indexOf(key);
              const active =
                job.progress.phase === key ||
                (key === "stitch" && job.progress.phase === "done");
              const done =
                job.progress.phase === "done" ||
                (mine >= 0 && cur > mine);
              return (
                <li
                  key={key}
                  className={`rounded-lg border px-3 py-2 ${
                    active
                      ? "border-violet-400/50 bg-violet-500/10 text-violet-200"
                      : done
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200/90"
                        : "border-white/5 bg-zinc-950/40"
                  }`}
                >
                  {label}
                </li>
              );
            })}
          </ol>

          {job.progress.phase === "done" && (
            <a
              href={`/api/jobs/${job.id}/download`}
              className="inline-flex rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
            >
              Download MP4
            </a>
          )}

          {job.progress.phase === "error" && (
            <p className="text-sm text-red-400">{job.error || job.progress.message}</p>
          )}

          {job.script && (
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-base font-semibold text-white">
                {job.script.title}
              </h3>
              <p className="text-sm italic text-zinc-400">{job.script.logline}</p>
              <div className="rounded-xl bg-zinc-950/60 p-3 text-xs text-zinc-400">
                <p className="font-medium text-zinc-300">Character / style bible</p>
                <p className="mt-1">{job.script.bible.visualStyle}</p>
                <p>Mood: {job.script.bible.mood}</p>
                <p>
                  Cast:{" "}
                  {job.script.bible.characters
                    .map((c) => `${c.name} (${c.role})`)
                    .join(", ")}
                </p>
              </div>
              <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                {job.script.scenes.map((s) => (
                  <article
                    key={s.id}
                    className="rounded-lg border border-white/5 bg-zinc-950/50 p-3 text-sm"
                  >
                    <h4 className="font-medium text-violet-200">
                      {s.number}. {s.heading}
                    </h4>
                    <p className="mt-1 text-zinc-400">{s.action}</p>
                    {s.dialogue.map((d, i) => (
                      <p key={i} className="mt-1 text-zinc-300">
                        <span className="font-semibold text-zinc-200">
                          {d.character}:
                        </span>{" "}
                        {d.line}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          )}

          {job.shotList && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-base font-semibold text-white">
                Shot list ({job.shotList.shots.length} shots ·{" "}
                {job.shotList.totalDurationSeconds}s total)
              </h3>
              <div className="mt-2 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-zinc-400">
                  <thead className="sticky top-0 bg-zinc-900 text-zinc-300">
                    <tr>
                      <th className="py-1 pr-2">#</th>
                      <th className="py-1 pr-2">Camera</th>
                      <th className="py-1 pr-2">Dur</th>
                      <th className="py-1">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.shotList.shots.map((sh) => (
                      <tr key={sh.id} className="border-t border-white/5">
                        <td className="py-1 pr-2 font-mono">{sh.index}</td>
                        <td className="py-1 pr-2">{sh.camera}</td>
                        <td className="py-1 pr-2">{sh.durationSeconds}s</td>
                        <td className="py-1">{sh.description.slice(0, 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
