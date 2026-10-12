const KEY = "miyovra:adult-verified";

export const HENTAI_OCEAN_DEFAULT = "https://hentaiocean.com";

export function signedInUser() {
  return window.__miyovraUser || null;
}

export function isAdultVerified() {
  const user = signedInUser();
  return Boolean(user?.id && localStorage.getItem(`${KEY}:${user.id}`) === "true");
}

export function verifyAdultAccess() {
  const user = signedInUser();
  if (!user?.id) throw new Error("Log in before verifying adult access.");
  localStorage.setItem(`${KEY}:${user.id}`, "true");
}

export function revokeAdultAccess() {
  const user = signedInUser();
  if (user?.id) localStorage.removeItem(`${KEY}:${user.id}`);
}
