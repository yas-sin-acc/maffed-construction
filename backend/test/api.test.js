const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), os = require("os"), path = require("path");
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "maffed-")); process.env.ADMIN_KEY = "test-key";
const server = require("../server.js");
let base; const A = { "Content-Type": "application/json", "x-admin-key": "test-key" };
const call = async (p, body, headers) => { const r = await fetch(base + p, { method: body ? "POST" : "GET", headers: headers || { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
test.before(() => new Promise((ok) => server.listen(0, () => { base = "http://localhost:" + server.address().port; ok(); })));
test.after(() => server.close());
const jpg = "data:image/jpeg;base64," + Buffer.from("fakejpg").toString("base64");
test("customer post stays hidden until approved, then goes live without private data", async () => {
  const r = await call("/api/submit", { kind: "rent", type: "guest", title: "Guest house", name: "Abebe", phone: "0911", details: "x", media: [{ name: "a.jpg", dataUrl: jpg }] });
  assert.equal(r.s, 200); assert.equal((await call("/api/posts")).j.length, 0);
  assert.equal((await call("/api/status/" + r.j.code)).j.status, "pending");
  assert.equal((await call("/api/admin/data")).s, 401);
  assert.equal((await call("/api/admin/decide", { id: r.j.id, status: "approved" }, A)).s, 200);
  const pubs = (await call("/api/posts")).j; assert.equal(pubs.length, 1); assert.ok(!JSON.stringify(pubs).includes("0911"));
});
test("reject and 'more info' statuses carry a note", async () => {
  const r = await call("/api/submit", { kind: "market", type: "land", title: "Land", name: "C", phone: "2", details: "d" });
  await call("/api/admin/decide", { id: r.j.id, status: "info", note: "Send title deed" }, A);
  assert.deepEqual((await call("/api/status/" + r.j.code)).j.status, "info");
  await call("/api/admin/decide", { id: r.j.id, status: "rejected", note: "No deed" }, A);
  assert.equal((await call("/api/status/" + r.j.code)).j.note, "No deed");
});
test("customers cannot post as the company; company posts publish directly (bid, map, law)", async () => {
  assert.equal((await call("/api/submit", { kind: "bid", title: "x", name: "a", phone: "1" })).s, 400);
  for (const kind of ["bid", "map", "law"]) assert.equal((await call("/api/admin/post", { kind, title: "T " + kind, link: "https://maps.app.goo.gl/x", details: "d" }, A)).s, 200);
  const bid = (await call("/api/posts")).j.find((p) => p.kind === "bid");
  assert.equal((await call("/api/apply", { bidId: bid.id, name: "N", phone: "1", message: "m", media: [{ name: "d.pdf", dataUrl: "data:application/pdf;base64,JVBERg==" }] })).s, 200);
  assert.equal((await call("/api/admin/data", null, A)).j.applications.length, 1);
});
test("rejects unsafe uploads and path traversal", async () => {
  const r = await call("/api/submit", { kind: "hub", title: "H", name: "a", phone: "1", media: [{ name: "x.exe", dataUrl: "data:application/x-msdownload;base64,AAAA" }] });
  const posts = (await call("/api/admin/data", null, A)).j.posts; assert.equal(posts.find((p) => p.id === r.j.id).media.length, 0);
  const t = await fetch(base + "/uploads/..%2f..%2fserver.js"); assert.notEqual(t.status, 200);
});
