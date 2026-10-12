import { makeStars, makeMeteor, motionAllowed, canvasScale } from "./cosmic-data.js?v=20261012-cosmos1";

export function createCosmicScene({ canvases, win = window, doc = document, random = Math.random }) {
  const scenes = canvases.filter(Boolean).map((canvas) => ({ canvas, context: canvas.getContext("2d"), width: 0, height: 0 }));
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false;
  try { paused = win.localStorage.getItem("miyovra:cosmic-paused") === "true"; } catch {}
  let frame = 0, lastTime = 0, elapsed = 0, nextMeteor = .8, shower = false;
  let stars = [], meteors = [], cursor = { x: 0, y: 0 }, camera = { x: 0, y: 0 };

  function isAnimated() {
    return motionAllowed({ paused, reduced: reduced.matches, hidden: doc.hidden, watching: Boolean(doc.querySelector("#watch-dialog")?.open) });
  }
  function activeScene() {
    return doc.querySelector("#sky-dialog")?.open ? scenes[1] || scenes[0] : scenes[0];
  }
  function resize() {
    const ratio = canvasScale(win.innerWidth, win.innerHeight, win.devicePixelRatio);
    for (const scene of scenes) {
      scene.width = win.innerWidth;
      scene.height = win.innerHeight;
      scene.canvas.width = Math.round(scene.width * ratio);
      scene.canvas.height = Math.round(scene.height * ratio);
      scene.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    stars = makeStars(win.innerWidth, win.innerHeight, random);
    draw(false);
  }
  function draw(animated) {
    const scene = activeScene();
    if (!scene?.context) return;
    const { context: ctx, width, height } = scene;
    const light = doc.documentElement.dataset.theme === "light" && !doc.querySelector("#sky-dialog")?.open;
    ctx.clearRect(0, 0, width, height);
    const starColor = light ? "69,88,134" : "221,235,255";
    for (const star of stars) {
      const twinkle = animated ? .7 + Math.sin(elapsed * .7 + star.phase) * .3 : .85;
      ctx.fillStyle = `rgba(${starColor},${star.opacity * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x * width + camera.x * star.depth, star.y * height + camera.y * star.depth, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const meteor of meteors) {
      const distance = meteor.age * meteor.speed;
      const x = meteor.x * width + distance * .72, y = meteor.y * height + distance;
      const alpha = Math.max(0, Math.sin(Math.PI * meteor.age / meteor.lifetime));
      const gradient = ctx.createLinearGradient(x, y, x - meteor.length * .72, y - meteor.length);
      gradient.addColorStop(0, `rgba(${light ? "86,103,168" : "215,241,255"},${alpha})`);
      gradient.addColorStop(1, "rgba(145,169,255,0)");
      ctx.strokeStyle = gradient; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - meteor.length * .72, y - meteor.length); ctx.stroke();
    }
  }
  function tick(timestamp) {
    frame = 0;
    if (!isAnimated()) return;
    if (lastTime && timestamp - lastTime < 1000 / 30) { frame = win.requestAnimationFrame(tick); return; }
    const delta = lastTime ? Math.min((timestamp - lastTime) / 1000, .05) : 1 / 30;
    lastTime = timestamp; elapsed += delta;
    camera.x += (cursor.x - camera.x) * Math.min(1, delta * 3);
    camera.y += (cursor.y - camera.y) * Math.min(1, delta * 3);
    doc.documentElement.style.setProperty("--cosmos-x", `${camera.x.toFixed(2)}px`);
    doc.documentElement.style.setProperty("--cosmos-y", `${camera.y.toFixed(2)}px`);
    meteors = meteors.map((meteor) => ({ ...meteor, age: meteor.age + delta })).filter((meteor) => meteor.age < meteor.lifetime);
    nextMeteor -= delta;
    if (nextMeteor <= 0 && meteors.length < 10) {
      meteors.push(makeMeteor(random)); nextMeteor = shower ? .17 : .65 + random() * 1.1;
    }
    draw(true);
    frame = win.requestAnimationFrame(tick);
  }
  function sync() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
    const allowed = isAnimated();
    doc.documentElement.dataset.cosmicMotion = allowed ? "on" : "off";
    for (const button of [doc.querySelector("#cosmos-pause"), doc.querySelector("#sky-pause")].filter(Boolean)) {
      button.disabled = reduced.matches;
      button.setAttribute("aria-pressed", String(paused));
      button.textContent = reduced.matches ? "Motion reduced" : paused ? "Resume stars" : "Pause stars";
    }
    const rain = doc.querySelector("#sky-shower");
    if (rain) rain.disabled = !allowed;
    if (!allowed) { meteors = []; cursor = { x: 0, y: 0 }; camera = { x: 0, y: 0 }; }
    draw(false);
    if (allowed && scenes.some((scene) => scene.context)) frame = win.requestAnimationFrame(tick);
  }
  function pointer(event) {
    if (!isAnimated() || event.pointerType === "touch") return;
    cursor = { x: (event.clientX / win.innerWidth - .5) * 16, y: (event.clientY / win.innerHeight - .5) * 12 };
  }
  function togglePause() {
    paused = !paused;
    try { win.localStorage.setItem("miyovra:cosmic-paused", String(paused)); } catch {}
    sync();
  }
  function toggleShower() {
    if (!isAnimated()) return false;
    shower = !shower;
    if (shower) for (let i = 0; i < 4 && meteors.length < 10; i++) meteors.push(makeMeteor(random));
    return shower;
  }
  function suspend() {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
    doc.documentElement.dataset.cosmicMotion = "off";
  }
  win.addEventListener("resize", resize, { passive: true });
  win.addEventListener("pointermove", pointer, { passive: true });
  doc.addEventListener("visibilitychange", sync);
  reduced.addEventListener?.("change", sync);
  resize(); sync();
  return { sync, resize, togglePause, toggleShower, suspend, destroy() {
    if (frame) win.cancelAnimationFrame(frame);
    win.removeEventListener("resize", resize);
    win.removeEventListener("pointermove", pointer);
    doc.removeEventListener("visibilitychange", sync);
    reduced.removeEventListener?.("change", sync);
  } };
}
