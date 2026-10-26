/* Maffed Construction: backend API (Node.js 18+, no dependencies).
   Customers submit posts -> "pending". The owner approves, rejects or asks for more info.
   Approved posts are published automatically. Company posts are published directly. */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "change-me-123";
const ORIGINS = (process.env.ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim()).filter(Boolean);
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const UP = path.join(DATA, "uploads"), DBF = path.join(DATA, "db.json");
if (process.env.NODE_ENV === "production" && ADMIN_KEY === "change-me-123") { console.error("Refusing to start: set a strong ADMIN_KEY."); process.exit(1); }
fs.mkdirSync(UP, { recursive: true });

let db = { posts: [], messages: [], applications: [] };
try { db = JSON.parse(fs.readFileSync(DBF, "utf8")); } catch (e) {}
db.posts = db.posts || []; db.messages = db.messages || []; db.applications = db.applications || [];
const save = () => { const tmp = DBF + ".tmp"; fs.writeFileSync(tmp, JSON.stringify(db, null, 1)); fs.renameSync(tmp, DBF); };

const TYPES = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".webm": "video/webm", ".pdf": "application/pdf" };
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm", "application/pdf": ".pdf" };
const CUSTOMER_KINDS = ["market", "rent", "hub"], ALL_KINDS = ["market", "rent", "hub", "portfolio", "bid", "law", "map"];
const clean = (v, n) => String(v == null ? "" : v).slice(0, n || 400);
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

