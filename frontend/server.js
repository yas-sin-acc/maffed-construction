/* Tiny static server for previewing the frontend on your computer: npm start  ->  http://localhost:5173 */
const http = require("http"), fs = require("fs"), path = require("path");
const T = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".pdf": "application/pdf", ".json": "application/json", ".ico": "image/x-icon" };
const root = __dirname;
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
  const f = path.resolve(root, "." + p);
  if (!f.startsWith(root + path.sep) || /server\.js|package\.json/.test(f)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end("Not found"); } res.writeHead(200, { "Content-Type": T[path.extname(f).toLowerCase()] || "application/octet-stream" }); res.end(d); });
}).listen(process.env.PORT || 5173, () => console.log("Website preview: http://localhost:" + (process.env.PORT || 5173) + "   (owner panel: /admin.html)\nMake sure the backend is running too (cd backend && npm start)."));
