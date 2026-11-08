/* ==================================================================
   main.js - Starts the store: menus, search box, dark-mode button and click handling.
   This file must load last.
   (file 16 of 16; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Start-up: menus, search, theme, page-wide events ---------- */
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hl = (text, toks) => (toks.length
  ? text.split(new RegExp("(" + toks.map(reEsc).join("|") + ")", "i")).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("")
  : esc(text));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/* page text from index.html in the chosen language, and the language menu in the header */
translateStatic();
$(".masthead .actions").insertAdjacentHTML("afterbegin", langPicker("langSel"));

/* menus */
$("#catNav").innerHTML = `<li><a class="deal" href="#/deals" data-cat="deals">${t("Today's deals")}</a></li><li><a href="#/s" data-cat="all">${t("All products")}</a></li>` +
  CATS.map(c => `<li><a href="#/c/${c.id}" data-cat="${c.id}">${esc(c.name)}</a></li>`).join("");
$("#searchCat").insertAdjacentHTML("beforeend", CATS.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(""));

/* theme: follows the device until the shopper picks one with the button */
const hostTheme = document.documentElement.getAttribute("data-theme");
function applyTheme(t) { if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); }
applyTheme(state.theme);
$("#themeBtn").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  state.theme = cur === "dark" ? "light" : "dark";
  save("theme"); applyTheme(state.theme);
});

/* search box with suggestions */
const input = $("#searchInput"), box = $("#suggest"), sug = { items: [], active: -1 };
function closeSuggest() {
  box.hidden = true; box.innerHTML = ""; sug.items = []; sug.active = -1;
  input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
}
function setActive(i) {
  sug.active = i;
  $$("#suggest li").forEach((li, k) => li.setAttribute("aria-selected", String(k === i)));
  if (i >= 0) input.setAttribute("aria-activedescendant", "sg-" + i); else input.removeAttribute("aria-activedescendant");
}
function openSuggest() {
  const q = input.value.trim(), toks = q.toLowerCase().split(/\s+/).filter(Boolean), cat = $("#searchCat").value;
  if (!toks.length) { closeSuggest(); return; }
  const prods = P.filter(p => !cat || p.cat === cat).map(p => {
    const t = p.title.toLowerCase(), k = p.kw.toLowerCase(), c = catName(p.cat).toLowerCase();
    let s = 0;
    for (const w of toks) { if (t.includes(w)) s += 3; else if (k.includes(w)) s += 2; else if (c.includes(w)) s += 1; else return null; }
    return { p, s };
  }).filter(Boolean).sort((a, b) => b.s - a.s || b.p.n - a.p.n).slice(0, 6).map(x => x.p);
  const cats = cat ? [] : CATS.filter(c => toks.every(w => c.name.toLowerCase().includes(w))).slice(0, 2);
  const icon = `<span class="thumb" aria-hidden="true" style="display:grid;place-items:center;background:var(--surface-2)"><svg style="width:20px;height:20px;fill:none"><use href="#i-search"/></svg></span>`;
  sug.items = [
    ...prods.map(p => ({ href: `#/p/${p.id}`, html: `<span class="thumb" aria-hidden="true">${art(p, 0)}</span><span>${hl(p.title, toks)}</span><small>${money(p.price)}</small>` })),
    ...cats.map(c => ({ href: `#/c/${c.id}`, html: `${icon}<span>${hl(c.name, toks)}</span><small>${t("Department")}</small>` })),
    { href: `#/s/${encodeURIComponent(q)}${cat ? "?cat=" + cat : ""}`, html: `${icon}<span>${t("Search all for {q}", { q: `<b>"${esc(q)}"</b>` })}</span>` }
  ];
  box.innerHTML = sug.items.map((it, i) => `<li role="option" id="sg-${i}" aria-selected="false" data-href="${esc(it.href)}">${it.html}</li>`).join("");
  box.hidden = false; sug.active = -1;
  input.setAttribute("aria-expanded", "true"); input.removeAttribute("aria-activedescendant");
}
input.addEventListener("input", openSuggest);
input.addEventListener("focus", () => { if (input.value.trim()) openSuggest(); });
input.addEventListener("blur", closeSuggest);
input.addEventListener("keydown", e => {
  if (box.hidden) { if (e.key === "ArrowDown" && input.value.trim()) { e.preventDefault(); openSuggest(); } return; }
  const n = sug.items.length;
  if (e.key === "ArrowDown") { e.preventDefault(); setActive((sug.active + 1) % n); }
  else if (e.key === "ArrowUp") { e.preventDefault(); setActive(sug.active <= 0 ? n - 1 : sug.active - 1); }
  else if (e.key === "Escape") { e.preventDefault(); closeSuggest(); }
  else if (e.key === "Enter" && sug.active >= 0) { e.preventDefault(); const href = sug.items[sug.active].href; closeSuggest(); go(href.slice(1)); }
});
box.addEventListener("mousedown", e => e.preventDefault());
box.addEventListener("click", e => { const li = e.target.closest("li"); if (li) { const href = li.dataset.href; closeSuggest(); go(href.slice(1)); } });
FORM.searchForm = () => {
  const q = input.value.trim(), cat = $("#searchCat").value;
  closeSuggest();
  if (!q && cat) go("/c/" + cat); else go("/s/" + encodeURIComponent(q) + (cat ? "?cat=" + cat : ""));
};
/* The box shows the query on a results page, is emptied on other list pages, and is left alone on product pages. */
function syncSearch() {
  if (route.name === "list" && route.mode === "search") { input.value = route.q; $("#searchCat").value = route.cat; }
  else if (route.name !== "product") { input.value = ""; $("#searchCat").value = ""; }
}

