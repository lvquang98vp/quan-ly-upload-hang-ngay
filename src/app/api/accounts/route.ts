import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPlatform, type AccountWithCount, type Platform } from "@/lib/types";
import {
  getRedbubbleResetBoundary,
  getNextRedbubbleReset,
  getTeepublicWindowStart,
} from "@/lib/timezone";

export async function GET() {
  const now = new Date();

  const accounts = await prisma.account.findMany({
    include: { entries: true },
    orderBy: { code: "asc" },
  });

  const rbBoundary = getRedbubbleResetBoundary(now);
  const nextRbReset = getNextRedbubbleReset(now);
  const tpWindowStart = getTeepublicWindowStart(now);

  const result: AccountWithCount[] = accounts.map((acc) => {
    const platform = acc.platform as Platform;

    if (platform === "REDBUBBLE") {
      const active = acc.entries
        .filter((e) => e.uploadedAt >= rbBoundary)
        .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
      const currentCount = active.reduce((sum, e) => sum + e.quantity, 0);
      return {
        id: acc.id,
        code: acc.code,
        platform,
        storeLink: acc.storeLink,
        createdAt: acc.createdAt.toISOString(),
        currentCount,
        nextResetAt: nextRbReset.toISOString(),
        entries: active.map((e) => ({
          id: e.id,
          quantity: e.quantity,
          uploadedAt: e.uploadedAt.toISOString(),
          dropAt: null,
        })),
      };
    }

    const inWindow = acc.entries
      .filter((e) => e.uploadedAt >= tpWindowStart)
      .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
    const currentCount = inWindow.reduce((sum, e) => sum + e.quantity, 0);

    return {
      id: acc.id,
      code: acc.code,
      platform,
      storeLink: acc.storeLink,
      createdAt: acc.createdAt.toISOString(),
      currentCount,
      nextResetAt: null,
      entries: inWindow.map((e) => ({
        id: e.id,
        quantity: e.quantity,
        uploadedAt: e.uploadedAt.toISOString(),
        dropAt: new Date(e.uploadedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      })),
    };
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.toUpperCase() : "";
  const storeLink = typeof body?.storeLink === "string" ? body.storeLink.trim() || null : null;

  if (!code) {
    return NextResponse.json({ error: "Thiếu mã tài khoản." }, { status: 400 });
  }
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Nền tảng không hợp lệ." }, { status: 400 });
  }

  const existing = await prisma.account.findUnique({ where: { code } });
  if (existing) {
    return NextResponse.json({ error: `Mã tài khoản "${code}" đã tồn tại.` }, { status: 409 });
  }

  const account = await prisma.account.create({ data: { code, platform, storeLink } });
  return NextResponse.json(account, { status: 201 });
}
