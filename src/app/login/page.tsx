"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Đăng nhập thất bại.");
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Quản lý Upload Hằng Ngày
        </h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">Nhập mật khẩu để tiếp tục.</p>
        <Input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="mb-3 w-full text-base"
        />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <Button type="submit" variant="primary" size="md" disabled={loading} className="w-full">
          {loading ? "Đang kiểm tra..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  );
}
