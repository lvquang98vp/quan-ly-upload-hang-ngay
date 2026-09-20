export const AUTH_COOKIE = "app_auth";

// Uses Web Crypto (SubtleCrypto) rather than Node's `crypto` module so this
// works in both the Edge middleware runtime and normal route handlers.
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Null means no password is configured — the app is open access. */
export async function getExpectedAuthValue(): Promise<string | null> {
  const pwd = process.env.APP_PASSWORD;
  if (!pwd) return null;
  return hashPassword(pwd);
}
