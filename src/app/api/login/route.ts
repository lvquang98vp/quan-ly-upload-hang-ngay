import { NextResponse } from "next/server";
import { AUTH_COOKIE, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json({ ok: true });
  }
  if (password !== expected) {
    return NextResponse.json({ error: "Sai mật khẩu." }, { status: 401 });
  }

  const value = await hashPassword(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
