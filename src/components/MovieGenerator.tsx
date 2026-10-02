"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AspectRatio, MovieJob } from "@/lib/types";

const DURATIONS = [
  { label: "30s", seconds: 30, hint: "quick test" },
  { label: "2m", seconds: 120, hint: "short" },
  { label: "5m", seconds: 300, hint: "proper short" },
  { label: "15m", seconds: 900, hint: "takes a while" },
  { label: "30m", seconds: 1800, hint: "go make tea" },
  { label: "60m", seconds: 3600, hint: "overnight job" },
];

const ASPECTS: { value: AspectRatio; label: string; w: number; h: number }[] = [
  { value: "16:9", label: "Widescreen", w: 32, h: 18 },
  { value: "9:16", label: "Vertical", w: 14, h: 24 },
  { value: "1:1", label: "Square", w: 22, h: 22 },
];

const IDEAS = [
  "Maya discovers a forgotten radio that plays tomorrow's news. When she hears her own name in a warning, she and her neighbor Leo race across the city to change a future that already knows their names.",
  "Stuck in Third Mainland Bridge traffic, a danfo driver realises the passenger in the back seat is carrying a stolen painting, and that the owner is two buses behind.",
  "A shy night-shift nurse starts receiving handwritten thank-you notes from a patient who was discharged ten years ago.",
  "Two rival suya sellers on the same street must team up when a food critic announces she'll visit only one of them.",
];

const STEPS = [
  ["script", "Script"],
  ["shots", "Shot list"],
  ["clips", "Clips"],
  ["stitch", "Stitch"],
] as const;
const ORDER = ["queued", "script", "shots", "clips", "stitch", "done"];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m ? `${m}m ${r.toString().padStart(2, "0")}s` : `${r}s`;
}

