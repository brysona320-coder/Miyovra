import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { sectionItems } from "../src/sections.js";

// A deliberately small DOM fixture for testing controller interactions without
// opening a browser, accessing production services, or accepting an age prompt.
class Element {
  constructor(tag = "div") {
    this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {};
    this.listeners = {}; this.hidden = false; this.open = false; this.value = "";
    this.firstChild = { textContent: "" };
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  set textContent(value) { this.text = String(value); }
  get textContent() { return this.text || this.children.map((child) => child.textContent).join(""); }
  set innerHTML(value) { this.html = value; }
  set src(value) { this.attrs.src = value; }
  get src() { return this.attrs.src || ""; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  removeAttribute(name) { delete this.attrs[name]; }
  append(...children) { this.children.push(...children.flatMap((child) => child.tagName === "fragment" ? child.children : [child])); }
  replaceChildren(...children) { this.children = []; this.text = ""; this.append(...children); }
  querySelectorAll(selector) { return this.children.filter((child) => selector === "button" || selector.startsWith("button[") ? child.tagName === "button" : false); }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name) { for (const fn of this.listeners[name] || []) fn({ target: this, currentTarget: this, preventDefault() {} }); }
  showModal() { this.open = true; }
  close() { if (this.open) { this.open = false; this.emit("close"); } }
  pause() {} load() {} scrollIntoView() {}
  canPlayType() { return ""; }
  play() { return Promise.resolve(); }
}

async function appFixture() {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const source = (await readFile(new URL("../src/app.js", import.meta.url), "utf8")).replace(/^import\s+[\s\S]*?;\s*/gm, "");
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], new Element()]));
  nodes["anime-tab"].dataset.section = "anime";
  nodes["hentai-tab"].dataset.section = "hentai";
  nodes["filter-row"].children = ["all", "tv", "movie", "ova", "ona", "special"].map((type) => Object.assign(new Element("button"), { dataset: { type } }));
  const classes = Object.fromEntries(["provider-control", "watch-provider-control", "catalog-source-control", "watch-player", "dialog-poster"].map((name) => [name, new Element()]));
  const document = {
    documentElement: { dataset: {} },
    querySelector: (selector) => selector.startsWith("#") ? nodes[selector.slice(1)] : classes[selector.slice(1)],
    querySelectorAll: () => [nodes["anime-tab"], nodes["hentai-tab"]],
    createElement: (tag) => new Element(tag),
    createTextNode: (textContent) => ({ textContent }),
    createDocumentFragment: () => new Element("fragment"),
  };
  const listeners = {};
  const window = {
    addEventListener: (name, callback) => (listeners[name] ||= []).push(callback),
    dispatchEvent: (event) => (listeners[event.type] || []).forEach((fn) => fn(event)),
    scrollTo() {},
  };
  const calls = { anime: 0, adult: 0, sources: 0 };
  let verified = false;
  const anime = { key: "animeparadise:sample-1", provider: "animeparadise", id: "sample-1", title: "Sample anime", image: "https://image.example/1.jpg", url: "https://example.test/title", type: "TV", score: 8 };
  const adult = { key: "hentaiocean:sample-adult-1", provider: "hentaiocean", id: "sample-adult-1", title: "Sample adult title", type: "18+", url: "https://example.test/adult", image: "" };
  const storage = new Map();
  const context = vm.createContext({
    document, window, navigator: {}, setTimeout, clearTimeout, AbortController,
    CustomEvent: class { constructor(type, { detail } = {}) { this.type = type; this.detail = detail; } },
    DOMParser: class { parseFromString(text) { return { body: { textContent: text } }; } },
    Option: class extends Element { constructor(label, value) { super("option"); this.textContent = label; this.value = value; } },
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    PROVIDERS: { animeparadise: { label: "AnimeParadise" }, anilist: { label: "AniList" }, kitsu: { label: "Kitsu" }, aniapi: { label: "AniAPI" }, hentaiocean: { label: "HentaiOcean" } },
    STREAM_PROVIDERS: { animeparadise: "AnimeParadise", animekai: "AnimeKai", animepahe: "Animepahe", hentaiocean: "HentaiOcean" },
    ANIAPI_DEFAULT: "https://aniapi.example", ANIMEPARADISE_DEFAULT: "https://anime.example", CONSUMET_DEFAULT: "https://consumet.example", HENTAI_OCEAN_DEFAULT: "https://adult.example",
    validBaseUrl: (value) => value, validProxyTemplate: (value) => value, setApiProxyTemplate() {}, setScramjetProxy() {},
    isAdultVerified: () => verified, signedInUser: () => verified ? { id: "test-user" } : null, sectionItems,
    fetchAnime: async () => { calls.anime++; return { items: [anime], hasMore: false }; },
    fetchOceanCatalog: async () => { calls.adult++; return { items: [adult], hasMore: false }; },
    searchStreams: async () => [{ id: "match-1", title: "Sample match" }],
    getStreamInfo: async () => ({ episodes: [{ id: "sample-episode-1", number: 1 }], totalEpisodes: 1 }),
    getEpisodeSources: async ({ provider }) => {
      calls.sources++;
      return provider === "hentaiocean" ? { embed: "https://adult.example/embed/sample-1", sources: [] } : { sources: [{ url: "https://video.example/sample.mp4", quality: "Auto", hls: false }] };
    },
  });
  vm.runInContext(source, context);
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  await settle();
  return { nodes, calls, window, settle, verify(value) { verified = value; window.dispatchEvent({ type: "miyovra:access-changed" }); } };
}

test("Hentai tab blocks guests, unlocks its catalog, and removes its player on revocation", async () => {
  const app = await appFixture();
  assert.equal(app.calls.anime, 1);
  assert.equal(app.calls.adult, 0);
  app.nodes["hentai-tab"].emit("click");
  await app.settle();
  assert.equal(app.nodes["adult-gate"].hidden, false);
  assert.equal(app.nodes["search-input"].disabled, true);
  assert.equal(app.calls.adult, 0);
  app.verify(true);
  await app.settle();
  assert.equal(app.nodes["adult-gate"].hidden, true);
  assert.equal(app.calls.adult, 1);
  app.nodes["anime-grid"].children[0].children[0].emit("click");
  app.nodes["dialog-watch"].emit("click");
  await app.settle();
  app.nodes["stream-episodes"].children[0].emit("click");
  await app.settle();
  assert.equal(app.nodes["watch-embed"].hidden, false);
  assert.match(app.nodes["watch-embed"].src, /\/embed\//);
  app.verify(false);
  await app.settle();
  assert.equal(app.nodes["watch-embed"].getAttribute("src"), null);
  assert.equal(app.nodes["watch-dialog"].open, false);
  assert.equal(app.nodes["adult-gate"].hidden, false);
  assert.equal(app.nodes["anime-grid"].children.length, 0);
  app.nodes["anime-tab"].emit("click");
  await app.settle();
  assert.equal(app.nodes["search-input"].disabled, false);
  assert.equal(app.nodes["catalog-title"].textContent, "Worth the watch.");
});

test("metadata source search still produces episode matches after the embed fix", async () => {
  const app = await appFixture();
  app.nodes["provider-select"].value = "animekai";
  app.nodes["provider-select"].emit("change");
  app.nodes["anime-grid"].children[0].children[0].emit("click");
  app.nodes["dialog-watch"].emit("click");
  await app.settle();
  assert.equal(app.nodes["stream-matches"].children.length, 1);
  assert.equal(app.nodes["watch-error"].textContent, "");
});
