import type { Platform } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/types";

const PLATFORM_CLASSES: Record<Platform, string> = {
  REDBUBBLE: "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-400/20",
  TEEPUBLIC: "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-400/20",
};

export function PlatformBadge({ platform }: { platform: Platform }) {
  return (
    <span
      className={`inline-flex w-[92px] items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${PLATFORM_CLASSES[platform]}`}
    >
      {PLATFORM_LABELS[platform]}
    </span>
  );
}
