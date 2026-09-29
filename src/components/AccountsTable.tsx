"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Undo2 } from "lucide-react";
import type { AccountWithCount, Platform, UploadEntryView } from "@/lib/types";
import Countdown from "./Countdown";
import StoreLinkCell from "./StoreLinkCell";
import SyncButton from "./SyncButton";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { PlatformBadge } from "./ui/Badge";

type Props = {
  accounts: AccountWithCount[];
  onAddQuantity: (id: string, code: string, quantity: number) => Promise<string | null>;
  onAddAccount: (code: string, platform: Platform, storeLink: string) => Promise<string | null>;
  onDelete: (id: string, code: string) => void;
  onUndo: (entryId: string) => void;
  onUpdateStoreLink: (id: string, storeLink: string) => Promise<string | null>;
  onSyncOne: (id: string) => Promise<string | null>;
};

// Redbubble always shows as a single aggregate row/section; the last entry
// (if any) is only used as the target for the "Hoàn tác" (undo) button.
// TeePublic shows one row per active entry, each with its own countdown.
function rowsFor(acc: AccountWithCount): (UploadEntryView | null)[] {
  if (acc.platform === "TEEPUBLIC") {
    return acc.entries.length > 0 ? acc.entries : [null];
  }
  return [acc.entries.at(-1) ?? null];
}

