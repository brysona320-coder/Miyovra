import test from "node:test";
import assert from "node:assert/strict";
import { sectionItems } from "../src/sections.js";
import { fetchOceanCatalog, lookupOcean, oceanEntry, oceanSlug, oceanEmbed } from "../src/hentaiocean.js";
import { getStreamInfo, getEpisodeSources } from "../src/streaming.js";

test("catalogs, searches, and progress keep adult titles in their section", () => {
  const items = [
    { provider: "anilist", title: "Sample anime" },
    { provider: "hentaiocean", title: "Sample adult title" },
    { provider: "animekai", anime_title: "Sample progress" },
  ];
  assert.deepEqual(sectionItems(items, "anime"), [items[0], items[2]]);
  assert.deepEqual(sectionItems(items, "hentai", "sample"), [items[1]]);
  assert.deepEqual(sectionItems(items, "anime", "adult"), []);
});

test("guests and unverified users cannot fetch the adult feed, lookup, or playback", async () => {
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Unexpected fetch"); };
  try {
    for (const user of [null, { id: "unverified" }]) {
      globalThis.window = { __miyovraUser: user };
      globalThis.localStorage = { getItem: () => "false" };
      await assert.rejects(fetchOceanCatalog({}), /unlock adult access/);
      await assert.rejects(lookupOcean({ query: "sample-1" }), /unlock adult access/);
      await assert.rejects(getStreamInfo({ provider: "hentaiocean", id: "sample-1" }), /unlock adult access/);
      await assert.rejects(getEpisodeSources({ provider: "hentaiocean", episodeId: "sample-1" }), /unlock adult access/);
    }
    assert.equal(requests, 0);
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousStorage;
    globalThis.fetch = previousFetch;
  }
});

test("feed records accept only provider watch URLs and render text safely", () => {
  assert.equal(oceanSlug("https://hentaiocean.com/watch/sample-title-1"), "sample-title-1");
  assert.equal(oceanSlug("https://attacker.example/watch/sample-title-1"), "");
  assert.equal(oceanEntry({ title: "Sample", link: "javascript:alert(1)" }), null);
  const entry = oceanEntry({ title: " Sample Title ", link: "https://hentaiocean.com/watch/sample-title-1" });
  assert.equal(entry.provider, "hentaiocean");
  assert.equal(entry.key, "hentaiocean:sample-title-1");
  assert.equal(entry.title, "Sample Title");
  assert.equal(entry.image, "");
  assert.throws(() => oceanEmbed("javascript:alert(1)", "sample"), /Invalid/);
  assert.throws(() => oceanEmbed("https://hentaiocean.com", "../unsafe"), /Invalid/);
});
