"use client";

import { useRef, useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import type { Platform } from "@/lib/types";
import { extractStoreUsername } from "@/lib/storeLink";

// Native browsers fire click, click, then dblclick for a double-click, in that
// order — so by the time dblclick tells us it's a double-click, the first click
// has already run. window.open() must happen synchronously inside a genuine
// click handler or the popup blocker kills it (a setTimeout-based debounce
// breaks that), so instead we open on every click that isn't a rapid repeat.
const DOUBLE_CLICK_WINDOW_MS = 400;

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export default function StoreLinkCell({
  accountId,
  link,
  platform,
  onSave,
}: {
  accountId: string;
  link: string | null;
  platform: Platform;
  onSave: (id: string, link: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(link ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastClickAt = useRef(0);

  async function handleSave() {
    const trimmed = value.trim();
    if (trimmed === (link ?? "")) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSave(accountId, trimmed);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") {
              setValue(link ?? "");
              setEditing(false);
            }
          }}
          onBlur={handleSave}
          placeholder="https://..."
          disabled={saving}
          className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  function handleClick() {
    if (!link) return;
    const now = Date.now();
    // Skip the second click of a double-click so it doesn't also open a tab.
    if (now - lastClickAt.current < DOUBLE_CLICK_WINDOW_MS) return;
    lastClickAt.current = now;
    window.open(normalizeUrl(link), "_blank", "noopener,noreferrer");
  }

  function handleDoubleClick() {
    lastClickAt.current = 0;
    setValue(link ?? "");
    setEditing(true);
  }

  const username = link ? extractStoreUsername(link, platform) : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={link ? "Click để mở, double-click để sửa link" : "Double-click để thêm link"}
      className={
        link
          ? "inline-flex min-w-0 items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          : "inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      }
    >
      {link ? (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : (
        <Link2 className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="truncate">{link ? (username ?? "Link store") : "Thêm link"}</span>
    </button>
  );
}
