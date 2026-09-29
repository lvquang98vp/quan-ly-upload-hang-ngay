import { Store } from "lucide-react";
import type { AccountWithCount, Platform } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/types";

const PLATFORM_ICON_BG: Record<Platform, string> = {
  REDBUBBLE: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  TEEPUBLIC: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400",
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
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${PLATFORM_ICON_BG[platform]}`}>
            <Store className="h-[18px] w-[18px]" />
          </span>
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
