/* ==================================================================
   core.js - Helpers, the saved cart and wish list, price maths, and the page switcher (router).
   (file 8 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Core: helpers, saved state, cart maths, router ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const catName = id => (CATS.find(c => c.id === id) || {}).name || "";
const disc = p => (p.was ? Math.round((1 - p.price / p.was) * 100) : 0);
const when = d => fmtDate(d, { weekday: "short", month: "short", day: "numeric" });
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

/* Saved in this browser only, under the signed-in account (bz:<user id>:cart and so on).
   If storage is blocked, the shop still works until the page closes. */
const KEY = "bz:" + (USER ? USER.id + ":" : "");
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); if (v !== null) return JSON.parse(v); } catch (e) { /* blocked */ } return k in mem ? mem[k] : d; },
  set(k, v) { mem[k] = v; try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* blocked */ } }
};
const arr = v => (Array.isArray(v) ? v : []);
const state = {
  cart: arr(store.get("cart", [])).filter(l => l && PM.has(l.id) && l.q > 0),
  wish: arr(store.get("wish", [])).filter(id => PM.has(id)),
  recent: arr(store.get("recent", [])).filter(id => PM.has(id)),
  orders: arr(store.get("orders", [])),
  reviews: store.get("reviews", {}) || {},
  coupon: store.get("coupon", null),
  ship: store.get("ship", "std") === "exp" ? "exp" : "std",
  theme: store.get("theme", null)
};
const save = k => store.set(k, state[k]);

/* ---------- cart ---------- */
const maxQty = p => Math.min(p.stock, 10);
function cartAdd(id, q = 1) {
  const p = PM.get(id);
  if (!p || p.stock < 1) return false;
  const line = state.cart.find(l => l.id === id);
  if (line) line.q = Math.min(maxQty(p), line.q + q); else state.cart.push({ id, q: Math.min(maxQty(p), q) });
  save("cart"); updateCounts();
  return true;
}
function cartSet(id, q) {
  const i = state.cart.findIndex(l => l.id === id);
  if (i < 0) return;
  const p = PM.get(id);
  if (q <= 0) state.cart.splice(i, 1); else state.cart[i].q = Math.min(maxQty(p), q);
  save("cart"); updateCounts();
}
function totals() {
  const items = state.cart.map(l => ({ ...l, p: PM.get(l.id) })).filter(l => l.p);
  // all in rupees, rounded like they are shown (whole rupees)
  const sub = roundCur(items.reduce((s, l) => s + l.p.price * l.q, 0));
  const count = items.reduce((s, l) => s + l.q, 0);
  const cp = state.coupon && COUPONS[state.coupon];
  const off = cp && cp.kind === "pct" ? roundCur(sub * cp.value / 100) : 0;
  let ship = 0;
  if (items.length) ship = state.ship === "exp" ? SHIP_EXP : (sub >= FREE_SHIP_MIN || (cp && cp.kind === "ship") ? 0 : SHIP_STD);
  return { items, count, sub, off, ship, total: roundCur(sub - off + ship), toFree: Math.max(0, roundCur(FREE_SHIP_MIN - sub)) };
}
function updateCounts() {
  const n = state.cart.reduce((s, l) => s + l.q, 0);
  $("#cartCount").textContent = n ? num(n) : "";
  $("#wishCount").textContent = state.wish.length ? num(state.wish.length) : "";
}
function toggleWish(id) {
  const i = state.wish.indexOf(id);
  if (i < 0) state.wish.push(id); else state.wish.splice(i, 1);
  save("wish"); updateCounts();
  return i < 0;
}
function addRecent(id) {
  state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 8);
  save("recent");
}

/* ---------- small building blocks ---------- */
const STAR_ROW = `<svg viewBox="0 0 108 20" aria-hidden="true">${[0, 22, 44, 66, 88].map(x => `<use href="#i-star" x="${x}" width="20" height="20"/>`).join("")}</svg>`;
const stars = r => `<span class="stars" role="img" aria-label="${t("{n} out of 5 stars", { n: num(r) })}"><span class="base">${STAR_ROW}</span><span class="fill" style="width:${(r / 5 * 100).toFixed(1)}%">${STAR_ROW}</span></span>`;

/* How many are left, so shoppers can see it: "12 left in stock", or from 5 down "Only 3 left in stock" */
const stockLeft = p => (p.stock <= 5
  ? `<span class="stock-low">${t("Only {n} left in stock", { n: num(p.stock) })}</span>`
  : `<span class="stock-ok">${t("{n} left in stock", { n: num(p.stock) })}</span>`);