export default function MovieGenerator() {
  const [synopsis, setSynopsis] = useState(IDEAS[0]);
  const [targetDurationSeconds, setTarget] = useState(30);
  const [aspectRatio, setAspect] = useState<AspectRatio>("16:9");
  const [adapter, setAdapter] = useState<"demo" | "http">("demo");
  const [job, setJob] = useState<MovieJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"board" | "script">("board");
  const ideaIdx = useRef(0);
  const resultRef = useRef<HTMLElement>(null);

  const busy = useMemo(() => submitting || (!!job && !["done", "error"].includes(job.progress.phase)), [job, submitting]);
  const words = synopsis.trim() ? synopsis.trim().split(/\s+/).length : 0;

  const poll = useCallback(async (id: string) => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error("Lost track of the job. Is the server still running?");
    const data = (await res.json()) as { job: MovieJob };
    setJob(data.job);
  }, []);

  useEffect(() => {
    if (!job || ["done", "error"].includes(job.progress.phase)) return;
    const t = setInterval(() => void poll(job.id).catch((e) => setError(e instanceof Error ? e.message : String(e))), 1000);
    return () => clearInterval(t);
  }, [job, poll]);

  const onGenerate = useCallback(async () => {
    if (busy || synopsis.trim().length < 10) return;
    setError(null);
    setSubmitting(true);
    setJob(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ synopsis, targetDurationSeconds, aspectRatio, adapter }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't start the job.");
      setJob(data.job as MovieJob);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [busy, synopsis, targetDurationSeconds, aspectRatio, adapter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void onGenerate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onGenerate]);

  function nextIdea() {
    ideaIdx.current = (ideaIdx.current + 1) % IDEAS.length;
    setSynopsis(IDEAS[ideaIdx.current]);
  }

  const phaseIdx = job ? ORDER.indexOf(job.progress.phase) : -1;
  const palette = job?.script?.bible.colorPalette ?? [];

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <span className="clap" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>
            <b>Reelwright</b>
            <small>AI movie generator</small>
          </span>
        </div>
        <span className="tag">free · offline-first · no API keys</span>
      </header>

      <section className="intro">
        <h1>
          From one paragraph<br />to a <em>finished cut.</em>
        </h1>
        <p>
          Write your idea the way you&apos;d pitch it to a friend. Reelwright writes a script, plans timed shots, renders each clip,
          and stitches one MP4 you can download.
        </p>
        <p className="honest">
          Straight talk: the free demo adapter renders <b>title-card slides</b> (with narration if espeak is installed), not
          AI footage. Plug in a self-hosted video model for real generated shots.
        </p>
      </section>

      <section className="slate" aria-label="New movie">
        <div className="slate-top" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
        </div>
        <div className="slate-body">
          <div className="field idea">
            <div className="label-row">
              <label htmlFor="synopsis">Your idea</label>
              <button type="button" className="link" onClick={nextIdea} disabled={busy}>Give me another idea ↻</button>
            </div>
            <textarea
              id="synopsis"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              disabled={busy}
              placeholder="A street hawker finds a phone that only receives calls from 1999…"
            />
            <p className="hint">{words} words · {words < 15 ? "a sentence or two more helps the script" : "plenty to work with"}</p>
          </div>

          <div className="slate-grid">
            <fieldset className="field">
              <legend>Runtime</legend>
              <div className="chips">
                {DURATIONS.map((d) => (
                  <button key={d.seconds} type="button" aria-pressed={targetDurationSeconds === d.seconds} onClick={() => setTarget(d.seconds)} disabled={busy} title={d.hint}>
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="hint">{DURATIONS.find((d) => d.seconds === targetDurationSeconds)?.hint}{targetDurationSeconds >= 900 ? ". More shots means more render time." : ""}</p>
            </fieldset>

            <fieldset className="field">
              <legend>Frame</legend>
              <div className="aspects">
                {ASPECTS.map((a) => (
                  <button key={a.value} type="button" aria-pressed={aspectRatio === a.value} onClick={() => setAspect(a.value)} disabled={busy}>
                    <span className="frame" style={{ width: a.w, height: a.h }} aria-hidden="true" />
                    <span>{a.value}</span>
                    <small>{a.label}</small>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Camera crew</legend>
              <div className="adapters">
                <label className={adapter === "demo" ? "on" : ""}>
                  <input type="radio" name="adapter" checked={adapter === "demo"} onChange={() => setAdapter("demo")} disabled={busy} />
                  <b>Demo</b><small>free, CPU only, title cards</small>
                </label>
                <label className={adapter === "http" ? "on" : ""}>
                  <input type="radio" name="adapter" checked={adapter === "http"} onChange={() => setAdapter("http")} disabled={busy} />
                  <b>Self-hosted model</b><small>needs VIDEO_MODEL_URL</small>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="action-row">
            <button type="button" className="roll" onClick={() => void onGenerate()} disabled={busy || synopsis.trim().length < 10}>
              {busy ? <><span className="spin" aria-hidden="true" /> Rolling…</> : <>Roll camera <kbd>Ctrl ↵</kbd></>}
            </button>
            {error && <p className="error" role="alert">{error}</p>}
          </div>
        </div>
      </section>

      {!job && !submitting && (
        <section className="empty" aria-hidden="true">
          <div className="reel" />
          <p>Your storyboard, script, and finished cut will appear here.</p>
        </section>
      )}

      {job && (
        <section className="result" ref={resultRef} aria-live="polite">
          <div className="result-head">
            <div>
              <p className="eyebrow">Take 1 · job {job.id.slice(0, 8)}</p>
              <h2>{job.script?.title ?? "Writing…"}</h2>
              {job.script && <p className="logline">{job.script.logline}</p>}
            </div>
            {palette.length > 0 && (
              <div className="palette" title="Colour palette from the style bible">
                {palette.map((c) => <span key={c} title={c} style={{ background: c }}>{c}</span>)}
              </div>
            )}
          </div>

          <div className="strip" role="progressbar" aria-valuenow={job.progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Render progress">
            <div className="strip-fill" style={{ width: `${job.progress.percent}%` }} />
          </div>
          <div className="status-row">
            <ol className="steps">
              {STEPS.map(([key, label]) => {
                const mine = ORDER.indexOf(key);
                const done = job.progress.phase === "done" || phaseIdx > mine;
                const active = job.progress.phase === key;
                return (
                  <li key={key} className={done ? "done" : active ? "active" : ""}>
                    <span aria-hidden="true">{done ? "✓" : mine}</span>
                    {key === "clips" ? `${label} ${job.progress.clipsDone}/${job.progress.clipsTotal || "–"}` : label}
                  </li>
                );
              })}
            </ol>
            <p className="msg">{job.progress.message} · {job.progress.percent}%</p>
          </div>

          {job.progress.phase === "error" && <p className="error">{job.error || job.progress.message}</p>}

          {job.progress.phase === "done" && (
            <div className="screening">
              <video controls preload="metadata" src={`/api/jobs/${job.id}/download?inline=1`} className={`ar-${aspectRatio.replace(":", "x")}`} />
              <div className="screening-side">
                <h3>That&apos;s a wrap.</h3>
                <p>{job.shotList?.shots.length} shots · {fmt(job.shotList?.totalDurationSeconds ?? 0)} runtime</p>
                <a className="roll small" href={`/api/jobs/${job.id}/download`}>Download MP4</a>
                <button type="button" className="link" onClick={() => { setJob(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Start another take</button>
              </div>
            </div>
          )}

          {(job.shotList || job.script) && (
            <>
              <div className="tabs" role="tablist">
                <button role="tab" aria-selected={tab === "board"} onClick={() => setTab("board")}>Storyboard {job.shotList ? `(${job.shotList.shots.length})` : ""}</button>
                <button role="tab" aria-selected={tab === "script"} onClick={() => setTab("script")}>Script</button>
              </div>

              {tab === "board" && job.shotList && (
                <ol className="board">
                  {job.shotList.shots.map((sh, i) => {
                    const rendered = i < job.progress.clipsDone || job.progress.phase === "done" || job.progress.phase === "stitch";
                    const c = palette[i % (palette.length || 1)] || "#2a2622";
                    return (
                      <li key={sh.id} className={rendered ? "rendered" : ""} style={{ animationDelay: `${Math.min(i, 24) * 30}ms` }}>
                        <div className={`thumb ar-${aspectRatio.replace(":", "x")}`} style={{ background: c }}>
                          <span className="shot-no">{String(sh.index).padStart(2, "0")}</span>
                          <span className="cam">{sh.camera}</span>
                          {rendered && <span className="ok" aria-label="rendered">✓</span>}
                        </div>
                        <p>{sh.description}</p>
                        <small>{sh.durationSeconds}s</small>
                      </li>
                    );
                  })}
                </ol>
              )}

              {tab === "script" && job.script && (
                <div className="screenplay">
                  <p className="bible">
                    <b>Style:</b> {job.script.bible.visualStyle} · <b>Mood:</b> {job.script.bible.mood} · <b>Cast:</b>{" "}
                    {job.script.bible.characters.map((c) => `${c.name} (${c.role})`).join(", ")}
                  </p>
                  {job.script.scenes.map((s) => (
                    <article key={s.id}>
                      <h4>{s.number}. {s.heading.toUpperCase()}</h4>
                      <p className="action">{s.action}</p>
                      {s.dialogue.map((d, i) => (
                        <div className="dialogue" key={i}>
                          <span className="who">{d.character.toUpperCase()}</span>
                          <span>{d.line}</span>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
