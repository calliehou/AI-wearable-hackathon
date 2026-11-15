import { NextResponse } from "next/server";
import { setPayee } from "@/lib/peri";

export const dynamic = "force-dynamic";

// Remember how to find someone on Venmo. Body: { person, venmo?, cashapp?, paypal?, method? }
// venmo is their username, phone number or email. No bank or card details are ever stored;
// payments are approved in the payment app.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const str = (v: unknown) => v === undefined || typeof v === "string";
  if (!b || typeof b.person !== "string" || !str(b.venmo) || !str(b.cashapp) || !str(b.paypal)
      || (b.method !== undefined && !["venmo", "cashapp", "paypal"].includes(b.method))) {
    return NextResponse.json({ error: "send { person, venmo?, cashapp?, paypal?, method? }" }, { status: 400 });
  }
  return NextResponse.json(await setPayee(b.person, b));
}
