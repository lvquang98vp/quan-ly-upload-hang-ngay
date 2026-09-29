// Runs entirely in the background: opens each store (Redbubble or TeePublic)
// in a hidden (inactive) tab one at a time, reads the design count already
// server-rendered on the page, closes the tab, and moves to the next store.
// One tab at a time (not parallel) so this looks like ordinary sequential
// browsing rather than a burst of requests — both platforms block
// server-side requests outright, but are fine with a real browser visiting
// pages one by one (confirmed by hand, see the main README).

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 25; // ~25s ceiling per store
const DELAY_BETWEEN_STORES_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Injected into the page — must be self-contained (no closure references).
// Redbubble renders "<n> items" near the shop's result count; TeePublic
// renders "Designs <n>" in the profile tab. Also returns a snippet of text
// around the nearest "design"/"item" mention so a failed match can be
// diagnosed from the console instead of just silently returning null.
function extractDesignCount(platform) {
  const text = document.body ? document.body.innerText : "";
  const pattern = platform === "REDBUBBLE" ? /(\d[\d,]*)\s*items?/i : /designs?\s*([\d,]+)/i;
  const match = pattern.exec(text);
  if (match) {
    const n = parseInt(match[1].replace(/,/g, ""), 10);
    if (Number.isFinite(n)) return { totalDesigns: n, debugSnippet: null };
  }
  const hintPattern = platform === "REDBUBBLE" ? /item/i : /design/i;
  const hintIndex = text.search(hintPattern);
  const debugSnippet = hintIndex >= 0 ? text.slice(Math.max(0, hintIndex - 40), hintIndex + 60) : null;
  return { totalDesigns: null, debugSnippet };
}

// Waits for the design count to actually show up in the tab's content,
// polling repeatedly instead of relying on the tab's "complete" lifecycle
// event — background (inactive) tabs get throttled by Chrome when the
// window isn't focused, so "complete" can take far longer than expected
// or, in a fair number of cases, never fire within a short deadline at all
// (confirmed by hand: TeePublic timed out on every single account, and
// Redbubble on a good fraction, even though the same pages loaded fine
// when actually focused). Polling the DOM directly only cares about
// whether the content is there yet, not about the full-page load event.
async function pollForDesignCount(tabId, platform) {
  let lastResult = { totalDesigns: null, debugSnippet: null };
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractDesignCount,
        args: [platform],
      });
      lastResult = result;
      if (result.totalDesigns !== null) return result;
    } catch {
      // Tab may still be on about:blank / not ready for script injection —
      // just retry on the next tick.
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return lastResult;
}

async function readOneStore(store) {
  const tab = await chrome.tabs.create({ url: store.storeLink, active: false });
  try {
    const result = await pollForDesignCount(tab.id, store.platform);
    if (result.totalDesigns === null) {
      console.warn(`[sync] ${store.code} (${store.storeLink}) — không tìm thấy số. Đoạn text gần nhất:`, result.debugSnippet);
    } else {
      console.log(`[sync] ${store.code} -> ${result.totalDesigns}`);
    }
    return result.totalDesigns;
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function syncStores(stores) {
  const results = [];
  for (const store of stores) {
    try {
      const totalDesigns = await readOneStore(store);
      results.push({ code: store.code, totalDesigns });
    } catch (err) {
      console.error(`[sync] ${store.code} lỗi:`, err);
      results.push({ code: store.code, totalDesigns: null });
    }
    await sleep(DELAY_BETWEEN_STORES_MS);
  }
  return results;
}

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SYNC_STORES" || !Array.isArray(message.stores)) {
    return false;
  }
  syncStores(message.stores).then((results) => sendResponse({ results }));
  return true; // keep the message channel open for the async sendResponse
});
