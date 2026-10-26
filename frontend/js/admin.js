/* Owner panel. Customer requests wait here. Approve = published automatically. */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const U = (u) => (String(u).startsWith("/uploads/") ? API_BASE + u : u);
  let key = sessionStorage.getItem("akey") || "", data = { posts: [], messages: [], applications: [] }, tab = "waiting", flt = "all", files = [];
  const KINDS = { market: "Marketplace (sale)", rent: "Rent", hub: "Real Estate Hub", portfolio: "Company portfolio", bid: "Bid / tender", law: "Law / regulation", map: "Map location" };
  const TYPES = { market: [["land", "Land for sale"], ["house", "House for sale"], ["unfin", "Unfinished site"]], rent: [["bld", "Building"], ["guest", "Guest house"], ["apt", "Apartment"], ["shopr", "Shop"], ["offr", "Office space"], ["wh", "Warehouse"]], portfolio: [["civil", "Civil Works"], ["office", "Office Fit-outs"], ["design", "Design & Consulting"]] };
  const api = async (path, body) => {
    const r = await fetch(API_BASE + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-admin-key": key }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401) { sessionStorage.removeItem("akey"); if (!$("#panel").hidden) location.reload(); throw 0; }
    if (!r.ok) throw new Error("request failed"); return r.json();
  };
  const media = (m) => (m || []).map((x) => x.type === "image" ? `<img src="${esc(U(x.url))}" alt="">` : x.type === "video" ? `<video src="${esc(U(x.url))}" controls preload="metadata"></video>` : `<a class="btn out sm" target="_blank" href="${esc(U(x.url))}">PDF: ${esc(x.name)}</a>`).join("");
  const when = (t) => new Date(t).toLocaleString();
  const waiting = () => data.posts.filter((p) => p.status === "pending" || p.status === "info");
  function item(p) {
    const c = p.contact, w = p.status === "pending" || p.status === "info";
    return `<div class="box item"><div class="thumbs">${media(p.media) || "<small>No media</small>"}</div><div>
      <span class="tag ${p.status}">${p.status === "info" ? "needs info" : p.status}</span> <span class="tag">${KINDS[p.kind] || p.kind}${p.type ? " / " + esc(p.type) : ""}</span> <small>${p.source === "company" ? "Company post" : "Customer request #" + esc(p.code)} · ${when(p.createdAt)}</small>
      <h3 style="margin-top:6px">${esc(p.title)}</h3>
      <p><small>${[p.location, p.area && p.area + " m²", p.purpose, p.price, p.deadline && "Deadline: " + p.deadline, p.year, p.stage].filter(Boolean).map(esc).join(" · ")}</small></p>
      ${p.link ? `<p><a class="link" target="_blank" rel="noopener" href="${esc(p.link)}">${esc(p.link)}</a></p>` : ""}<p class="pre">${esc(p.details)}</p>${p.criteria ? `<p class="pre"><b>Criteria:</b> ${esc(p.criteria)}</p>` : ""}
      ${c ? `<div class="contactbox"><b>Owner of the property:</b> ${esc(c.name)} · ${esc(c.phone)} ${c.email ? "· " + esc(c.email) : ""}</div>` : ""}
      ${p.note ? `<p><b>Note:</b> ${esc(p.note)}</p>` : ""}
      <div class="acts">${p.status !== "approved" ? `<button class="btn green sm" data-do="approved|${p.id}">Approve and publish</button>` : ""}${w && p.source !== "company" ? `<button class="btn blue sm" data-do="info|${p.id}">Ask for more info</button>` : ""}${p.status !== "rejected" ? `<button class="btn red sm" data-do="rejected|${p.id}">Reject</button>` : ""}<button class="btn out sm" data-del="${p.id}">Delete</button></div></div></div>`;
  }
  function newForm() {
    return `<form class="box form" id="nf" style="grid-template-columns:1fr"><h3>Post directly to the website (published immediately)</h3>
      <label>Where to post<select name="kind" id="nk">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <label id="wtype">Type<select name="type" id="nt"></select></label>
      <label id="wtitle">Title / place name<input required name="title"></label><label id="wloc">Location<input name="location"></label>
      <label id="wlink">Link (Google Maps location link, or official website)<input name="link" placeholder="https://..."></label>
      <div class="form" id="wnum"><label>Area (m²)<input name="area"></label><label>Price / budget<input name="price"></label></div>
      <label id="wpur">Purpose<select name="purpose"><option value="shop">Shopping</option><option value="live">Living</option><option value="office">Office</option><option value="other">Other</option></select></label>
      <div class="form" id="wport"><label>Year<input name="year"></label><label>Status<select name="stage"><option>Completed</option><option>Ongoing</option></select></label></div>
      <div id="wbid"><label>Deadline<input name="deadline" placeholder="e.g. 30 Nov 2026"></label><label>Criteria (requirements for applicants)<textarea name="criteria" rows="4"></textarea></label></div>
      <label id="wdet">Details<textarea name="details" rows="4"></textarea></label>
      <label id="wfile">Files: photos, videos, or PDF documents (bid documents, law PDFs). Each up to 25 MB<input type="file" id="nfile" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf"></label><div class="prev" id="nprev"></div>
      <div class="acts"><button class="btn" type="submit">Publish now</button></div><p class="ok" id="nmsg" hidden></p></form>`;
  }
  function syncForm() {
    const k = $("#nk").value, t = TYPES[k];
    $("#wtype").hidden = !t; $("#nt").innerHTML = (t || []).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    $("#wloc").hidden = ["law", "map"].includes(k); $("#wlink").hidden = !["map", "law"].includes(k); $("#wnum").hidden = !["market", "rent", "bid"].includes(k);
    $("#wpur").hidden = k !== "rent"; $("#wport").hidden = k !== "portfolio"; $("#wbid").hidden = k !== "bid"; $("#wdet").hidden = k === "map"; $("#wfile").hidden = k === "map";
  }
  function show() {
    const wl = waiting();
    $("#stats").innerHTML = `<div><b>${wl.length}</b>waiting for your decision</div><div><b>${data.posts.filter((p) => p.status === "approved").length}</b>published</div><div><b>${data.applications.length}</b>bid applications</div><div><b>${data.messages.length}</b>messages</div>`;
    const tl = [["waiting", `Customer requests (${wl.length})`], ["all", "All posts"], ["new", "Post directly"], ["apps", `Bid applications (${data.applications.length})`], ["msg", `Messages (${data.messages.length})`]];
    $("#tabs").innerHTML = tl.map(([v, l]) => `<button class="tab${tab === v ? " on" : ""}" data-tab="${v}">${l}</button>`).join("");
    let h = "";
    if (tab === "waiting") h = wl.map(item).join("") || '<div class="box">Nothing waiting. New customer requests appear here.</div>';
    if (tab === "all") h = `<div class="box"><label>Show <select id="flt"><option value="all">All kinds</option>${Object.entries(KINDS).map(([k, v]) => `<option value="${k}"${flt === k ? " selected" : ""}>${v}</option>`).join("")}</select></label></div>` + (data.posts.filter((p) => flt === "all" || p.kind === flt).map(item).join("") || '<div class="box">No posts.</div>');
    if (tab === "new") h = newForm();
    if (tab === "apps") h = data.applications.map((a) => `<div class="box"><small>${when(a.at)}</small><h3>${esc(a.bidTitle)}</h3><p><b>${esc(a.name)}</b> · ${esc(a.phone)} ${a.email ? "· " + esc(a.email) : ""}</p><p class="pre">${esc(a.message)}</p><div class="acts">${(a.media || []).map((m) => `<a class="btn out sm" target="_blank" href="${esc(U(m.url))}">${esc(m.name)}</a>`).join("")}<button class="btn out sm" data-adel="${a.id}">Delete</button></div></div>`).join("") || '<div class="box">No bid applications yet.</div>';
    if (tab === "msg") h = data.messages.map((m) => `<div class="box"><small>${when(m.at)}</small><h3>${esc(m.name)} · ${esc(m.phone)} ${m.email ? "· " + esc(m.email) : ""}</h3><p><b>${esc(m.service)}</b></p><p class="pre">${esc(m.message)}</p><button class="btn out sm" data-mdel="${m.id}">Delete</button></div>`).join("") || '<div class="box">No messages.</div>';
    $("#view").innerHTML = h;
    if (tab === "new") {
      syncForm(); $("#nk").onchange = syncForm; files = [];
      $("#nfile").onchange = (e) => { files = []; $("#nprev").innerHTML = ""; [...e.target.files].slice(0, 10).forEach((f) => { if (f.size > 25e6) { alert(f.name + ": max 25 MB"); return; } const r = new FileReader(); r.onload = () => { files.push({ name: f.name, dataUrl: r.result }); $("#nprev").insertAdjacentHTML("beforeend", f.type.startsWith("image") ? `<img src="${r.result}" alt="">` : `<span>${esc(f.name)}</span>`); }; r.readAsDataURL(f); }); };
      $("#nf").onsubmit = async (e) => {
        e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.media = files; const m = $("#nmsg"); m.hidden = false; m.textContent = "Publishing...";
        try { await api("/api/admin/post", b); await refresh("all"); } catch (x) { m.textContent = "Failed. Is a file too large?"; }
      };
    }
    if (tab === "all") $("#flt").onchange = (e) => { flt = e.target.value; show(); };
  }
  async function refresh(t) { data = await api("/api/admin/data"); if (t) tab = t; show(); }
  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-tab],[data-do],[data-del],[data-mdel],[data-adel]"); if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; show(); }
    else if (t.dataset.do) {
      const [s, id] = t.dataset.do.split("|"); let note = "";
      if (s === "rejected") { note = prompt("Reason for rejection (the customer will see this):"); if (note === null) return; }
      if (s === "info") { note = prompt("What information or document do you need? (the customer will see this):"); if (note === null) return; }
      await api("/api/admin/decide", { id, status: s, note }); refresh();
    }
    else if (t.dataset.del) { if (confirm("Delete this post and its files?")) { await api("/api/admin/delete", { id: t.dataset.del }); refresh(); } }
    else if (t.dataset.adel) { await api("/api/admin/appdelete", { id: t.dataset.adel }); refresh(); }
    else if (t.dataset.mdel) { await api("/api/admin/msgdelete", { id: t.dataset.mdel }); refresh(); }
  });
  $("#out").onclick = () => { sessionStorage.removeItem("akey"); location.reload(); };
  async function enter() { try { await refresh(); $("#login").hidden = true; $("#panel").hidden = false; } catch (x) { $("#lerr").hidden = false; $("#lerr").textContent = "Could not log in. Is the backend running?"; } }
  $("#lf").onsubmit = async (e) => { e.preventDefault(); key = $("#key").value; try { data = await api("/api/admin/data"); sessionStorage.setItem("akey", key); $("#login").hidden = true; $("#panel").hidden = false; show(); } catch (x) { $("#lerr").hidden = false; $("#lerr").textContent = "Wrong password, or the backend is not reachable."; } };
  if (key) enter();
  setInterval(() => { if ($("#panel").hidden || tab === "new") return; api("/api/admin/data").then((d) => { if (d.posts.length !== data.posts.length || d.messages.length !== data.messages.length || d.applications.length !== data.applications.length) { data = d; show(); } }).catch(() => {}); }, 20000);
})();
