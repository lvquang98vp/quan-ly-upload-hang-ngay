import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.account.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (typeof body?.storeLink !== "string" && body?.storeLink !== null) {
    return NextResponse.json({ error: "Thiếu link." }, { status: 400 });
  }
  const storeLink = typeof body.storeLink === "string" ? body.storeLink.trim() || null : null;

  const account = await prisma.account.update({ where: { id }, data: { storeLink } }).catch(() => null);
  if (!account) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản." }, { status: 404 });
  }
  return NextResponse.json(account);
}