function card(p) {
  const wished = state.wish.includes(p.id), d = disc(p), out = p.stock < 1;
  const badge = out ? "" : d >= 20 ? `<span class="badge sale">-${d}%</span>` : p.age <= 15 ? `<span class="badge">${t("New")}</span>` : p.n >= 4000 ? `<span class="badge">${t("Best seller")}</span>` : "";
  return `<article class="card">
    ${badge}
    <button class="heart" type="button" data-act="wish" data-id="${p.id}" aria-pressed="${wished}" aria-label="${wished ? t("Remove from wish list") : t("Add to wish list")}: ${esc(p.title)}"><svg aria-hidden="true"><use href="#i-heart"/></svg></button>
    ${art(p)}
    <a class="title" href="#/p/${p.id}">${esc(p.title)}</a>
    <div class="rate">${stars(p.rating)}<b>${num(p.rating, 1)}</b><span>(${num(p.n)})</span></div>
    <div class="price-row"><span class="price">${money(p.price)}</span>${p.was ? `<span class="was">${money(p.was)}</span>` : ""}${d && (out || d < 20) ? `<span class="off">-${d}%</span>` : ""}</div>
    ${out ? "" : stockLeft(p)}
    ${out ? `<span class="stock-out">${t("Currently unavailable")}</span>` : p.price >= FREE_SHIP_MIN ? `<span class="ship">${t("Free delivery")}</span>` : `<span class="muted" style="font-size:.8rem">${t("Free delivery over {amount}", { amount: money(FREE_SHIP_MIN) })}</span>`}
    <button class="btn brand small" type="button" data-act="add" data-id="${p.id}" ${out ? "disabled" : ""}>${out ? t("Unavailable") : t("Add to cart")}</button>
    ${IS_OWNER ? `<button class="btn danger small" type="button" data-act="unsell" data-id="${p.id}" aria-label="${t("Delete {name}", { name: esc(p.title) })}">${t("Delete item")}</button>` : ""}
  </article>`;
}
const emptyState = (title, text, link, label) => `<div class="empty"><svg aria-hidden="true" style="fill:none"><use href="#i-bag"/></svg><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><a class="btn primary" href="${link}">${esc(label)}</a></div>`;

function toast(msg, link) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = `<span>${esc(msg)}</span>${link ? `<a href="${link.href}">${esc(link.label)}</a>` : ""}`;
  const box = $("#toasts");
  while (box.children.length >= 3) box.firstElementChild.remove();
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/* ---------- shop server (API_URL in data.js) ----------
   The owner's token comes from "Connect" on the Sell page and lets them delete for everyone. */
