// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Home</h1>
      <p><Link href="/leaderboard">Go to Leaderboard</Link></p>
    </main>
  );
}