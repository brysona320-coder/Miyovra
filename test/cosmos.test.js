import test from "node:test";
import assert from "node:assert/strict";
import { SKY_OBJECTS, skyObject, makeStars, makeMeteor, starCount, motionAllowed, canvasScale } from "../src/cosmic-data.js";
import { createCosmicScene } from "../src/cosmic-scene.js";
import { initCosmicUi } from "../src/cosmic-ui.js";

class Node {
  constructor() {
    this.children = []; this.dataset = {}; this.attributes = {}; this.events = {};
    this.style = { setProperty() {} }; this.open = false;
    this.classList = { toggle() {} };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(name, handler) { (this.events[name] ||= []).push(handler); }
  removeEventListener(name, handler) { this.events[name] = (this.events[name] || []).filter((item) => item !== handler); }
  emit(name) { (this.events[name] || []).forEach((handler) => handler({ currentTarget: this })); }
  querySelectorAll() { return this.children.filter((child) => child.dataset.skyObject); }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit("close"); }
  focus() { this.focused = true; }
}

function sceneFixture({ reduced = false, paused = false, context = true } = {}) {
  const nodes = Object.fromEntries(["sky-dialog", "sky-chart", "sky-info", "watch-dialog", "cosmos-pause", "sky-pause", "sky-shower", "sky-close"].map((id) => [id, new Node()]));
  let drawing = [0, 0];
  const canvases = [0, 1].map((index) => ({ width: 0, height: 0, getContext: () => context ? {
    setTransform() {}, clearRect() { drawing[index]++; }, beginPath() {}, arc() {}, fill() {},
    createLinearGradient() { return { addColorStop() {} }; }, moveTo() {}, lineTo() {}, stroke() {},
  } : null }));
  nodes["cosmos-canvas"] = canvases[0]; nodes["sky-canvas"] = canvases[1];
  const doc = new Node(); doc.hidden = false; doc.documentElement = new Node();
  doc.querySelector = (selector) => nodes[selector.slice(1)];
  doc.createElement = () => new Node(); doc.createElementNS = () => new Node();
  const trigger = new Node(); trigger.dataset.openSky = "orion-nebula";
  doc.querySelectorAll = (selector) => selector === "[data-open-sky]" ? [trigger] : [];
  const frames = new Map(); let next = 0;
  const mql = new Node(); mql.matches = reduced;
  const storage = new Map(paused ? [["miyovra:cosmic-paused", "true"]] : []);
  const win = new Node();
  Object.assign(win, {
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 3,
    matchMedia: () => mql,
    localStorage: { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    requestAnimationFrame: (callback) => { const id = ++next; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    MutationObserver: class { observe() {} disconnect() {} },
  });
  function tick(timestamp) {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id); callback(timestamp);
  }
  return { nodes, doc, win, mql, storage, frames, tick, canvases, drawing, trigger };
}

test("sky catalog has complete source links and valid, bounded constellation sketches", () => {
  assert.equal(new Set(SKY_OBJECTS.map((item) => item.id)).size, SKY_OBJECTS.length);
  assert.equal(SKY_OBJECTS.filter((item) => item.kind === "Constellation").length, 4);
  assert.equal(SKY_OBJECTS.filter((item) => item.kind === "Nebula").length, 3);
  for (const object of SKY_OBJECTS) {
    assert.match(new URL(object.source).hostname, /(?:^|\.)nasa\.gov$/);
    assert.equal(new URL(object.source).protocol, "https:");
    assert.ok(object.description.length > 50);
    for (const point of object.points || []) assert.ok(point.every((n) => n >= 0 && n <= 1));
    for (const edge of object.lines || []) assert.ok(edge.every((n) => n >= 0 && n < object.points.length));
  }
  assert.equal(skyObject("unknown").id, "orion");
});

test("stars stay within particle budgets and meteors have finite motion", () => {
  assert.equal(starCount(300, 600), 65);
  assert.equal(starCount(8000, 8000), 260);
  const scale = canvasScale(7680, 4320, 3);
  assert.ok(7680 * 4320 * scale * scale <= 3_000_001);
  const stars = makeStars(1200, 800, () => .5);
  assert.equal(stars.length, starCount(1200, 800));
  assert.ok(stars.every((star) => star.x >= 0 && star.x <= 1 && star.y >= 0 && star.y <= 1 && star.radius > 0));
  const meteor = makeMeteor(() => .5);
  assert.ok(Number.isFinite(meteor.speed) && meteor.speed > 0 && meteor.lifetime > 0);
});

test("motion requires every user, visibility, and playback condition to allow it", () => {
  const state = { paused: false, reduced: false, hidden: false, watching: false };
  assert.equal(motionAllowed(state), true);
  for (const property of Object.keys(state)) assert.equal(motionAllowed({ ...state, [property]: true }), false);
});

test("renderer caps pixel ratio and persists pause without running a frame loop", () => {
  const fixture = sceneFixture();
  const scene = createCosmicScene({ canvases: fixture.canvases, doc: fixture.doc, win: fixture.win, random: () => .5 });
  assert.equal(fixture.canvases[0].width, 1800);
  assert.equal(fixture.frames.size, 1);
  fixture.tick(1000); fixture.tick(1040);
  assert.equal(fixture.frames.size, 1);
  scene.togglePause();
  assert.equal(fixture.frames.size, 0);
  assert.equal(fixture.storage.get("miyovra:cosmic-paused"), "true");
  assert.equal(fixture.nodes["sky-pause"].textContent, "Resume stars");
  assert.equal(scene.toggleShower(), false);
  scene.togglePause();
  assert.equal(fixture.frames.size, 1);
  scene.destroy();
  assert.equal(fixture.frames.size, 0);
});

test("hidden tabs, playback, and reduced-motion changes stop and resume rendering", () => {
  const fixture = sceneFixture();
  const scene = createCosmicScene({ canvases: fixture.canvases, doc: fixture.doc, win: fixture.win });
  fixture.doc.hidden = true; fixture.doc.emit("visibilitychange");
  assert.equal(fixture.frames.size, 0);
  fixture.doc.hidden = false; fixture.doc.emit("visibilitychange");
  assert.equal(fixture.frames.size, 1);
  fixture.nodes["watch-dialog"].open = true; scene.sync();
  assert.equal(fixture.frames.size, 0);
  fixture.nodes["watch-dialog"].open = false; scene.sync();
  fixture.mql.matches = true; fixture.mql.emit("change");
  assert.equal(fixture.frames.size, 0);
  assert.equal(fixture.nodes["cosmos-pause"].disabled, true);
  assert.equal(fixture.doc.documentElement.dataset.cosmicMotion, "off");
  fixture.mql.matches = false; fixture.mql.emit("change");
  scene.suspend(); assert.equal(fixture.frames.size, 0);
  scene.sync(); assert.equal(fixture.frames.size, 1);
  scene.destroy();
});

test("sky view switches the rendering target and shows info through accessible buttons", () => {
  const fixture = sceneFixture();
  const ui = initCosmicUi(fixture.doc, fixture.win);
  assert.equal(fixture.nodes["sky-chart"].children.length, 7);
  const backgroundDraws = fixture.drawing[0];
  fixture.trigger.emit("click");
  assert.equal(fixture.drawing[0], backgroundDraws);
  assert.ok(fixture.drawing[1] > 0);
  assert.equal(fixture.nodes["sky-dialog"].open, true);
  assert.equal(fixture.nodes["sky-close"].focused, true);
  assert.equal(fixture.doc.documentElement.dataset.cosmicPalette, "orion");
  assert.equal(fixture.nodes["sky-info"].children[2].textContent, "Orion Nebula");
  const cassiopeia = fixture.nodes["sky-chart"].children.find((button) => button.dataset.skyObject === "cassiopeia");
  assert.match(cassiopeia.getAttribute("aria-label"), /Explore Cassiopeia/);
  cassiopeia.emit("click");
  assert.equal(fixture.nodes["sky-info"].children[2].textContent, "Cassiopeia");
  assert.equal(cassiopeia.getAttribute("aria-pressed"), "true");
  assert.equal(fixture.doc.documentElement.dataset.cosmicPalette, "helix");
  fixture.nodes["sky-close"].emit("click");
  assert.equal(fixture.nodes["sky-dialog"].open, false);
  assert.equal(fixture.trigger.focused, true);
  ui.scene.destroy();
});

test("stored pause and reduced motion preserve a static scene and working explorer", () => {
  for (const state of [{ paused: true }, { reduced: true }]) {
    const fixture = sceneFixture(state);
    const ui = initCosmicUi(fixture.doc, fixture.win);
    assert.equal(fixture.frames.size, 0);
    assert.equal(fixture.nodes["sky-shower"].disabled, true);
    fixture.trigger.emit("click");
    assert.equal(fixture.nodes["sky-info"].children[2].textContent, "Orion Nebula");
    ui.scene.destroy();
  }
});
