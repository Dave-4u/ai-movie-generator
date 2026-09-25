import MovieGenerator from "@/components/MovieGenerator";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#2e1065_0%,_#09090b_55%)]">
      <MovieGenerator />
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-center text-xs text-zinc-600">
        Default path needs no paid API keys. Install ffmpeg. Optional: espeak for
        TTS, Ollama for LLM scripts, VIDEO_MODEL_URL for self-hosted video.
      </footer>
    </main>
  );
}
