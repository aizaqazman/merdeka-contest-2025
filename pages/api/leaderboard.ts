// pages/api/leaderboard.ts
import type { NextApiRequest, NextApiResponse } from "next";

const USE_BODY_STYLE = true; // true => POST /leaderboard with { contestId, segment }

// === Load & validate origins from env (MUST be set in Heroku) ===
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  throw new Error(
    "[leaderboard] ALLOWED_ORIGINS must be set in environment"
  );
}

const UPSTREAM_BASE = (process.env.LEADERBOARD_API_URL ?? "").replace(/\/+$/, "");
if (!UPSTREAM_BASE) {
  throw new Error("[leaderboard] LEADERBOARD_API_URL must be set in environment");
}

function setCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    res.setHeader("Access-Control-Max-Age", "600");
    return true;
  }
  res.status(403).json({ error: "Origin not allowed" });
  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!setCors(req, res)) return;

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST,OPTIONS");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const body = (req.body ?? {}) as {
      contestId?: number;
      segment?: { limit: number; offset: number };
    };

    if (
      !body.segment ||
      typeof body.segment.limit !== "number" ||
      typeof body.segment.offset !== "number" ||
      (USE_BODY_STYLE && typeof body.contestId !== "number")
    ) {
      res.status(400).json({
        error:
          "Bad Request: expected { contestId?: number, segment:{limit:number, offset:number} }",
      });
      return;
    }

    const upstreamUrl = USE_BODY_STYLE
      ? `${UPSTREAM_BASE}/leaderboard`
      : `${UPSTREAM_BASE}/contests/${body.contestId}/leaderboard`;

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
      },
      body: upstreamBody,
    });

    const text = await upstream.text();
    res
      .status(upstream.status)
      .setHeader(
        "Content-Type",
        upstream.headers.get("Content-Type") ?? "application/json"
      )
      .send(text);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err);
    console.error("[leaderboard] proxy error:", message);
    res.status(502).json({ error: "Proxy failed", message });
  }
}
