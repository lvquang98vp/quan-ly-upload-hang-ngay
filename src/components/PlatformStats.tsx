import type { AccountWithCount, Platform } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/types";

const PLATFORM_DOT: Record<Platform, string> = {
  REDBUBBLE: "bg-orange-500",
  TEEPUBLIC: "bg-teal-500",
};

export default function PlatformStats({ accounts }: { accounts: AccountWithCount[] }) {
  const counts: Record<Platform, number> = {
    REDBUBBLE: accounts.filter((a) => a.platform === "REDBUBBLE").length,
    TEEPUBLIC: accounts.filter((a) => a.platform === "TEEPUBLIC").length,
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(counts) as Platform[]).map((platform) => (
        <div
          key={platform}
          className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900"
        >
          <span className={`h-3 w-3 shrink-0 rounded-full ${PLATFORM_DOT[platform]}`} />
          <div className="min-w-0">
            <p className="text-sm leading-snug text-slate-500 dark:text-slate-400">
              Tài khoản {PLATFORM_LABELS[platform]}
            </p>
            <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{counts[platform]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
