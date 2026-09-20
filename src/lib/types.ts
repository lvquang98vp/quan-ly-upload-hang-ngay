export const PLATFORMS = ["REDBUBBLE", "TEEPUBLIC"] as const;
export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  REDBUBBLE: "Redbubble",
  TEEPUBLIC: "TeePublic",
};

export type UploadEntryView = {
  id: string;
  quantity: number;
  uploadedAt: string;
  /** ISO timestamp this entry drops out of the 24h TeePublic window. Null for Redbubble. */
  dropAt: string | null;
};

export type AccountWithCount = {
  id: string;
  code: string;
  platform: Platform;
  storeLink: string | null;
  createdAt: string;
  /** Sum of `entries` quantities (the active window for this platform). */
  currentCount: number;
  /** ISO timestamp of the next Redbubble reset (14:00 VN). Null for TeePublic. */
  nextResetAt: string | null;
  /** Entries still counted in the current window, oldest first. */
  entries: UploadEntryView[];
};
