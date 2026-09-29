import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type SyncResult = { code: string; totalDesigns: number | null };

// Receives design counts the browser extension already read from each store
// page (Redbubble and TeePublic both — see extension/). This route only
// persists them; it never fetches either site itself, since both block
// server-side Node requests in practice (see README).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const results: SyncResult[] = Array.isArray(body?.results) ? body.results : [];

  const valid = results.filter(
    (r) => typeof r?.code === "string" && (r.totalDesigns === null || Number.isInteger(r.totalDesigns))
  );

  const now = new Date();
  let updated = 0;
  for (const r of valid) {
    if (r.totalDesigns === null) continue;
    const res = await prisma.account.updateMany({
      where: { code: r.code },
      data: { totalDesigns: r.totalDesigns, totalDesignsSyncedAt: now },
    });
    updated += res.count;
  }

  return NextResponse.json({ ok: true, updated });
}
