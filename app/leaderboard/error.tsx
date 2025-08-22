"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1>Failed to load leaderboard</h1>
      <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12 }}>
        {error.message}
      </pre>
      <button onClick={reset} style={{ marginTop: 12 }}>
        Retry
      </button>
    </main>
  );
}
