import { fetchJson, fetchText, validBaseUrl } from "./api.js?v=20261012-ui2";
import { assertAdultAccess } from "./adult.js?v=20261012-ui2";

export const HENTAI_OCEAN_DEFAULT = "https://hentaiocean.com";

export function oceanSlug(value) {
  const text = String(value || "").trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (url.protocol !== "https:" || url.username || url.password) return "";
      if (url.hostname !== "hentaiocean.com" && url.hostname !== "www.hentaiocean.com") return "";
      const match = /^\/(?:watch|embed)\/([a-z0-9-]+)\/?$/.exec(url.pathname);
      return match?.[1] || "";
    } catch { return ""; }
  }
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function oceanEntry({ title, link, date = "" }) {
  if (!/^https:\/\//i.test(String(link || ""))) return null;
  const id = oceanSlug(link);
  if (!id || !title?.trim()) return null;
  return {
    key: `hentaiocean:${id}`, provider: "hentaiocean", id,
    title: title.trim(), image: "", score: null, type: "18+", year: "",
    status: "", description: "Watch with the official HentaiOcean player.",
    trailerId: "", url: `https://hentaiocean.com/watch/${id}`, date,
  };
}

export async function lookupOcean({ baseUrl = HENTAI_OCEAN_DEFAULT, query, signal }) {
  assertAdultAccess();
  const slug = oceanSlug(query);
  if (!slug) return [];
  const data = await fetchJson(baseUrl, `/api?${new URLSearchParams({ action: "hentai", slug })}`, signal);
  assertAdultAccess();
  if (!Array.isArray(data.info)) throw new Error("HentaiOcean returned an unexpected response.");
  return data.info.map((item) => oceanEntry({
    title: String(item.videoname || ""),
    link: `https://hentaiocean.com/watch/${item.urlname || ""}`,
    date: item.releasedate || "",
  })).filter(Boolean);
}

export async function fetchOceanCatalog({ baseUrl = HENTAI_OCEAN_DEFAULT, query = "", page = 1, signal }) {
  assertAdultAccess();
  if (!validBaseUrl(baseUrl)) throw new Error("Enter a valid HentaiOcean API URL.");
  const text = await fetchText(baseUrl, "/rss.xml", signal);
  assertAdultAccess();
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror") || !doc.querySelector("rss, feed"))
    throw new Error("HentaiOcean did not return a valid feed. Check the API or proxy settings.");
  const seen = new Set();
  let items = [...doc.querySelectorAll("item, entry")].map((node) => oceanEntry({
    title: node.querySelector("title")?.textContent || "",
    link: node.querySelector("link")?.getAttribute("href") || node.querySelector("link")?.textContent || "",
    date: node.querySelector("pubDate, published")?.textContent || "",
  })).filter((item) => item && !seen.has(item.key) && seen.add(item.key));
  const search = query.trim().toLocaleLowerCase();
  if (search) items = items.filter((item) => item.title.toLocaleLowerCase().includes(search) || item.id.includes(oceanSlug(query)));
  if (search && !items.length && page === 1) items = await lookupOcean({ baseUrl, query, signal });
  const start = (page - 1) * 24;
  return { items: items.slice(start, start + 24), hasMore: start + 24 < items.length };
}

export function oceanEmbed(baseUrl, episodeId) {
  const base = validBaseUrl(baseUrl || HENTAI_OCEAN_DEFAULT);
  if (!base || !/^[a-z0-9-]+$/.test(String(episodeId))) throw new Error("Invalid HentaiOcean episode.");
  return `${base}/embed/${encodeURIComponent(episodeId)}?la=1`;
}
