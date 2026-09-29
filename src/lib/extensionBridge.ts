// Bridges the web app to the companion browser extension (see extension/)
// that reads design counts from the user's own browser for BOTH platforms —
// server-side requests get blocked by both Redbubble and TeePublic in
// practice (confirmed by hand, see README), so this is the only reliable
// path. Chrome isn't typed here on purpose — this is the one place in the
// app that talks to an untyped external API surface, kept intentionally
// narrow.

import type { Platform } from "@/lib/types";

export type SyncStore = { code: string; storeLink: string; platform: Platform };
export type SyncResult = { code: string; totalDesigns: number | null };

type ChromeRuntimeLike = {
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void;
  lastError?: { message?: string };
};

function getChromeRuntime(): ChromeRuntimeLike | null {
  if (typeof window === "undefined") return null;
  const chromeGlobal = (window as unknown as { chrome?: { runtime?: unknown } }).chrome;
  const runtime = chromeGlobal?.runtime as ChromeRuntimeLike | undefined;
  return runtime?.sendMessage ? runtime : null;
}

export function isExtensionAvailable(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SYNC_EXTENSION_ID) && getChromeRuntime() !== null;
}

export function syncStoresViaExtension(stores: SyncStore[]): Promise<SyncResult[]> {
  return new Promise((resolve, reject) => {
    const extensionId = process.env.NEXT_PUBLIC_SYNC_EXTENSION_ID;
    const runtime = getChromeRuntime();
    if (!extensionId || !runtime) {
      reject(new Error("Chưa cài extension đồng bộ."));
      return;
    }
    runtime.sendMessage(extensionId, { type: "SYNC_STORES", stores }, (response: unknown) => {
      if (runtime.lastError) {
        reject(new Error(runtime.lastError.message ?? "Không kết nối được extension."));
        return;
      }
      const results = (response as { results?: unknown } | undefined)?.results;
      if (!Array.isArray(results)) {
        reject(new Error("Extension trả về dữ liệu không hợp lệ."));
        return;
      }
      resolve(results as SyncResult[]);
    });
  });
}

// Tells the extension to stop opening any further stores. The original
// syncStoresViaExtension() call still resolves normally once the extension
// responds with whatever it collected before stopping. Reports failure
// instead of silently doing nothing — a stale/unreloaded extension (missing
// the STOP_SYNC handler) is a real, previously-seen failure mode here.
export function stopSyncViaExtension(): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const extensionId = process.env.NEXT_PUBLIC_SYNC_EXTENSION_ID;
    const runtime = getChromeRuntime();
    if (!extensionId || !runtime) {
      resolve({ ok: false, error: "Chưa cài extension đồng bộ." });
      return;
    }
    runtime.sendMessage(extensionId, { type: "STOP_SYNC" }, (response: unknown) => {
      if (runtime.lastError) {
        resolve({ ok: false, error: runtime.lastError.message ?? "Không kết nối được extension." });
        return;
      }
      const ok = (response as { ok?: unknown } | undefined)?.ok === true;
      resolve({
        ok,
        error: ok ? undefined : "Extension không phản hồi đúng — thử tải lại extension ở chrome://extensions.",
      });
    });
  });
}