/* wish list and quick add (used by product cards and product pages) */
ACT.wish = el => {
  const id = Number(el.dataset.id), p = PM.get(id), on = toggleWish(id);
  if (route.name === "wishlist") { rerender(); focusFirst("#wishTitle", "#main"); toast(t("Removed from your wish list")); return; }
  $$(`[data-act="wish"][data-id="${id}"]`).forEach(b => {
    b.setAttribute("aria-pressed", String(on));
    if (b.classList.contains("heart")) b.setAttribute("aria-label", `${on ? t("Remove from wish list") : t("Add to wish list")}: ${p.title}`);
    else b.textContent = on ? t("Remove from wish list") : t("Add to wish list");
  });
  toast(on ? t("Saved to your wish list") : t("Removed from your wish list"), on ? { href: "#/wishlist", label: t("View") } : null);
};
ACT.add = el => {
  const id = Number(el.dataset.id), p = PM.get(id), line = state.cart.find(l => l.id === id && l.v === 0), before = line ? line.q : 0;
  if (!cartAdd(id, 0, 1)) { toast(t("Sorry, that item is unavailable")); return; }
  const after = state.cart.find(l => l.id === id && l.v === 0).q;
  if (after !== before) flyToCart(el);
  toast(after === before ? t("You already have the most you can order ({n})", { n: num(maxQty(p)) }) : t("Added to your cart"), { href: "#/cart", label: t("View cart") });
};

