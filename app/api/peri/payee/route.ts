import { NextResponse } from "next/server";
import { setPayee } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Remember someone's payment username. Body: { person, venmo?, cashapp?, paypal?, method? }
// Only usernames are stored (no bank or card details); payments are approved in the payment app.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const str = (v: unknown) => v === undefined || typeof v === "string";
  if (!b || typeof b.person !== "string" || !str(b.venmo) || !str(b.cashapp) || !str(b.paypal)
      || (b.method !== undefined && !["venmo", "cashapp", "paypal"].includes(b.method))) {
    return NextResponse.json({ error: "send { person, venmo?, cashapp?, paypal?, method? }" }, { status: 400 });
  }
  return NextResponse.json(await setPayee(b.person, b));
}
