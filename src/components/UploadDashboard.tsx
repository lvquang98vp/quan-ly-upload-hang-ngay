"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountWithCount, Platform, UploadEntryView } from "@/lib/types";
import { Loader2, RefreshCw, Square } from "lucide-react";
import { isExtensionAvailable, stopSyncViaExtension, syncStoresViaExtension } from "@/lib/extensionBridge";
import AccountsTable from "./AccountsTable";
import PlatformStats from "./PlatformStats";
import Button from "./ui/Button";

export default function UploadDashboard() {
  const [accounts, setAccounts] = useState<AccountWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

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

  async function handleAddQuantity(id: string, code: string, quantity: number): Promise<string | null> {
    // Update the number on screen immediately instead of waiting on the
    // create-then-refetch round trip to Neon; reconcile with the server in
    // the background afterward.
    const now = new Date();
    setAccounts(
      (prev) =>
        prev?.map((acc) => {
          if (acc.id !== id) return acc;
          const optimisticEntry: UploadEntryView = {
            id: `optimistic-${now.getTime()}`,
            quantity,
            uploadedAt: now.toISOString(),
            dropAt: acc.platform === "TEEPUBLIC" ? new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
          };
          return {
            ...acc,
            currentCount: acc.currentCount + quantity,
            entries: [...acc.entries, optimisticEntry],
          };
        }) ?? prev
    );

    const res = await fetch("/api/uploads/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ accountCode: code, quantity }] }),
    });
    const data = await res.json();
    if (!res.ok) {
      await load(); // roll back the optimistic guess
      return data.error ?? "Không ghi nhận được.";
    }
    load(); // reconcile with the real entry id/timestamp in the background
    return null;
  }

  async function handleDelete(id: string, code: string) {
    if (!window.confirm(`Xoá tài khoản "${code}" và toàn bộ dữ liệu upload liên quan?`)) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await load();
  }

  async function handleUndo(entryId: string) {
    setAccounts(
      (prev) =>
        prev?.map((acc) => {
          const removed = acc.entries.find((e) => e.id === entryId);
          if (!removed) return acc;
          return {
            ...acc,
            currentCount: acc.currentCount - removed.quantity,
            entries: acc.entries.filter((e) => e.id !== entryId),
          };
        }) ?? prev
    );

    await fetch(`/api/uploads/${entryId}`, { method: "DELETE" });
    load();
  }

  async function syncStores(stores: { code: string; storeLink: string; platform: Platform }[]): Promise<string | null> {
    if (stores.length === 0) return "Chưa có tài khoản nào có link store để đồng bộ.";
    if (!isExtensionAvailable()) return "Chưa cài extension đồng bộ — xem hướng dẫn trong thư mục extension/.";

    const results = await syncStoresViaExtension(stores);
    await fetch("/api/sync/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results }),
    });
    return null;
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const stores = (accounts ?? [])
        .filter((a) => a.storeLink)
        .map((a) => ({ code: a.code, storeLink: a.storeLink as string, platform: a.platform }));
      const err = await syncStores(stores);
      if (err) setSyncMessage(err);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Đồng bộ thất bại.");
    } finally {
      await load();
      setSyncing(false);
    }
  }

  async function handleStopSync() {
    const { ok, error } = await stopSyncViaExtension();
    if (!ok && error) setSyncMessage(error);
  }

  async function handleSyncOne(id: string): Promise<string | null> {
    const acc = (accounts ?? []).find((a) => a.id === id);
    if (!acc?.storeLink) return "Tài khoản chưa có link store.";
    try {
      const err = await syncStores([{ code: acc.code, storeLink: acc.storeLink, platform: acc.platform }]);
      return err;
    } catch (err) {
      return err instanceof Error ? err.message : "Đồng bộ thất bại.";
    } finally {
      await load();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Quản lý Upload Hằng Ngày</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Redbubble &amp; TeePublic</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="primary" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Đang đồng bộ..." : "Đồng bộ"}
          </Button>
          {syncing && (
            <Button
              variant="secondary"
              onClick={handleStopSync}
              className="!border-red-300 !text-red-600 hover:!bg-red-50 dark:!border-red-800 dark:hover:!bg-red-950"
            >
              <Square className="h-4 w-4" />
              Dừng
            </Button>
          )}
        </div>
      </header>

      {syncMessage && <p className="text-sm text-slate-500 dark:text-slate-400">{syncMessage}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {accounts === null && !error ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải...
        </div>
      ) : (
        <>
          <PlatformStats accounts={accounts ?? []} />
          <AccountsTable
            accounts={accounts ?? []}
            onAddQuantity={handleAddQuantity}
            onAddAccount={handleAddAccount}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onUpdateStoreLink={handleUpdateStoreLink}
            onSyncOne={handleSyncOne}
          />
        </>
      )}
    </div>
  );
}