/* page-wide events */
document.addEventListener("click", e => {
  if (e.target.closest(".skip")) { e.preventDefault(); $("#main").focus(); return; }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act]) { ACT[a.dataset.act](a, e); return; }
  const link = e.target.closest('a[href^="#/"]');
  if (link && !e.defaultPrevented && e.button === 0 && !(e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) && !link.target) {
    e.preventDefault();
    closeSuggest();
    go(link.getAttribute("href").slice(1));
  } else if (!e.target.closest("#searchForm")) closeSuggest();
});
document.addEventListener("change", e => { const el = e.target.closest("[data-chg]"); if (el && CHG[el.dataset.chg]) CHG[el.dataset.chg](el, e); });
document.addEventListener("input", e => { const el = e.target; if (el.id && el.id.startsWith("co_")) CO[el.id.slice(3)] = el.value; });
document.addEventListener("submit", e => { const f = e.target; if (f.id && FORM[f.id]) { e.preventDefault(); FORM[f.id](f, e); } });
window.addEventListener("popstate", () => {
  if (!USER) return; // the sign-in screen is showing
  const h = location.hash;
  if (h.startsWith("#/")) { show(h.slice(1), false); syncSearch(); }
  else if (!h || h === "#") { show("/", false); syncSearch(); }
});
/* Sticky top bar: share its height with the CSS (--head-h), and add a shadow once the page scrolls under it */
const topnav = $("#topnav");
const setHeadH = () => document.documentElement.style.setProperty("--head-h", topnav.offsetHeight + "px");
setHeadH();
if ("ResizeObserver" in window) new ResizeObserver(setHeadH).observe(topnav); else addEventListener("resize", setHeadH);
const markStuck = () => topnav.classList.toggle("stuck", scrollY > 0);
markStuck();
addEventListener("scroll", markStuck, { passive: true });

$("#topBtn").addEventListener("click", () => { window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" }); $("#main").focus({ preventScroll: true }); });
$("#resetBtn").addEventListener("click", () => {
  try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* blocked */ }
  Object.keys(mem).forEach(k => delete mem[k]);
  if (!API_URL) { P.filter(isMine).forEach(p => unlist(p.id)); saveMine(); } // with the server, added products live in MySQL
  Object.assign(state, { cart: [], wish: [], recent: [], orders: [], reviews: {}, coupon: null, ship: "std", theme: null });
  Object.assign(CO, { name: fullName(USER), email: USER.email || "", street: "", city: "", region: "", zip: "", country: "United States" });
  if (hostTheme) document.documentElement.setAttribute("data-theme", hostTheme); else document.documentElement.removeAttribute("data-theme");
  updateCounts(); go("/");
  toast(t("Demo data reset"));
});

/* signed-in shopper: account menu in the header, and checkout starts with their name and email */
if (USER) {
  CO.name = fullName(USER); CO.email = USER.email || "";
  if (!IS_OWNER) $('.icon-btn[href="#/sell"]').remove();
  mountAccountMenu();
}

/* Products the owner adds or deletes on the shop server (MySQL) show up here too: checked on load,
   when the tab is shown again, and every 30 seconds. Restored store products need a reload. */
async function syncShop() {
  let s;
  try { s = await api("/products/state"); } catch (e) { return; /* server off: keep the last lists */ }
  const ids = (s.deleted || []).filter(Number.isFinite), added = (s.added || []).filter(Number.isFinite);
  let changed = false;
  if (!sameIds(ids, REMOVED)) {
    const back = REMOVED.some(id => !ids.includes(id));
    REMOVED = ids; saveSrvRemoved();
    if (back) { location.reload(); return; }
    ids.filter(id => PM.has(id)).forEach(id => { unlist(id); changed = true; });
  }
  /* the owner's own products: deleted ones go, new ones are fetched with their photos */
  P.filter(p => p.mine && !added.includes(p.id)).forEach(p => { unlist(p.id); changed = true; });
  if (added.some(id => !PM.has(id))) {
    try {
      (await api("/products/added")).forEach(j => {
        if (PM.has(j.id) || !added.includes(j.id)) return;
        const p = fromServer(j); P.push(p); PM.set(p.id, p); changed = true;
      });
    } catch (e) { /* try again next time */ }
  }
  if (!changed) return;
  saveSrvAdded();
  if (route.name !== "sell") rerender(); // don't wipe a half-filled Sell form
}

/* go (only after sign-in; otherwise auth.js shows the sign-in screen) */
if (USER) {
  updateCounts();
  show(location.hash.startsWith("#/") ? location.hash.slice(1) : "/", false);
  syncSearch();
  if (API_URL) {
    syncShop();
    setInterval(syncShop, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) syncShop(); });
  }
}
