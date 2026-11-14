// Lets the Peri app's web preview (Expo on localhost:8081) call this Mac's /api routes.
// Only that one local origin is allowed; the phone app doesn't need this (no CORS on native).
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED = new Set(["http://localhost:8081", "http://127.0.0.1:8081"]);

export function middleware(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const allowed = ALLOWED.has(origin);
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: allowed ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      } : {},
    });
  }
  const res = NextResponse.next();
  if (allowed) res.headers.set("Access-Control-Allow-Origin", origin);
  return res;
}

export const config = { matcher: "/api/:path*" };
