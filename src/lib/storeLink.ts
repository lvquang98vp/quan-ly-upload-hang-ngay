import type { Platform } from "@/lib/types";

// Redbubble store links look like .../people/<username>/shop, TeePublic's
// like .../user/<username>. Used to show the actual username in the table
// instead of a generic "Link store" label.
const USERNAME_PATTERN: Record<Platform, RegExp> = {
  REDBUBBLE: /\/people\/([^/?#]+)/i,
  TEEPUBLIC: /\/user\/([^/?#]+)/i,
};

export function extractStoreUsername(link: string, platform: Platform): string | null {
  const match = USERNAME_PATTERN[platform].exec(link);
  return match ? decodeURIComponent(match[1]) : null;
}
