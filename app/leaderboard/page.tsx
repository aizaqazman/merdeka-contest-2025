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

async function tryFetch(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");
  return {
    ok: res.ok,
    status: res.status,
    url,
    text,
    ct: res.headers.get("content-type") ?? "",
  };
}

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const base = upstreamBase();
  const token = process.env.LEADERBOARD_API_TOKEN;

  const commonHeaders: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const contestId = 10;
  const probes = [
    // A) POST /contests/{id}/leaderboard with body { segment }
    {
      label: "POST /contests/{id}/leaderboard (body={segment})",
      url: `${base}/contests/${contestId}/leaderboard`,
      init: {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ segment: { limit: 10, offset: 0 } }),
      },
    },
    // B) POST /leaderboard with body { contestId, segment }
    {
      label: "POST /leaderboard (body={contestId,segment})",
      url: `${base}/leaderboard`,
      init: {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify({ contestId, segment: { limit: 10, offset: 0 } }),
      },
    },
    // C) GET /contests/{id}/leaderboard?limit=&offset=  (some APIs do GET with query params)
    {
      label: "GET /contests/{id}/leaderboard?limit&offset",
      url: `${base}/contests/${contestId}/leaderboard?limit=10&offset=0`,
      init: {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    },
  ];

  const results = [];
  for (const p of probes) {
    const r = await tryFetch(p.url, p.init);
    results.push({
      label: p.label,
      status: r.status,
      url: r.url,
      snippet: r.text.slice(0, 300),
    });
    if (r.ok) {
      // parse JSON and return immediately
      try {
        return JSON.parse(r.text) as LeaderboardEntry[];
      } catch {
        throw new Error(
          `Upstream returned OK but body was not JSON. Probe: ${p.label}, URL: ${p.url}`
        );
      }
    }
  }

  const details = results
    .map((r) => `• ${r.label}\n  ${r.status} ${r.url}\n  ${r.snippet}`)
    .join("\n\n");
  throw new Error(`All probes failed.\n\n${details}`);
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
