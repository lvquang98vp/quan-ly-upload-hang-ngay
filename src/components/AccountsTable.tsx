"use client";

import { useMemo, useState } from "react";
import type { AccountWithCount, Platform, UploadEntryView } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/types";
import Countdown from "./Countdown";
import StoreLinkCell from "./StoreLinkCell";

const PLATFORM_BADGE: Record<Platform, string> = {
  REDBUBBLE: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  TEEPUBLIC: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
};

export default function AccountsTable({
  accounts,
  onAddQuantity,
  onAddAccount,
  onDelete,
  onUndo,
  onUpdateStoreLink,
}: {
  accounts: AccountWithCount[];
  onAddQuantity: (id: string, code: string, quantity: number) => Promise<string | null>;
  onAddAccount: (code: string, platform: Platform, storeLink: string) => Promise<string | null>;
  onDelete: (id: string, code: string) => void;
  onUndo: (entryId: string) => void;
  onUpdateStoreLink: (id: string, storeLink: string) => Promise<string | null>;
}) {
  const [search, setSearch] = useState("");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [confirmingEntryId, setConfirmingEntryId] = useState<string | null>(null);

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

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm tài khoản..."
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="whitespace-nowrap px-2 py-2 font-medium">Tài khoản</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Link store</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Nền tảng</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium text-right">Số lượng</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Đếm ngược</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Hoàn tác</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium">Nhập upload mới</th>
              <th className="whitespace-nowrap px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((acc) => {
              const isTeepublic = acc.platform === "TEEPUBLIC";
              // Redbubble always renders as a single aggregate row; the last entry
              // (if any) is only used as the target for the "Hoàn tác" (undo) button.
              const rows: (UploadEntryView | null)[] = isTeepublic
                ? acc.entries.length > 0
                  ? acc.entries
                  : [null]
                : [acc.entries.at(-1) ?? null];
              const rowCount = rows.length;

              return rows.map((entry, i) => (
                <tr key={`${acc.id}-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                  {i === 0 && (
                    <td
                      rowSpan={rowCount}
                      className="px-2 py-2 align-top font-medium text-slate-900 dark:text-slate-100"
                    >
                      {acc.code}
                    </td>
                  )}
                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-2 py-2 align-top">
                      <StoreLinkCell accountId={acc.id} link={acc.storeLink} onSave={onUpdateStoreLink} />
                    </td>
                  )}
                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-2 py-2 align-top">
                      <span
                        className={`inline-block w-24 rounded-full px-2 py-0.5 text-center text-xs font-medium ${PLATFORM_BADGE[acc.platform]}`}
                      >
                        {PLATFORM_LABELS[acc.platform]}
                      </span>
                    </td>
                  )}

                  <td className="px-2 py-2 text-right text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {isTeepublic ? (entry ? entry.quantity : 0) : acc.currentCount}
                  </td>

                  <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                    {entry &&
                      (isTeepublic ? (
                        <Countdown target={entry.dropAt as string} />
                      ) : (
                        <Countdown target={acc.nextResetAt as string} />
                      ))}
                  </td>

                  <td className="relative px-2 py-2">
                    {entry && (
                      <>
                        <button
                          onClick={() => setConfirmingEntryId(entry.id)}
                          className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
                        >
                          Hoàn tác
                        </button>
                        {confirmingEntryId === entry.id && (
                          <div className="absolute left-0 top-full z-10 mt-1 flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-800">
                            <span className="text-slate-600 dark:text-slate-300">Hoàn tác dòng này?</span>
                            <button
                              onClick={() => {
                                onUndo(entry.id);
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
                      </>
                    )}
                  </td>

                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-2 py-2 align-top">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submitQuantity(acc.id, acc.code);
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="number"
                          min={1}
                          value={inputs[acc.id] ?? ""}
                          onChange={(e) =>
                            setInputs((prev) => ({ ...prev, [acc.id]: e.target.value }))
                          }
                          placeholder="SL"
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          disabled={submittingId === acc.id}
                          className="shrink-0 rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                        >
                          Ghi
                        </button>
                      </form>
                      {rowError[acc.id] && <p className="mt-1 text-xs text-red-600">{rowError[acc.id]}</p>}
                    </td>
                  )}

                  {i === 0 && (
                    <td rowSpan={rowCount} className="px-2 py-2 text-right align-top">
                      <button
                        onClick={() => onDelete(acc.id, acc.code)}
                        aria-label={`Xoá ${acc.code}`}
                        className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        Xoá
                      </button>
                    </td>
                  )}
                </tr>
              ));
            })}

            {filteredAccounts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-sm text-slate-400">
                  {accounts.length === 0 ? "Chưa có tài khoản nào." : "Không tìm thấy tài khoản phù hợp."}
                </td>
              </tr>
            )}

            <tr>
              <td className="px-2 py-2" colSpan={3}>
                <form onSubmit={handleAddAccount} className="flex flex-wrap items-center gap-2">
                  <input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Mã tài khoản mới"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    value={newStoreLink}
                    onChange={(e) => setNewStoreLink(e.target.value)}
                    placeholder="Link store (không bắt buộc)"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <select
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value as Platform)}
                    className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="REDBUBBLE">Redbubble</option>
                    <option value="TEEPUBLIC">TeePublic</option>
                  </select>
                  <button
                    type="submit"
                    disabled={addingAccount || !newCode.trim()}
                    className="shrink-0 rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
                  >
                    + Thêm
                  </button>
                </form>
                {newError && <p className="mt-1 text-xs text-red-600">{newError}</p>}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