const ownerToken = () => { try { return localStorage.getItem("bz:ownerToken") || ""; } catch (e) { return ""; } };
async function api(path, opts = {}) {
  // ngrok-skip-browser-warning: the free ngrok link otherwise answers with a "you are about to visit" page
  const headers = { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" }, t = ownerToken();
  if (t) headers.Authorization = "Bearer " + t;
  const signal = AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined; // laptop off or slow: give up after 20 s
  const res = await fetch(API_URL + "/api" + path, { ...opts, headers, signal });
  if (!res.ok) throw Object.assign(new Error("Server error " + res.status), { status: res.status });
  return res.json();
}
/* A product the owner added, as the server sends it (toJson in backend/src/main/java/com/shopnest/ShopApi.java) */
const fromServer = j => inShopCurrency(Object.assign(
  mk(j.id, j.cat, j.art || "box", j.title, j.price, j.was, j.rating, j.n, j.stock, j.colors, j.bullets, j.specs, j.kw, j.age),
  { photo: j.photo, mine: true, created: j.created, usd: j.price, usdWas: j.was || 0 })); // the server's prices are in US dollars
/* Keep a copy of the server's added products, so they show straight away on the next visit */
const saveSrvAdded = () => {
  try { localStorage.setItem("bz:srvAdded", JSON.stringify(P.filter(p => p.mine))); }
  catch (e) { try { localStorage.removeItem("bz:srvAdded"); } catch (x) { /* blocked */ } /* full: they load from the server again */ }
};
function serverError(e) {
  if (e.status === 401) { try { localStorage.removeItem("bz:ownerToken"); } catch (x) { /* blocked */ } return t("The shop server needs your owner password again (Sell page)."); }
  return e.status ? t("The shop server could not do that (error {n}).", { n: e.status }) : t("Can't reach the shop server. Is it running? (start.bat)");
}

/* Added to cart: a copy of the product photo flies into the cart icon, then the icon bounces with a tick */
function flyToCart(from) {
  const cart = $('.icon-btn[href="#/cart"]');
  const pic = from && (from.closest(".card, .line") || from).querySelector(".art");
  const src = pic || from;
  const done = () => { cart.classList.remove("bump"); void cart.offsetWidth; cart.classList.add("bump"); };
  if (!cart || !src || !document.body.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) { if (cart) done(); return; }
  const a = src.getBoundingClientRect(), b = cart.getBoundingClientRect();
  const size = Math.min(a.width, a.height, 120);
  const fly = (pic ? pic.cloneNode(true) : document.createElement("div"));
  fly.classList.add("fly");
  fly.setAttribute("aria-hidden", "true");
  Object.assign(fly.style, { width: size + "px", height: size + "px", left: a.left + (a.width - size) / 2 + "px", top: a.top + (a.height - size) / 2 + "px" });
  document.body.appendChild(fly);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = fly.animate([
    { transform: "translate(0,0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * .5}px, ${dy * .5 - 60}px) scale(.6)`, opacity: 1, offset: .5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: .4 }
  ], { duration: 700, easing: "cubic-bezier(.5,0,.6,1)" });
  anim.onfinish = () => { fly.remove(); done(); };
}

/* ---------- router (in-page; links look like #/p/3) ---------- */
const VIEWS = {};
const ACT = {};
const timers = [];
let current = "/", route = { name: "home" };
function parse(path) {
  const [p, qs] = path.split("?");
  const seg = p.split("/").filter(Boolean).map(s => { try { return decodeURIComponent(s); } catch (e) { return s; } });
  const [a, b] = seg, q = new URLSearchParams(qs || "");
  if (!a) return { name: "home" };
  if (a === "deals") return { name: "list", mode: "deals" };
  if (a === "c" && b) return { name: "list", mode: "cat", cat: b };
  if (a === "s") return { name: "list", mode: "search", q: b || "", cat: q.get("cat") || "" };
  if (a === "p" && b) return { name: "product", id: Number(b) };
  if (a === "sell") return { name: "sell", title: q.get("name") || "", cat: q.get("cat") || "" };
  if (["cart", "checkout", "orders", "wishlist", "account"].includes(a)) return { name: a };
  if (a === "done" && b) return { name: "done", id: b };
  return { name: "home" };
}
function show(path, focus) {
  current = path; route = parse(path);
  timers.splice(0).forEach(t => clearInterval(t));
  const view = (VIEWS[route.name] || VIEWS.home)(route);
  const main = $("#main");
  main.innerHTML = view.html;
  if (view.mount) view.mount();
  $$(".rail, .dept-grid", main).forEach(hscroll);
  markNav();
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  if (focus) main.focus({ preventScroll: true });
}

/* Rows that scroll sideways (product rails, the department row) get ‹ › buttons at both ends.
   A button shows only when there is more to see that way; a click moves the row by most of its width. */
function hscroll(row) {
  if (row.dataset.hs) return;
  row.dataset.hs = "1";
  const box = document.createElement("div");
  box.className = "hs" + (row.closest(".catnav") ? " hs-small" : "");
  row.parentNode.insertBefore(box, row);
  box.appendChild(row);
  const button = dir => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hs-btn hs-" + dir;
    b.tabIndex = -1; // keyboard users move through the row's own links instead
    b.setAttribute("aria-hidden", "true");
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    b.addEventListener("click", () => {
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      row.scrollBy({ left: (dir === "prev" ? -1 : 1) * Math.max(160, row.clientWidth * 0.8), behavior: smooth ? "smooth" : "auto" });
    });
    box.appendChild(b);
    return b;
  };
  const prev = button("prev"), next = button("next");
  const update = () => {
    const end = row.scrollWidth - row.clientWidth - 2;
    prev.hidden = row.scrollLeft <= 2;
    next.hidden = row.scrollLeft >= end;
  };
  row.addEventListener("scroll", update, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(update).observe(row); else addEventListener("resize", update);
  update();
}
function go(path, opts = {}) {
  if (!opts.replace) { try { history.pushState({ path }, "", "#" + path); } catch (e) { /* not allowed here */ } }
  show(path, true);
  syncSearch();
}
function rerender(focusSel) {
  const y = window.scrollY;
  show(current, false);
  window.scrollTo({ top: y, left: 0, behavior: "instant" });
  if (focusSel) { const el = $(focusSel); if (el) el.focus({ preventScroll: true }); }
}
function markNav() {
  $$("#catNav a").forEach(a => {
    const on = (route.name === "list" && route.mode === "cat" && a.dataset.cat === route.cat) || (route.name === "list" && route.mode === "deals" && a.dataset.cat === "deals");
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
