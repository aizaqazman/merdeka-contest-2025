import React from "react";

type LeaderboardEntry = {
  login: number;
  fullName: string;
  country: string;
  performance: number;
  nickname: string | null;
};

// Build base once and validate
function upstreamBase() {
  const base = (process.env.LEADERBOARD_API_URL ?? "").replace(/\/+$/, "");
  if (!base) throw new Error("LEADERBOARD_API_URL not set");
  return base;
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const base = upstreamBase();
  const token = process.env.LEADERBOARD_API_TOKEN;

  const contestId = 10;  //tukar sini jugak
  const url = `${base}/leaderboard`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ contestId, segment: { limit: 10, offset: 0 } }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch leaderboard: ${res.status} ${text}`);
  }

  return res.json();
}

export default async function LeaderboardPage() {
  const entries: LeaderboardEntry[] = await getLeaderboard();

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: "bold", textAlign: "center" }}>
        Merdeka Contest Leaderboard
      </h1>
      <table
        border={1}
        cellPadding={8}
        style={{ width: "100%", marginTop: 16 }}
      >
        <thead>
          <tr>
            <th>Rank</th>
            <th>Full Name</th>
            <th>Country</th>
            <th>Login</th>
            <th>Performance</th>
            <th>Nickname</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={e.login}>
              <td>#{i + 1}</td>
              <td>{e.fullName}</td>
              <td>{e.country}</td>
              <td>{e.login}</td>
              <td>{Number(e.performance).toFixed(0) + "%"}</td>
              <td>{e.nickname ?? "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
