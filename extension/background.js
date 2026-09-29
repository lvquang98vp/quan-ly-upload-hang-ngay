// Runs entirely in the background: opens each store (Redbubble or TeePublic)
// in a hidden (inactive) tab one at a time, reads the design count already
// server-rendered on the page, closes the tab, and moves to the next store.
// One tab at a time (not parallel) so this looks like ordinary sequential
// browsing rather than a burst of requests — both platforms block
// server-side requests outright, but are fine with a real browser visiting
// pages one by one (confirmed by hand, see the main README).

const PAGE_LOAD_TIMEOUT_MS = 15_000;
const DELAY_BETWEEN_STORES_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tải trang quá lâu."));
    }, PAGE_LOAD_TIMEOUT_MS);

    function listener(updatedTabId, info) {
      if (updatedTabId === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Injected into the page — must be self-contained (no closure references).
// Redbubble renders "<n> items" near the shop's result count; TeePublic
// renders "Designs <n>" in the profile tab.
function extractDesignCount(platform) {
  const text = document.body.innerText;
  const pattern = platform === "REDBUBBLE" ? /(\d[\d,]*)\s*items?/i : /Designs\s*([\d,]+)/i;
  const match = text.match(pattern);
  if (!match) return null;
  const n = parseInt(match[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

async function readOneStore(store) {
  const tab = await chrome.tabs.create({ url: store.storeLink, active: false });
  try {
    await waitForTabComplete(tab.id);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractDesignCount,
      args: [store.platform],
    });
    return result;
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
    } catch {
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
