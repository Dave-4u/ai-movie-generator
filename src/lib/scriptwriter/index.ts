import { buildStyleBible } from "../bible";
import type { MovieScript, ScriptScene } from "../types";

const ACT_BEATS = [
  {
    heading: "OPENING IMAGE",
    action:
      "We meet the world and the protagonist in a single clear visual. Something is off — a question hanging in the air.",
  },
  {
    heading: "INCITING INCIDENT",
    action:
      "A disruption forces a choice. The ordinary day ends. Stakes become personal.",
  },
  {
    heading: "FIRST TURN",
    action:
      "The protagonist commits. Allies appear. The destination is named, even if the path is not.",
  },
  {
    heading: "MIDPOINT REVERSAL",
    action:
      "New information flips the board. What they thought they wanted is not what they need.",
  },
  {
    heading: "LOW POINT",
    action:
      "Plans fail. Trust frays. The cost of continuing is clearer than ever.",
  },
  {
    heading: "CLIMAX",
    action:
      "Confrontation. The central conflict resolves through action, not speech alone.",
  },
  {
    heading: "RESOLUTION",
    action:
      "A quieter beat. The world has changed — or the protagonist has. Leave one image that sticks.",
  },
];

function titleFromSynopsis(synopsis: string): string {
  const cleaned = synopsis.replace(/\s+/g, " ").trim();
  const first = cleaned.split(/[.!?]/)[0] ?? cleaned;
  const words = first.split(" ").filter(Boolean).slice(0, 6);
  if (words.length === 0) return "Untitled Short";
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function loglineFromSynopsis(synopsis: string, title: string): string {
  const one = synopsis.replace(/\s+/g, " ").trim().slice(0, 180);
  return `${title}: ${one}${synopsis.length > 180 ? "…" : ""}`;
}

function sceneDialogue(
  characters: { name: string }[],
  beatIndex: number,
  synopsisSnippet: string
): { character: string; line: string }[] {
  const a = characters[0]?.name ?? "Alex";
  const b = characters[1]?.name ?? "Sam";
  const templates: { character: string; line: string }[][] = [
    [
      { character: a, line: "This is where it starts. I can feel it." },
      { character: b, line: "Then we don't look away." },
    ],
    [
      { character: b, line: "You can't ignore that. Not after what we just saw." },
      { character: a, line: "I won't. Tell me what you need." },
    ],
    [
      { character: a, line: "If we go, there's no coming back the same." },
      { character: b, line: "Good. Same was never enough." },
    ],
    [
      { character: b, line: "That changes everything we planned." },
      { character: a, line: "Then we plan again — faster." },
    ],
    [
      { character: a, line: "I thought I could carry this alone." },
      { character: b, line: "You don't have to. Not tonight." },
    ],
    [
      { character: a, line: "This is it. No more waiting." },
      { character: b, line: "Then finish it. I'll be right behind you." },
    ],
    [
      { character: a, line: "It's over. Or maybe… it's just quieter now." },
      { character: b, line: "Quiet is a kind of ending. Let's keep it." },
    ],
  ];
  const base = templates[beatIndex % templates.length] ?? templates[0];
  // Lightly inject synopsis words into first line for flavor
  const hook = synopsisSnippet.split(" ").slice(0, 4).join(" ");
  if (hook && base[0]) {
    return [
      {
        character: base[0].character,
        line: `${base[0].line} (${hook}…)`,
      },
      ...base.slice(1),
    ];
  }
  return base;
}

/**
 * Offline script generator: expands a synopsis into a structured multi-scene script.
 * Optionally tries Ollama if OLLAMA_URL is set and reachable; falls back to templates.
 */
export async function generateScript(
  synopsis: string,
  targetDurationSeconds: number
): Promise<MovieScript> {
  const trimmed = synopsis.trim();
  if (!trimmed) {
    throw new Error("Synopsis is required");
  }

  const ollama = await tryOllamaScript(trimmed, targetDurationSeconds);
  if (ollama) return ollama;

  return templateScript(trimmed, targetDurationSeconds);
}

async function tryOllamaScript(
  synopsis: string,
  targetDurationSeconds: number
): Promise<MovieScript | null> {
  const base = process.env.OLLAMA_URL;
  if (!base) return null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${base.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "llama3.2",
        stream: false,
        prompt: `Write a short film outline as JSON with keys title, logline, scenes (array of {heading, action, dialogue:[{character,line}]}). Target ~${Math.round(targetDurationSeconds / 60)} minutes. Synopsis: ${synopsis}`,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    if (!data.response) return null;
    // Prefer template if parse fails — keep MVP reliable
    const parsed = JSON.parse(
      data.response.replace(/```json|```/g, "").trim()
    ) as Partial<MovieScript>;
    if (!parsed.scenes?.length) return null;
    const bible = buildStyleBible(synopsis);
    const scenes: ScriptScene[] = parsed.scenes.map((s, i) => ({
      id: `scene-${i + 1}`,
      number: i + 1,
      heading: s.heading || `SCENE ${i + 1}`,
      action: s.action || "",
      dialogue: s.dialogue || [],
      estimatedSeconds: 0,
    }));
    distributeSceneTiming(scenes, targetDurationSeconds);
    return {
      title: parsed.title || titleFromSynopsis(synopsis),
      logline: parsed.logline || loglineFromSynopsis(synopsis, parsed.title || "Film"),
      synopsis,
      scenes,
      bible,
    };
  } catch {
    return null;
  }
}

function distributeSceneTiming(
  scenes: ScriptScene[],
  targetDurationSeconds: number
): void {
  const n = Math.max(scenes.length, 1);
  // Slightly weight climax/resolution
  const weights = scenes.map((_, i) => {
    const t = i / Math.max(n - 1, 1);
    if (t < 0.15) return 1.1;
    if (t > 0.75 && t < 0.92) return 1.35;
    if (t >= 0.92) return 0.9;
    return 1;
  });
  const sumW = weights.reduce((a, b) => a + b, 0);
  let assigned = 0;
  scenes.forEach((scene, i) => {
    if (i === scenes.length - 1) {
      scene.estimatedSeconds = Math.max(4, targetDurationSeconds - assigned);
    } else {
      const sec = Math.max(
        4,
        Math.round((weights[i] / sumW) * targetDurationSeconds)
      );
      scene.estimatedSeconds = sec;
      assigned += sec;
    }
  });
}

export function templateScript(
  synopsis: string,
  targetDurationSeconds: number
): MovieScript {
  const bible = buildStyleBible(synopsis);
  const title = titleFromSynopsis(synopsis);
  const logline = loglineFromSynopsis(synopsis, title);

  // Scale beat count with duration: ~1 beat per 45–90s, clamp 3–12
  const idealBeats = Math.round(targetDurationSeconds / 60);
  const beatCount = Math.min(
    ACT_BEATS.length,
    Math.max(3, Math.min(7, idealBeats || 3))
  );
  const beats = ACT_BEATS.slice(0, beatCount);

  const snippet = synopsis.slice(0, 120);
  const scenes: ScriptScene[] = beats.map((beat, i) => ({
    id: `scene-${i + 1}`,
    number: i + 1,
    heading: `INT./EXT. ${beat.heading} — DAY`,
    action: `${beat.action} Context from the idea: ${snippet}${synopsis.length > 120 ? "…" : ""} Characters in frame: ${bible.characters.map((c) => c.name).join(", ")}. Style note: ${bible.visualStyle}.`,
    dialogue: sceneDialogue(bible.characters, i, synopsis),
    estimatedSeconds: 0,
  }));

  distributeSceneTiming(scenes, targetDurationSeconds);

  return { title, logline, synopsis, scenes, bible };
}
