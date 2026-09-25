import type { Character, StyleBible } from "../types";

const PALETTES = [
  ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  ["#0d1b2a", "#1b263b", "#415a77", "#778da9"],
  ["#2d132c", "#801336", "#c72c41", "#ee4540"],
  ["#0b132b", "#1c2541", "#3a506b", "#5bc0be"],
  ["#1b4332", "#2d6a4f", "#40916c", "#95d5b2"],
  ["#3d0c11", "#6b1d1d", "#a23b3b", "#d4a373"],
];

const STYLES = [
  "cinematic neo-noir with soft volumetric lighting",
  "warm indie drama, natural window light, shallow depth of field",
  "stylized animated look with bold flat colors and soft gradients",
  "documentary realism, handheld energy, available light",
  "dreamy fantasy, golden hour haze, gentle lens flares",
  "crisp sci-fi, cool teal shadows and amber highlights",
];

const MOODS = [
  "hopeful yet tense",
  "melancholic and intimate",
  "adventurous and bright",
  "mysterious and quiet",
  "urgent and kinetic",
  "whimsical and curious",
];

const CAMERAS = [
  "medium coverage with occasional push-ins; avoid jump cuts",
  "wide establishing then tighter OTS for dialogue",
  "steady tripod with slow pans; preserve continuity",
  "motivated tracking shots following the protagonist",
];

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[(seed + salt) % arr.length];
}

/** Extract likely character names from a synopsis (capitalized words / "Name," patterns). */
export function extractCharacters(synopsis: string): Character[] {
  const names = new Set<string>();
  const patterns = [
    /\b([A-Z][a-z]+)\s+(?:is|was|finds|discovers|meets|faces|helps|saves|loves|fears)\b/g,
    /\b(?:named|called)\s+([A-Z][a-z]+)\b/g,
    /\b([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\b/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(synopsis)) !== null) {
      for (let i = 1; i < m.length; i++) {
        if (m[i] && m[i].length > 2) names.add(m[i]);
      }
    }
  }

  // Fallback generic cast if nothing found
  const list = [...names].slice(0, 4);
  if (list.length === 0) {
    list.push("Alex", "Jordan");
  }
  if (list.length === 1) {
    list.push("Sam");
  }

  const roles = ["protagonist", "ally", "antagonist", "mentor"];
  return list.map((name, i) => ({
    name,
    role: roles[i] ?? "supporting",
    description:
      i === 0
        ? `${name}, the story's central figure — determined, flawed, and watchable`
        : `${name}, ${roles[i] ?? "supporting"} — distinctive silhouette and clear motivation`,
  }));
}

export function buildStyleBible(synopsis: string): StyleBible {
  const seed = hashSeed(synopsis.toLowerCase());
  return {
    visualStyle: pick(STYLES, seed, 1),
    colorPalette: pick(PALETTES, seed, 3),
    mood: pick(MOODS, seed, 5),
    cameraLanguage: pick(CAMERAS, seed, 7),
    characters: extractCharacters(synopsis),
  };
}

export function biblePromptBlock(bible: StyleBible): string {
  const chars = bible.characters
    .map((c) => `${c.name} (${c.role}): ${c.description}`)
    .join("; ");
  return [
    `Style: ${bible.visualStyle}.`,
    `Mood: ${bible.mood}.`,
    `Palette: ${bible.colorPalette.join(", ")}.`,
    `Camera: ${bible.cameraLanguage}.`,
    `Cast: ${chars}.`,
  ].join(" ");
}
