import { SKY_OBJECTS, skyObject } from "./cosmic-data.js?v=20261012-cosmos1";
import { createCosmicScene } from "./cosmic-scene.js?v=20261012-cosmos1";

const svgNS = "http://www.w3.org/2000/svg";
export function constellationSketch(object, doc = document) {
  const svg = doc.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 180 160");
  svg.setAttribute("aria-hidden", "true");
  const points = (object.points || []).map(([x, y]) => [14 + x * 152, 10 + y * 140]);
  for (const [from, to] of object.lines || []) {
    const line = doc.createElementNS(svgNS, "line");
    line.setAttribute("x1", points[from][0]); line.setAttribute("y1", points[from][1]);
    line.setAttribute("x2", points[to][0]); line.setAttribute("y2", points[to][1]);
    svg.append(line);
  }
  points.forEach(([x, y], index) => {
    const halo = doc.createElementNS(svgNS, "circle");
    halo.setAttribute("cx", x); halo.setAttribute("cy", y); halo.setAttribute("r", index === 0 ? 8 : 5);
    halo.setAttribute("class", "sky-star-halo");
    const star = doc.createElementNS(svgNS, "circle");
    star.setAttribute("cx", x); star.setAttribute("cy", y); star.setAttribute("r", index === 0 ? 2.8 : 1.9);
    star.setAttribute("class", "sky-star-core");
    svg.append(halo, star);
  });
  return svg;
}

export function initCosmicUi(doc = document, win = window) {
  const dialog = doc.querySelector("#sky-dialog");
  const chart = doc.querySelector("#sky-chart");
  const info = doc.querySelector("#sky-info");
  if (!dialog || !chart || !info) return null;
  const scene = createCosmicScene({ canvases: [doc.querySelector("#cosmos-canvas"), doc.querySelector("#sky-canvas")], doc, win });
  let returnFocus = null;
  const animations = new Set();
  function animate(element, frames, options) {
    if (!element?.animate || doc.documentElement.dataset.cosmicMotion !== "on") return;
    const animation = element.animate(frames, options);
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  }
  function stopTransitions() {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  }
  function select(id, reveal = false) {
    const object = skyObject(id);
    doc.documentElement.dataset.cosmicPalette = object.palette;
    chart.querySelectorAll("[data-sky-object]").forEach((button) => {
      const selected = button.dataset.skyObject === object.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const overline = doc.createElement("span");
    overline.className = "cosmic-overline"; overline.textContent = object.kind;
    const art = doc.createElement("div");
    art.className = "sky-info-art"; art.dataset.palette = object.palette;
    if (object.points) art.append(constellationSketch(object, doc));
    else {
      const orb = doc.createElement("span"); orb.className = "info-nebula-orb";
      orb.setAttribute("aria-hidden", "true"); art.append(orb);
    }
    const title = doc.createElement("h3"); title.textContent = object.name;
    const subtitle = doc.createElement("p"); subtitle.className = "sky-info-subtitle"; subtitle.textContent = object.subtitle;
    const description = doc.createElement("p"); description.className = "sky-description"; description.textContent = object.description;
    const fact = doc.createElement("div"); fact.className = "sky-fact";
    const category = doc.createElement("small"); category.textContent = object.category;
    const detail = doc.createElement("strong"); detail.textContent = object.fact;
    fact.append(category, detail);
    const source = doc.createElement("a");
    source.href = object.source; source.target = "_blank"; source.rel = "noopener noreferrer";
    source.className = "sky-source"; source.textContent = "Discover more at NASA ↗";
    info.replaceChildren(overline, art, title, subtitle, description, fact, source);
    animate(info, [{ opacity: .35, transform: "translateY(12px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 380, easing: "ease-out" });
    if (reveal && win.innerWidth <= 800) info.scrollIntoView?.({ block: "nearest", behavior: doc.documentElement.dataset.cosmicMotion === "on" ? "smooth" : "auto" });
  }
  for (const object of SKY_OBJECTS) {
    const button = doc.createElement("button");
    button.type = "button"; button.className = object.points ? "sky-object sky-constellation" : "sky-object sky-nebula";
    button.dataset.skyObject = object.id; button.dataset.palette = object.palette;
    button.style.setProperty("--sky-x", `${object.position[0]}%`);
    button.style.setProperty("--sky-y", `${object.position[1]}%`);
    button.setAttribute("aria-label", `Explore ${object.name}, ${object.kind.toLowerCase()}`);
    button.setAttribute("aria-pressed", "false");
    if (object.points) button.append(constellationSketch(object, doc));
    else {
      const glow = doc.createElement("span"); glow.className = "sky-nebula-glow"; glow.setAttribute("aria-hidden", "true"); button.append(glow);
    }
    const label = doc.createElement("span"); label.className = "sky-object-label"; label.textContent = object.name;
    button.append(label); button.addEventListener("click", () => select(object.id, true)); chart.append(button);
  }
  doc.querySelectorAll("[data-sky-preview]").forEach((element) => {
    element.append(constellationSketch(skyObject(element.dataset.skyPreview), doc));
  });
  doc.querySelectorAll("[data-open-sky]").forEach((button) => {
    button.addEventListener("click", () => {
      returnFocus = button;
      if (!dialog.open) dialog.showModal();
      scene.resize(); scene.sync(); select(button.dataset.openSky, skyObject(button.dataset.openSky).kind === "Nebula");
      doc.querySelector("#sky-close")?.focus({ preventScroll: true });
    });
  });
  doc.querySelector("#sky-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { scene.sync(); returnFocus?.focus({ preventScroll: true }); });
  doc.querySelector("#cosmos-pause").addEventListener("click", () => scene.togglePause());
  doc.querySelector("#sky-pause").addEventListener("click", () => scene.togglePause());
  doc.querySelector("#sky-shower").addEventListener("click", (event) => {
    const shower = scene.toggleShower();
    event.currentTarget.setAttribute("aria-pressed", String(shower));
    event.currentTarget.classList.toggle("is-active", shower);
  });
  const watch = doc.querySelector("#watch-dialog");
  const observer = new win.MutationObserver((records) => {
    if (records.some((record) => record.target === watch || record.attributeName === "data-theme")) scene.sync();
    if (doc.documentElement.dataset.cosmicMotion === "off") stopTransitions();
  });
  if (watch) observer.observe(watch, { attributes: true, attributeFilter: ["open"] });
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-cosmic-motion"] });
  win.addEventListener("miyovra:section-changed", () => {
    if (doc.documentElement.dataset.cosmicMotion !== "on") return;
    animate(doc.querySelector("main"), [{ opacity: .3, transform: "translateY(14px)", filter: "blur(4px)" }, { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" }], { duration: 440, easing: "cubic-bezier(.2,.7,.2,1)" });
    const veil = doc.querySelector(".cosmos-vignette");
    animate(veil, [{ opacity: .75 }, { opacity: .25 }, { opacity: .75 }], { duration: 900, easing: "ease-in-out" });
  });
  win.addEventListener("pagehide", () => { scene.suspend(); stopTransitions(); });
  win.addEventListener("pageshow", () => { scene.resize(); scene.sync(); });
  return { select, scene };
}

if (typeof document !== "undefined") initCosmicUi();
