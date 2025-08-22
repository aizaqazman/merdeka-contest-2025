// pages/api/leaderboard.ts
import type { NextApiRequest, NextApiResponse } from "next";

const USE_BODY_STYLE = true;

// allow your HTML origin(s)
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ?? "http://127.0.0.1:5501,http://localhost:5501"
).split(",");

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin"); // for caches
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end(); // preflight

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = (req.body ?? {}) as {
      contestId?: number;
      segment?: { limit: number; offset: number };
    };

    if (
      !body.segment ||
      typeof body.segment.limit !== "number" ||
      typeof body.segment.offset !== "number"
    ) {
      return res.status(400).json({
        error:
          "Bad Request: expected { contestId?: number, segment:{limit:number, offset:number} }",
      });
    }
    if (!process.env.LEADERBOARD_API_URL) {
      return res
        .status(500)
        .json({ error: "Server misconfig: LEADERBOARD_API_URL not set" });
    }

    const base = process.env.LEADERBOARD_API_URL.replace(/\/+$/, ""); // strip trailing slash

    const upstreamUrl = USE_BODY_STYLE
      ? `${base}/leaderboard` // POST body: { contestId, segment }
      : `${base}/contests/${body.contestId}/leaderboard`; // POST body: { segment }

    const upstreamBody = USE_BODY_STYLE
      ? JSON.stringify({ contestId: body.contestId, segment: body.segment })
      : JSON.stringify({ segment: body.segment });

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(process.env.LEADERBOARD_API_TOKEN
          ? { Authorization: `Bearer ${process.env.LEADERBOARD_API_TOKEN}` }
          : {}),
        // If your upstream uses a key header instead:
        // ...(process.env.LEADERBOARD_API_TOKEN ? { "X-API-Key": process.env.LEADERBOARD_API_TOKEN } : {}),
      },
      body: upstreamBody,
    });

    const text = await upstream.text();
    return res
      .status(upstream.status)
      .setHeader(
        "Content-Type",
        upstream.headers.get("Content-Type") ?? "application/json"
      )
      .send(text);
  } catch (err: any) {
    return res
      .status(502)
      .json({ error: "Proxy failed", message: err?.message ?? String(err) });
  }
}
