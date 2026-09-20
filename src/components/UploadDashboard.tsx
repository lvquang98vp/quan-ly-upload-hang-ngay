"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountWithCount, Platform } from "@/lib/types";
import AccountsTable from "./AccountsTable";

export default function UploadDashboard() {
  const [accounts, setAccounts] = useState<AccountWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error();
      setAccounts(await res.json());
    } catch {
      setError("Không tải được dữ liệu tài khoản.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  async function handleAddAccount(code: string, platform: Platform, storeLink: string): Promise<string | null> {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, platform, storeLink }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Không thêm được tài khoản.";
    await load();
    return null;
  }

  async function handleUpdateStoreLink(id: string, storeLink: string): Promise<string | null> {
    const res = await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeLink }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Không lưu được link.";
    await load();
    return null;
  }

  async function handleAddQuantity(_id: string, code: string, quantity: number): Promise<string | null> {
    const res = await fetch("/api/uploads/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ accountCode: code, quantity }] }),
    });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Không ghi nhận được.";
    await load();
    return null;
  }

  async function handleDelete(id: string, code: string) {
    if (!window.confirm(`Xoá tài khoản "${code}" và toàn bộ dữ liệu upload liên quan?`)) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleUndo(entryId: string) {
    await fetch(`/api/uploads/${entryId}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quản lý Upload Hằng Ngày</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Redbubble &amp; TeePublic</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {accounts === null && !error ? (
        <p className="text-center text-sm text-slate-400">Đang tải...</p>
      ) : (
        <AccountsTable
          accounts={accounts ?? []}
          onAddQuantity={handleAddQuantity}
          onAddAccount={handleAddAccount}
          onDelete={handleDelete}
          onUndo={handleUndo}
          onUpdateStoreLink={handleUpdateStoreLink}
        />
      )}
    </div>
  );
}
