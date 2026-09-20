import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ConfirmItem = { accountCode: string; quantity: number };

// Entries older than 48h are never read by either platform's window logic,
// so cleanup is pure storage hygiene, not correctness-critical. Only run it
// occasionally here (the write path) instead of on every GET /api/accounts,
// which is by far the hottest endpoint.
const RETENTION_MS = 48 * 60 * 60 * 1000;
const CLEANUP_PROBABILITY = 0.05;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const items: ConfirmItem[] = Array.isArray(body?.items) ? body.items : [];

  const valid = items.filter(
    (i) => typeof i?.accountCode === "string" && Number.isInteger(i?.quantity) && i.quantity > 0
  );
  if (valid.length === 0) {
    return NextResponse.json({ error: "Không có mục hợp lệ để lưu." }, { status: 400 });
  }

  const codes = [...new Set(valid.map((i) => i.accountCode))];
  const accounts = await prisma.account.findMany({ where: { code: { in: codes } } });
  const byCode = new Map(accounts.map((a) => [a.code, a]));

  const missing = codes.filter((c) => !byCode.has(c));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Không tìm thấy tài khoản: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const now = new Date();
  await prisma.uploadEntry.createMany({
    data: valid.map((i) => ({
      accountId: byCode.get(i.accountCode)!.id,
      quantity: i.quantity,
      uploadedAt: now,
    })),
  });

  if (Math.random() < CLEANUP_PROBABILITY) {
    await prisma.uploadEntry.deleteMany({
      where: { uploadedAt: { lt: new Date(now.getTime() - RETENTION_MS) } },
    });
  }

  return NextResponse.json({ ok: true, count: valid.length });
}
