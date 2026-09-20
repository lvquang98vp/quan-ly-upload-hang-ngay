"use client";

import { useRef, useState } from "react";

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
  onSave,
}: {
  accountId: string;
  link: string | null;
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
          className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

  return (
    <button
      type="button"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={link ? "Click để mở, double-click để sửa link" : "Double-click để thêm link"}
      className={
        link
          ? "text-xs font-medium text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
          : "text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      }
    >
      {link ? "Link store" : "+ Thêm link"}
    </button>
  );
}
