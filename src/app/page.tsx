import MovieGenerator from "@/components/MovieGenerator";

export default function Home() {
  return (
    <main className="page">
      <MovieGenerator />
      <footer className="foot">
        <p>
          The default pipeline needs no paid API keys, only <b>ffmpeg</b>. Optional extras: <b>espeak-ng</b> for narration,{" "}
          <b>Ollama</b> (<code>OLLAMA_URL</code>) for LLM scripts, and <code>VIDEO_MODEL_URL</code> for a self-hosted video model.
        </p>
        <p>
          Built by <a href="https://dave-4u.github.io/">Dave Adegboro</a> ·{" "}
          <a href="https://github.com/Dave-4u/ai-movie-generator">source</a>
        </p>
      </footer>
    </main>
  );
}
