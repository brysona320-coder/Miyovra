// Local UI verification with synthetic catalogs and a mocked account service.
// This server never loads production account configuration or creates real users.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const titles = ["Beyond the Horizon", "The Midnight Express", "A World Apart", "Wildflower", "Neon Daydream", "After the Rain", "Blue Hour", "Paper Planets", "Silent Orbit", "Summer Letters", "Starlight Avenue", "The Last Lighthouse"];
const fixtureScript = String.raw`
localStorage.setItem("aniwatch:animeparadise-url", JSON.stringify(location.origin));
localStorage.setItem("aniwatch:hentaiocean-url", JSON.stringify(location.origin));
localStorage.setItem("aniwatch:catalog-provider", JSON.stringify("animeparadise"));
localStorage.setItem("aniwatch:scramjet-proxy-enabled", "false");
const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
Object.defineProperty(HTMLImageElement.prototype, "src", { get: imageSrc.get, set(value) {
  imageSrc.set.call(this, String(value).startsWith("https://preview.invalid/") ? location.origin + new URL(value).pathname : value);
}});
let previewUser = null;
const profile = { id: "preview-user", display_name: "Preview viewer", theme: "DARK", accent_color: "#cff875", density: "COMFORTABLE" };
const client = {
  auth: {
    getUser: async () => ({ data: { user: previewUser } }),
    signInWithPassword: async () => { previewUser = { id: "preview-user", email: "preview@example.invalid" }; return { data: { user: previewUser } }; },
    signUp: async () => ({ data: { user: { id: "preview-user" }, session: null } }),
    signOut: async () => { previewUser = null; },
    onAuthStateChange: () => {},
  },
  from(table) {
    const result = { data: table === "profiles" ? profile : [], error: null };
    let chain;
    chain = new Proxy({}, { get(_, name) { return name === "then" ? (done, fail) => Promise.resolve(result).then(done, fail) : () => chain; } });
    return chain;
  },
  storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }) }) },
};
window.supabase = { createClient: () => client };
window.addEventListener("error", event => fetch("/__error", { method: "POST", body: String(event.message) }));
window.addEventListener("unhandledrejection", event => fetch("/__error", { method: "POST", body: String(event.reason) }));
`;

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:8765");
  try {
    if (url.pathname === "/__error") {
      let text = "";
      for await (const chunk of request) text += chunk;
      console.error("BROWSER ERROR:", text);
      response.end("ok"); return;
    }
    if (url.pathname === "/search") {
      const query = url.searchParams.get("q")?.toLowerCase() || "";
      const data = titles.map((title, index) => ({ _id: `sample-${index}`, title, episodes: 12, rate: 80 + index, animeSeason: { year: 2026 }, posterImage: { large: `https://preview.invalid/posters/${index}.svg` } })).filter((item) => item.title.toLowerCase().includes(query));
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ success: true, data, pagination: { hasNext: false } })); return;
    }
    if (/^\/anime\//.test(url.pathname)) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ success: true, data: [{ uid: "sample-episode", number: 1, title: "The beginning" }] })); return;
    }
    if (url.pathname === "/rss.xml") {
      console.log("Preview adult feed requested");
      response.setHeader("Content-Type", "application/rss+xml");
      response.end('<rss version="2.0"><channel>' + ["Midnight Studio", "Moonlight Collection", "Night Garden"].map((title, index) => `<item><title>${title}</title><link>https://hentaiocean.com/watch/sample-${index + 1}</link><pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate></item>`).join("") + "</channel></rss>"); return;
    }
    if (url.pathname.startsWith("/embed/")) {
      response.setHeader("Content-Type", "text/html");
      response.end('<body style="background:#0b0d11;color:#cff875;display:grid;place-items:center;font:20px Arial"><p>Local test player · no external media</p></body>'); return;
    }
    if (url.pathname.startsWith("/posters/")) {
      const index = parseInt(url.pathname.match(/\d+/)?.[0] || "0", 10);
      const palettes = [["#283f49", "#accfd0"], ["#26253f", "#dd99a5"], ["#304634", "#d1dc96"], ["#5c3444", "#e0c4a4"]];
      const [bg, fg] = palettes[index % palettes.length];
      response.setHeader("Content-Type", "image/svg+xml");
      response.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 430"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="#080e1a"/></linearGradient></defs><rect width="300" height="430" fill="url(#g)"/><circle cx="150" cy="165" r="78" fill="${fg}" opacity=".8"/><circle cx="175" cy="143" r="76" fill="${bg}"/><path d="M0 280 80 190 145 280 230 160 300 260V430H0Z" fill="${fg}" opacity=".25"/><path d="m0 350 100-110 70 80 100-40 30 35v115H0Z" fill="#0c171e"/><text x="20" y="48" fill="${fg}" font-family="monospace" font-size="12" letter-spacing="4">MIYOVRA / ${String(index + 1).padStart(2, "0")}</text></svg>`); return;
    }
    if (url.pathname === "/src/runtime-config.js") {
      response.setHeader("Content-Type", "text/javascript");
      response.end('export const RUNTIME_CONFIG={supabaseUrl:"https://preview.invalid",supabasePublishableKey:"preview-only"};'); return;
    }
    const path = resolve(root, "." + decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    if (!path.startsWith(root + sep) || /[\\/]\.git[\\/]|[\\/]supabase[\\/]/.test(path)) { response.writeHead(403).end(); return; }
    let content = await readFile(path);
    if (path.endsWith("index.html")) {
      content = Buffer.from(content.toString().replace(/<script[^>]+src="https:[^"]+"[^>]*><\/script>/g, "").replace("<head>", "<head><script>" + fixtureScript + "</script>"));
    }
    response.setHeader("Content-Type", types[extname(path)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    response.end(content);
  } catch { response.writeHead(404).end("Not found"); }
});
server.listen(8765, "127.0.0.1", () => console.log("Local fixture preview: http://127.0.0.1:8765/"));