export default function AccountsTable({
  accounts,
  onAddQuantity,
  onAddAccount,
  onDelete,
  onUndo,
  onUpdateStoreLink,
  onSyncOne,
}: Props) {
  const [search, setSearch] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmingEntryId, setConfirmingEntryId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncRowError, setSyncRowError] = useState<Record<string, string>>({});

  const [newCode, setNewCode] = useState("");
  const [newPlatform, setNewPlatform] = useState<Platform>("REDBUBBLE");
  const [newStoreLink, setNewStoreLink] = useState("");
  const [newError, setNewError] = useState<string | null>(null);
  const [addingAccount, setAddingAccount] = useState(false);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.code.toLowerCase().includes(q));
  }, [accounts, search]);

  async function handleSyncOne(id: string) {
    setSyncingId(id);
    setSyncRowError((prev) => ({ ...prev, [id]: "" }));
    const err = await onSyncOne(id);
    setSyncingId(null);
    setSyncRowError((prev) => ({ ...prev, [id]: err ?? "" }));
  }

  async function submitQuantity(id: string, code: string) {
    const raw = inputs[id];
    const quantity = parseInt(raw ?? "", 10);
    if (!raw || !Number.isInteger(quantity) || quantity <= 0) {
      setRowError((prev) => ({ ...prev, [id]: "Nhập số nguyên dương." }));
      return;
    }
    setSubmittingId(id);
    setRowError((prev) => ({ ...prev, [id]: "" }));
    const err = await onAddQuantity(id, code, quantity);
    setSubmittingId(null);
    if (err) {
      setRowError((prev) => ({ ...prev, [id]: err }));
      return;
    }
    setInputs((prev) => ({ ...prev, [id]: "" }));
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim()) return;
    setAddingAccount(true);
    setNewError(null);
    const err = await onAddAccount(newCode.trim(), newPlatform, newStoreLink.trim());
    setAddingAccount(false);
    if (err) {
      setNewError(err);
      return;
    }
    setNewCode("");
    setNewStoreLink("");
  }

  function StoreCell({ acc }: { acc: AccountWithCount }) {
    return (
      <>
        <div className="flex items-center gap-1">
          <StoreLinkCell accountId={acc.id} link={acc.storeLink} platform={acc.platform} onSave={onUpdateStoreLink} />
          {acc.storeLink && (
            <SyncButton onClick={() => handleSyncOne(acc.id)} syncing={syncingId === acc.id} />
          )}
        </div>
        {acc.totalDesigns !== null && (
          <p
            className="mt-0.5 text-xs text-slate-400 dark:text-slate-500"
            title={
              acc.totalDesignsSyncedAt
                ? `Cập nhật lúc ${new Date(acc.totalDesignsSyncedAt).toLocaleString("vi-VN")}`
                : undefined
            }
          >
            {acc.totalDesigns} design
          </p>
        )}
        {syncRowError[acc.id] && <p className="mt-0.5 text-xs text-red-600">{syncRowError[acc.id]}</p>}
      </>
    );
  }

  function UndoControl({ entryId }: { entryId: string }) {
    return (
      <div className="relative">
        <button
          onClick={() => setConfirmingEntryId(entryId)}
          aria-label="Hoàn tác"
          title="Hoàn tác"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        {confirmingEntryId === entryId && (
          <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <span className="text-slate-600 dark:text-slate-300">Hoàn tác dòng này?</span>
            <button
              onClick={() => {
                onUndo(entryId);
                setConfirmingEntryId(null);
              }}
              className="rounded-md bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
            >
              Có
            </button>
            <button
              onClick={() => setConfirmingEntryId(null)}
              className="rounded-md border border-slate-300 px-2 py-0.5 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            >
              Không
            </button>
          </div>
        )}
      </div>
    );
  }

  function QuantityForm({ acc }: { acc: AccountWithCount }) {
    return (
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuantity(acc.id, acc.code);
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            type="number"
            min={1}
            value={inputs[acc.id] ?? ""}
            onChange={(e) => setInputs((prev) => ({ ...prev, [acc.id]: e.target.value }))}
            placeholder="SL"
            className="w-16 px-2 py-1.5"
          />
          <Button type="submit" variant="primary" size="sm" disabled={submittingId === acc.id}>
            Ghi
          </Button>
        </form>
        {rowError[acc.id] && <p className="mt-1 text-xs text-red-600">{rowError[acc.id]}</p>}
      </div>
    );
  }

  const addAccountForm = (
    <form onSubmit={handleAddAccount} className="flex flex-wrap items-center gap-2">
      <Input
        value={newCode}
        onChange={(e) => setNewCode(e.target.value)}
        placeholder="Mã tài khoản mới"
        className="min-w-0 flex-1 px-2.5 py-1.5"
      />
      <Input
        value={newStoreLink}
        onChange={(e) => setNewStoreLink(e.target.value)}
        placeholder="Link store (không bắt buộc)"
        className="min-w-0 flex-1 px-2.5 py-1.5"
      />
      <select
        value={newPlatform}
        onChange={(e) => setNewPlatform(e.target.value as Platform)}
        className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <option value="REDBUBBLE">Redbubble</option>
        <option value="TEEPUBLIC">TeePublic</option>
      </select>
      <Button type="submit" variant="primary" disabled={addingAccount || !newCode.trim()}>
        <Plus className="h-4 w-4" />
        Thêm
      </Button>
      {newError && <p className="w-full text-xs text-red-600">{newError}</p>}
    </form>
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tài khoản..."
          className="w-full py-2 pl-9 pr-3"
        />
      </div>

      {/* Desktop: table. max-h + overflow-y makes this div itself the sticky
          header's scrolling ancestor — overflow-x-auto alone would force
          overflow-y to compute as "auto" too (per the CSS spec's visible/auto
          interaction) without this div ever actually scrolling vertically,
          which breaks position:sticky (it sticks to a container that never
          scrolls instead of the page). */}
      <div className="hidden max-h-[70vh] overflow-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {["Tài khoản", "Nền tảng", "Số lượng", "Đếm ngược", "Nhập upload mới", ""].map((label, i) => (
                <th
                  key={i}
                  className={`sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-white px-3 py-2 font-medium dark:border-slate-800 dark:bg-slate-900 ${
                    label === "Số lượng" ? "text-right" : ""
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc) => {
              const rows = rowsFor(acc);
              const rowCount = rows.length;

              return rows.map((entry, i) => (
                <tr key={`${acc.id}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-3 py-2.5 align-top">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{acc.code}</p>
                      <StoreCell acc={acc} />
                    </td>
                  )}
                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-3 py-2.5 align-top">
                      <PlatformBadge platform={acc.platform} />
                    </td>
                  )}

                  <td className="px-3 py-2.5 text-right text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {acc.platform === "TEEPUBLIC" ? (entry ? entry.quantity : 0) : acc.currentCount}
                  </td>

                  <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                    {entry &&
                      (acc.platform === "TEEPUBLIC" ? (
                        <Countdown target={entry.dropAt as string} />
                      ) : (
                        <Countdown target={acc.nextResetAt as string} />
                      ))}
                  </td>

                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-3 py-2.5 align-top">
                      <QuantityForm acc={acc} />
                    </td>
                  )}

                  <td className="px-3 py-2.5 text-right align-top">
                    {entry && <UndoControl entryId={entry.id} />}
                  </td>

                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-3 py-2.5 text-right align-top">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(acc.id, acc.code)}
                        aria-label={`Xoá ${acc.code}`}
                        title="Xoá tài khoản"
                        className="hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950 dark:hover:!text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ));
            })}

            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400">
                  {accounts.length === 0 ? "Chưa có tài khoản nào." : "Không tìm thấy tài khoản phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {filteredAccounts.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">
            {accounts.length === 0 ? "Chưa có tài khoản nào." : "Không tìm thấy tài khoản phù hợp."}
          </p>
        )}

        {filteredAccounts.map((acc) => {
          const rows = rowsFor(acc);
          return (
            <div key={acc.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{acc.code}</p>
                    <PlatformBadge platform={acc.platform} />
                  </div>
                  <div className="mt-1">
                    <StoreCell acc={acc} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(acc.id, acc.code)}
                  aria-label={`Xoá ${acc.code}`}
                  title="Xoá tài khoản"
                  className="hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950 dark:hover:!text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {acc.platform === "TEEPUBLIC" ? (entry ? entry.quantity : 0) : acc.currentCount}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {entry &&
                          (acc.platform === "TEEPUBLIC" ? (
                            <Countdown target={entry.dropAt as string} />
                          ) : (
                            <Countdown target={acc.nextResetAt as string} />
                          ))}
                      </p>
                    </div>
                    {entry && <UndoControl entryId={entry.id} />}
                  </div>
                ))}
              </div>

              <div className="mt-2">
                <QuantityForm acc={acc} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">{addAccountForm}</div>
    </section>
  );
}
