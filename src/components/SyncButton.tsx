import { RefreshCw } from "lucide-react";

export default function SyncButton({ onClick, syncing }: { onClick: () => void; syncing: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={syncing}
      title="Đồng bộ tổng số design"
      aria-label="Đồng bộ tổng số design"
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-300"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
    </button>
  );
}