/* very small rate limiter (per IP, in memory) */
const hits = new Map();
function limited(req, bucket, max, windowMs) {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?").split(",")[0].trim(), k = bucket + ":" + ip, now = Date.now();
  const h = (hits.get(k) || []).filter((t) => now - t < windowMs); h.push(now); hits.set(k, h);
  if (hits.size > 5000) hits.clear();
  return h.length > max;
}
function cors(req, res) {
  const o = req.headers.origin;
  if (ORIGINS.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
  else if (o && ORIGINS.includes(o)) { res.setHeader("Access-Control-Allow-Origin", o); res.setHeader("Vary", "Origin"); }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("X-Content-Type-Options", "nosniff");
}
const body = (req) => new Promise((ok, no) => {
  let n = 0; const c = [];
  req.on("data", (d) => { n += d.length; if (n > 120e6) { no(new Error("too large")); req.destroy(); } else c.push(d); });
  req.on("end", () => { try { ok(JSON.parse(Buffer.concat(c).toString() || "{}")); } catch (e) { no(e); } });
  req.on("error", no);
});
function saveMedia(list) {
  const out = [];
  (Array.isArray(list) ? list : []).slice(0, 10).forEach((m) => {
    const s = String((m && m.dataUrl) || ""), i = s.indexOf(";base64,");
    if (!s.startsWith("data:") || i < 0) return;
    const mime = s.slice(5, i), ext = EXT[mime]; if (!ext) return;
    const buf = Buffer.from(s.slice(i + 8), "base64"); if (!buf.length || buf.length > 40e6) return;
    const name = crypto.randomBytes(8).toString("hex") + ext;
    fs.writeFileSync(path.join(UP, name), buf);
    out.push({ type: mime === "application/pdf" ? "pdf" : mime.split("/")[0], url: "/uploads/" + name, name: clean(m.name, 80) || name });
  });
  return out;
}
const fields = (b) => ({ type: clean(b.type, 40), title: clean(b.title, 150), location: clean(b.location, 150), area: clean(b.area, 30), purpose: clean(b.purpose, 30), price: clean(b.price, 80), details: clean(b.details, 4000), criteria: clean(b.criteria, 4000), deadline: clean(b.deadline, 40), year: clean(b.year, 10), stage: clean(b.stage, 30), link: clean(b.link, 600) });
const pub = (p) => ({ id: p.id, kind: p.kind, type: p.type, title: p.title, location: p.location, area: p.area, purpose: p.purpose, price: p.price, details: p.details, criteria: p.criteria, deadline: p.deadline, year: p.year, stage: p.stage, link: p.link, media: p.media, createdAt: p.createdAt, approvedAt: p.approvedAt, source: p.source });
const isAdmin = (req) => { const h = (s) => crypto.createHash("sha256").update(String(s)).digest(); return crypto.timingSafeEqual(h(req.headers["x-admin-key"] || ""), h(ADMIN_KEY)); };
const removeFiles = (media) => (media || []).forEach((m) => fs.unlink(path.join(UP, path.basename(m.url)), () => {}));

async function api(req, res, p) {
  const get = req.method === "GET", post = req.method === "POST";
  if (get && p === "/api/ping") return send(res, 200, { ok: true });
  if (get && p === "/api/posts") return send(res, 200, db.posts.filter((x) => x.status === "approved").sort((a, b) => b.approvedAt - a.approvedAt).map(pub));
  if (get && p.startsWith("/api/status/")) {
    const x = db.posts.find((q) => q.code && q.code === p.slice(12).toUpperCase());
    return x ? send(res, 200, { title: x.title, status: x.status, note: x.note || "" }) : send(res, 404, { error: "not found" });
  }
  if (post && ["/api/submit", "/api/contact", "/api/apply"].includes(p) && limited(req, "pub", 40, 3600e3)) return send(res, 429, { error: "too many requests, try later" });
  if (post && p === "/api/submit") {
    const b = await body(req);
    if (!CUSTOMER_KINDS.includes(b.kind)) return send(res, 400, { error: "bad kind" });
    const f = fields(b), name = clean(b.name, 100), phone = clean(b.phone, 40);
    if (!f.title || !name || !phone) return send(res, 400, { error: "missing fields" });
    f.link = "";
    const x = { id: crypto.randomBytes(6).toString("hex"), code: crypto.randomBytes(4).toString("hex").toUpperCase(), kind: b.kind, status: "pending", source: "customer", createdAt: Date.now(), ...f, media: saveMedia(b.media), contact: { name, phone, email: clean(b.email, 120) } };
    db.posts.push(x); save(); return send(res, 200, { id: x.id, code: x.code });
  }
  if (post && p === "/api/contact") {
    const b = await body(req);
    db.messages.unshift({ id: crypto.randomBytes(6).toString("hex"), at: Date.now(), name: clean(b.name, 100), phone: clean(b.phone, 40), email: clean(b.email, 120), service: clean(b.service, 120), message: clean(b.message, 3000) });
    db.messages = db.messages.slice(0, 500); save(); return send(res, 200, { ok: true });
  }
  if (post && p === "/api/apply") {
    const b = await body(req), bid = db.posts.find((q) => q.id === b.bidId && q.kind === "bid" && q.status === "approved");
    const name = clean(b.name, 100), phone = clean(b.phone, 40); if (!bid || !name || !phone) return send(res, 400, { error: "missing fields" });
    db.applications.unshift({ id: crypto.randomBytes(6).toString("hex"), at: Date.now(), bidId: bid.id, bidTitle: bid.title, name, phone, email: clean(b.email, 120), message: clean(b.message, 3000), media: saveMedia(b.media) });
    db.applications = db.applications.slice(0, 500); save(); return send(res, 200, { ok: true });
  }
  if (!p.startsWith("/api/admin/")) return send(res, 404, { error: "not found" });
  if (limited(req, "adm", 120, 600e3)) return send(res, 429, { error: "too many requests" });
  if (!isAdmin(req)) { if (limited(req, "fail", 10, 900e3)) return send(res, 429, { error: "too many wrong attempts, wait 15 minutes" }); return send(res, 401, { error: "wrong key" }); }
  if (get && p === "/api/admin/data") return send(res, 200, { posts: db.posts.slice().sort((a, b) => b.createdAt - a.createdAt), messages: db.messages, applications: db.applications });
  const b = await body(req);
  if (p === "/api/admin/decide") {
    const x = db.posts.find((q) => q.id === b.id); if (!x || !["approved", "rejected", "info"].includes(b.status)) return send(res, 400, { error: "bad request" });
    x.status = b.status; x.note = clean(b.note, 500); if (b.status === "approved") x.approvedAt = Date.now(); save(); return send(res, 200, { ok: true });
  }
  if (p === "/api/admin/post") {
    if (!ALL_KINDS.includes(b.kind)) return send(res, 400, { error: "bad kind" });
    const f = fields(b); if (!f.title) return send(res, 400, { error: "title required" });
    const now = Date.now(); db.posts.push({ id: crypto.randomBytes(6).toString("hex"), code: "", kind: b.kind, status: "approved", source: "company", createdAt: now, approvedAt: now, ...f, media: saveMedia(b.media) });
    save(); return send(res, 200, { ok: true });
  }
  if (p === "/api/admin/delete") { const x = db.posts.find((q) => q.id === b.id); if (x) { removeFiles(x.media); db.posts = db.posts.filter((q) => q !== x); save(); } return send(res, 200, { ok: true }); }
  if (p === "/api/admin/appdelete") { const a = db.applications.find((m) => m.id === b.id); if (a) { removeFiles(a.media); db.applications = db.applications.filter((m) => m !== a); save(); } return send(res, 200, { ok: true }); }
  if (p === "/api/admin/msgdelete") { db.messages = db.messages.filter((m) => m.id !== b.id); save(); return send(res, 200, { ok: true }); }
  return send(res, 404, { error: "not found" });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  try {
    const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.startsWith("/api/")) return await api(req, res, p);
    if (p.startsWith("/uploads/")) {
      const f = path.resolve(UP, p.slice(9));
      if (!f.startsWith(UP + path.sep)) { res.writeHead(403); return res.end(); }
      return fs.readFile(f, (e, d) => {
        if (e) { res.writeHead(404); return res.end("Not found"); }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "public, max-age=86400" }); res.end(d);
      });
    }
    if (p === "/") return send(res, 200, { name: "Maffed Construction API", status: "running" });
    res.writeHead(404); res.end("Not found");
  } catch (e) { send(res, e && e.message === "too large" ? 413 : 400, { error: "bad request" }); }
});
if (require.main === module) server.listen(PORT, () => { console.log("API running on port " + PORT); if (ADMIN_KEY === "change-me-123") console.log("WARNING: default ADMIN_KEY in use (testing only)."); });
module.exports = server;
