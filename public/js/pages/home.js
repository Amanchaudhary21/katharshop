/* ==================================================================
   home.js - Home page, product lists, search results and filters.
   (file 9 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Home ---------- */
const CHG = {};
let heroSet = () => {}, heroHold = false;
ACT.slide = el => heroSet(Number(el.dataset.i));
ACT.slidepause = el => {
  heroHold = !heroHold;
  el.setAttribute("aria-pressed", String(heroHold));
  el.setAttribute("aria-label", heroHold ? t("Play slideshow") : t("Pause slideshow"));
};

/* Banners (HERO in data.js) whose department has products; the picture is that department's newest product */
const heroSlides = () => HERO.map(s => ({ ...s, pic: P.filter(p => p.cat === s.cat).sort((a, b) => a.age - b.age || b.id - a.id)[0] })).filter(s => s.pic);
function heroHtml(slides) {
  if (!slides.length) return "";
  return `<section class="hero" aria-roledescription="carousel" aria-label="${t("Featured offers")}">
    ${slides.map((s, i) => `<div class="slide${i === 0 ? " on" : ""}" style="--s-bg:${s.bg};--s-ink:${s.ink}" role="group" aria-roledescription="slide" aria-label="${t("{n} of {total}", { n: num(i + 1), total: num(slides.length) })}">
      <div><h2>${esc(s.h)}</h2><p>${esc(s.t)}</p><a class="btn" href="${s.to}">${esc(s.cta)}</a></div>
      ${art(s.pic, 0)}
    </div>`).join("")}
    ${slides.length > 1 ? `<div class="hero-ctl"><button type="button" class="hero-pause" data-act="slidepause" aria-pressed="false" aria-label="${t("Pause slideshow")}"></button>${slides.map((s, i) => `<button type="button" data-act="slide" data-i="${i}" aria-label="${t("Show slide {n}", { n: num(i + 1) })}" aria-current="${i === 0}"></button>`).join("")}</div>` : ""}
  </section>`;
}
/* The shop has no products yet: the owner gets a button to add the first one */
function noProductsYet() {
  return `<div class="empty"><svg aria-hidden="true" style="fill:none"><use href="#i-bag"/></svg><h2>${t("No products yet")}</h2>
    <p class="muted">${IS_OWNER ? t("Add your first product on the Sell page. It is saved in the database, and every shopper sees it.") : t("New products are coming soon. Please check back later.")}</p>
    ${IS_OWNER ? `<a class="btn primary" href="#/sell"><svg aria-hidden="true" style="width:18px;height:18px;fill:none"><use href="#i-plus"/></svg>${t("Add a product")}</a>` : ""}</div>`;
}
function deptCard(c) {
  const items = P.filter(p => p.cat === c.id).slice(0, 4);
  /* short name: English keeps the first words, the other languages put the thing itself last */
  const short = s => { const w = s.split(/[,(、，]| with | and /)[0].trim().split(" "); return LANG === "en" ? w.slice(0, 3).join(" ") : w.slice(-2).join(" "); };
  return `<section class="dept" aria-label="${esc(c.name)}"><h3>${esc(c.name)}</h3><p class="muted" style="font-size:.88rem">${esc(c.blurb)}</p>
    <div class="minis">${items.map(p => `<a href="#/p/${p.id}">${art(p, 0)}<span>${esc(short(p.title))}</span></a>`).join("")}</div>
    <a href="#/c/${c.id}">${t("See all {name}", { name: esc(c.name) })}</a></section>`;
}
VIEWS.home = () => {
  const title = `<h1 class="sr">${BRAND}: ${t("everyday essentials, delivered")}</h1>`;
  if (!P.length) return { html: title + noProductsYet() };
  const banners = heroSlides();
  const depts = CATS.filter(c => P.some(p => p.cat === c.id));
  const deals = P.filter(p => p.was && p.stock > 0).sort((a, b) => disc(b) - disc(a)).slice(0, 10);
  /* best sellers once products have ratings; until then the newest products */
  const rated = P.some(p => p.n > 0);
  const best = [...P].sort(rated ? (a, b) => b.n - a.n : (a, b) => a.age - b.age || b.id - a.id).slice(0, 8);
  const recent = state.recent.map(id => PM.get(id)).filter(Boolean).slice(0, 8);
  return {
    html: `${title}
      ${heroHtml(banners)}
      ${depts.length ? `<section class="sec" aria-labelledby="h-dept"><div class="sec-head"><h2 id="h-dept">${t("Shop by department")}</h2></div><div class="dept-grid">${depts.map(deptCard).join("")}</div></section>` : ""}
      ${deals.length ? `<section class="sec" aria-labelledby="h-deals"><div class="sec-head"><div class="row"><h2 id="h-deals">${t("Today's deals")}</h2><span class="timer" title="${t("Time left today")}" id="dealTimer">--:--:--</span></div><a href="#/deals">${t("See all deals")}</a></div><div class="rail">${deals.map(card).join("")}</div></section>` : ""}
      <section class="sec" aria-labelledby="h-best"><div class="sec-head"><h2 id="h-best">${rated ? t("Best sellers") : t("Newest arrivals")}</h2><a href="#/s">${t("All products")}</a></div><div class="grid">${best.map(card).join("")}</div></section>
      ${recent.length ? `<section class="sec" aria-labelledby="h-rec"><div class="sec-head"><h2 id="h-rec">${t("Pick up where you left off")}</h2></div><div class="rail">${recent.map(card).join("")}</div></section>` : ""}`,
    mount() {
      const slides = $$(".slide"), dots = $$(".hero-ctl button[data-i]"), hero = $(".hero");
      let i = 0, paused = false;
      heroHold = false;
      const tint = k => { hero.style.setProperty("--s-ink", banners[k].ink); hero.style.setProperty("--s-bg", banners[k].bg); };
      heroSet = n => {
        i = (n + slides.length) % slides.length;
        tint(i);
        slides.forEach((s, k) => s.classList.toggle("on", k === i));
        dots.forEach((d, k) => d.setAttribute("aria-current", String(k === i)));
      };
      if (hero) {
        tint(0);
        ["mouseenter", "focusin"].forEach(ev => hero.addEventListener(ev, () => { paused = true; }));
        ["mouseleave", "focusout"].forEach(ev => hero.addEventListener(ev, () => { paused = false; }));
        if (slides.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) timers.push(setInterval(() => { if (!paused && !heroHold && !document.hidden) heroSet(i + 1); }, 6500));
      }
      const f = n => String(n).padStart(2, "0");
      const tick = () => {
        const now = new Date(), end = new Date(now);
        end.setHours(24, 0, 0, 0);
        const s = Math.max(0, Math.floor((end - now) / 1000)), el = $("#dealTimer");
        if (el) el.textContent = `${f(Math.floor(s / 3600))}:${f(Math.floor(s % 3600 / 60))}:${f(s % 60)}`;
      };
      tick(); timers.push(setInterval(tick, 1000));
    }
  };
};

/* ---------- Product lists: category, deals, search ---------- */
const PRICE_BANDS = [["", "Any price"], ["0-25", "Under $25"], ["25-50", "$25 to $50"], ["50-100", "$50 to $100"], ["100-250", "$100 to $250"], ["250-", "$250 and above"]].map(([v, l]) => [v, t(l)]);
const SORTS = [["featured", "Featured"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["rating", "Average rating"], ["new", "Newest arrivals"], ["off", "Biggest discount"]].map(([v, l]) => [v, t(l)]);
const fresh = key => ({ key, sort: "featured", band: "", min: "", max: "", rating: 0, sale: false, stock: false, cat: "" });
let LF = fresh(""), LB = [];

function baseList(r) {
  if (r.mode === "deals") return P.filter(p => p.was).sort((a, b) => disc(b) - disc(a));
  if (r.mode === "cat") return P.filter(p => p.cat === r.cat);
  const toks = r.q.toLowerCase().split(/\s+/).filter(Boolean);
  let out = P.map(p => {
    const t = p.title.toLowerCase(), k = p.kw.toLowerCase(), c = catName(p.cat).toLowerCase();
    let s = 0;
    for (const w of toks) { if (t.includes(w)) s += 3; else if (k.includes(w)) s += 2; else if (c.includes(w)) s += 1; else return null; }
    return { p, s };
  }).filter(Boolean);
  if (r.cat) out = out.filter(x => x.p.cat === r.cat);
  return out.sort((a, b) => b.s - a.s || b.p.n - a.p.n).map(x => x.p);
}
function applyFilters(list) {
  let bMin = 0, bMax = Infinity;
  if (LF.band) { const [a, b] = LF.band.split("-"); bMin = Number(a) || 0; bMax = b ? Number(b) : Infinity; }
  const iMin = LF.min !== "" ? Number(LF.min) || 0 : 0, iMax = LF.max !== "" ? (Number(LF.max) || 0) : Infinity;
  let out = list.filter(p => p.price >= bMin && p.price < bMax && p.price >= iMin && p.price <= iMax &&
    p.rating >= LF.rating && (!LF.sale || p.was) && (!LF.stock || p.stock > 0) && (!LF.cat || p.cat === LF.cat));
  const cmp = { "price-asc": (a, b) => a.price - b.price, "price-desc": (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating || b.n - a.n, new: (a, b) => a.age - b.age, off: (a, b) => disc(b) - disc(a) }[LF.sort];
  return cmp ? out.sort(cmp) : out;
}
function filtersHtml(r) {
  const counts = CATS.map(c => [c, LB.filter(p => p.cat === c.id).length]).filter(x => x[1] > 0);
  const radio = (name, val, label, on) => `<label><input type="radio" id="${name}-${String(val) === "" ? "any" : String(val).replace(/[^A-Za-z0-9_-]/g, "_")}" name="${name}" value="${val}" data-chg="f" ${on ? "checked" : ""}> ${label}</label>`;
  return `${r.mode !== "cat" ? `<div class="fgroup"><h3>${t("Category")}</h3>${radio("fcat", "", t("All"), LF.cat === "")}${counts.map(([c, n]) => radio("fcat", c.id, `${esc(c.name)} <span class="muted">(${num(n)})</span>`, LF.cat === c.id)).join("")}</div>` : ""}
    <div class="fgroup"><h3>${t("Price")}</h3>${PRICE_BANDS.map(([v, l]) => radio("fband", v, l, LF.band === v)).join("")}
      <div class="pricebox"><label class="sr" for="fmin">${t("Lowest price")}</label><input id="fmin" type="number" min="0" inputmode="decimal" placeholder="${t("Min")}" value="${esc(LF.min)}" data-chg="f"><span>${t("to")}</span><label class="sr" for="fmax">${t("Highest price")}</label><input id="fmax" type="number" min="0" inputmode="decimal" placeholder="${t("Max")}" value="${esc(LF.max)}" data-chg="f"></div></div>
    <div class="fgroup"><h3>${t("Customer rating")}</h3>${radio("frate", 0, t("Any rating"), LF.rating === 0)}${radio("frate", 4, t("{n} stars and up", { n: num(4) }), LF.rating === 4)}${radio("frate", 3, t("{n} stars and up", { n: num(3) }), LF.rating === 3)}</div>
    <div class="fgroup"><h3>${t("Availability")}</h3><label><input type="checkbox" id="fstock" data-chg="f" ${LF.stock ? "checked" : ""}> ${t("In stock only")}</label>
      ${r.mode !== "deals" ? `<label><input type="checkbox" id="fsale" data-chg="f" ${LF.sale ? "checked" : ""}> ${t("On sale only")}</label>` : ""}</div>`;
}
/* owner only: "+ Add a product" opens the Sell page with the search words and department filled in */
function addHere(r) {
  const name = r.mode === "search" ? r.q.trim() : "", cat = LF.cat || r.cat || "";
  const qs = new URLSearchParams(Object.entries({ name, cat }).filter(([, v]) => v)).toString();
  return `<a class="btn" href="#/sell${qs ? "?" + qs : ""}"><svg aria-hidden="true" style="width:18px;height:18px;fill:none"><use href="#i-plus"/></svg>${name ? t("Add {name} as a product", { name: `"${esc(name)}"` }) : t("Add a product")}</a>`;
}
function resultsHtml(r) {
  const list = applyFilters(LB), chips = [];
  if (LF.cat && r.mode !== "cat") chips.push(["cat", catName(LF.cat)]);
  if (LF.band) chips.push(["band", PRICE_BANDS.find(b => b[0] === LF.band)[1]]);
  if (LF.min !== "" || LF.max !== "") chips.push(["range", t("{min} to {max}", { min: LF.min !== "" ? money(Number(LF.min) || 0) : t("Any"), max: LF.max !== "" ? money(Number(LF.max) || 0) : t("any") })]);
  if (LF.rating) chips.push(["rating", t("{n} stars and up", { n: num(LF.rating) })]);
  if (LF.sale) chips.push(["sale", t("On sale")]);
  if (LF.stock) chips.push(["stock", t("In stock")]);
  const count = `<b>${num(list.length)}</b>`;
  const found = r.mode === "search" ? t(list.length === 1 ? "{n} product for {q}" : "{n} products for {q}", { n: count, q: `"${esc(r.q)}"` }) : t(list.length === 1 ? "{n} product" : "{n} products", { n: count });
  return `<div class="toolbar"><p aria-live="polite">${found}</p>
      <label class="row" for="sortSel"><span class="muted">${t("Sort by")}</span><select id="sortSel" data-chg="sort">${SORTS.map(([v, l]) => `<option value="${v}" ${LF.sort === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    ${chips.length ? `<div class="chips">${chips.map(([k, l]) => `<button class="chip" type="button" data-act="unfilter" data-k="${k}">${esc(l)} <span aria-hidden="true">x</span><span class="sr">${t("remove filter")}</span></button>`).join("")}<button class="link" type="button" data-act="clearf">${t("Clear all")}</button></div>` : ""}
    ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : `<div class="empty"><svg aria-hidden="true" style="fill:none"><use href="#i-search"/></svg><h2>${t("No products match")}</h2><p class="muted">${chips.length ? t("Try removing a filter.") : t("Check the spelling, or browse a department.")}</p><div class="row" style="justify-content:center">${chips.length ? `<button class="btn primary" type="button" data-act="clearf">${t("Clear filters")}</button>` : `<a class="btn primary" href="#/">${t("Browse departments")}</a>`}${IS_OWNER ? addHere(r) : ""}</div></div>`}`;
}
function refreshList(full) {
  const r = route;
  if (full) $("#filtersBox").innerHTML = filtersHtml(r);
  $("#results").innerHTML = resultsHtml(r);
}
VIEWS.list = r => {
  const key = [r.mode, r.cat || "", r.q || ""].join("|");
  if (LF.key !== key) LF = fresh(key);
  LB = baseList(r);
  const title = r.mode === "deals" ? t("Today's deals") : r.mode === "cat" ? (catName(r.cat) || t("Department")) : (r.q ? t("Results for {q}", { q: `"${r.q}"` }) : t("All products"));
  const crumb = r.mode === "cat" ? `<a href="#/">${t("Home")}</a> / ${esc(catName(r.cat))}` : `<a href="#/">${t("Home")}</a> / ${r.mode === "deals" ? t("Deals") : t("Search")}`;
  const blurb = r.mode === "cat" ? (CATS.find(c => c.id === r.cat) || {}).blurb : r.mode === "deals" ? t("Prices drop every day. Offers end at midnight.") : "";
  return {
    html: `<p class="crumbs">${crumb}</p><div class="stack" style="margin-bottom:16px"><h1>${esc(title)}</h1>${blurb ? `<p class="muted">${esc(blurb)}</p>` : ""}</div>
      <div class="layout"><details class="filters" id="filtersPanel" open><summary>${t("Filters")}</summary><div id="filtersBox">${filtersHtml(r)}</div></details><div id="results">${resultsHtml(r)}</div></div>`,
    mount() { if (matchMedia("(max-width: 900px)").matches) $("#filtersPanel").removeAttribute("open"); }
  };
};
CHG.f = el => {
  const g = n => { const x = $(`input[name="${n}"]:checked`); return x ? x.value : null; };
  if (el.name === "fband") { LF.band = g("fband"); LF.min = LF.max = ""; }
  else if (el.id === "fmin" || el.id === "fmax") { LF.min = $("#fmin").value.trim(); LF.max = $("#fmax").value.trim(); LF.band = ""; }
  if (g("fcat") !== null) LF.cat = g("fcat");
  if (g("frate") !== null) LF.rating = Number(g("frate"));
  if ($("#fstock")) LF.stock = $("#fstock").checked;
  if ($("#fsale")) LF.sale = $("#fsale").checked;
  const full = el.name === "fband" || el.id === "fmin" || el.id === "fmax";
  refreshList(full);
  if (full) {
    const back = el.id ? $("#" + el.id) : $(`input[name="${el.name}"][value="${el.value}"]`);
    if (back) back.focus({ preventScroll: true });
  }
};
CHG.sort = el => { LF.sort = el.value; refreshList(false); $("#sortSel").focus(); };
ACT.unfilter = el => {
  const k = el.dataset.k;
  if (k === "cat") LF.cat = ""; if (k === "band") LF.band = ""; if (k === "range") { LF.min = ""; LF.max = ""; }
  if (k === "rating") LF.rating = 0; if (k === "sale") LF.sale = false; if (k === "stock") LF.stock = false;
  refreshList(true); focusFirst("#sortSel");
};
ACT.clearf = () => { LF = fresh(LF.key); refreshList(true); focusFirst("#sortSel"); };
