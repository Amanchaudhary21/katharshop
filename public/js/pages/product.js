/* ==================================================================
   product.js - The single product page and customer reviews.
   (file 10 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Product page ---------- */
const FORM = {};
let pdp = { id: 0, q: 1 }, revStars = 0;
const deliveryRange = fast => (fast ? t("{min} to {max}", { min: when(addDays(1)), max: when(addDays(2)) }) : t("{min} to {max}", { min: when(addDays(3)), max: when(addDays(5)) }));
const stockHtml = p => (p.stock < 1 ? `<p class="stock-out">${t("Currently unavailable")}</p>` : p.stock <= 5 ? `<p class="stock-low">${t("Only {n} left in stock. Order soon.", { n: num(p.stock) })}</p>` : `<p class="stock-ok">${t("In stock")}</p>`);
const notFound = () => ({ html: emptyState(t("We could not find that page"), t("The product may have moved, or the link is old."), "#/", t("Back to the shop")) });

function reviewItems(p) {
  const mine = arr(state.reviews[p.id]);
  return mine.length ? mine.map(r => `<article class="review"><div class="row">${stars(r.stars)}<span class="pill">${t("Your review")}</span><span class="muted">${esc(when(new Date(r.date)))}</span></div><p style="margin-top:6px">${esc(r.text)}</p></article>`).join("")
    : `<p class="muted">${t("You have not written a review for this product yet.")}</p>`;
}
function reviewsHtml(p) {
  return `<section class="sec" id="reviews" aria-labelledby="h-rev"><h2 id="h-rev" style="margin-bottom:12px">${t("Ratings and reviews")}</h2>
    <div class="panel row" style="gap:12px 28px"><div><div class="price" style="font-size:2.4rem">${num(p.rating, 1)}</div>${stars(p.rating)}<div class="muted">${t("{n} sample ratings", { n: num(p.n) })}</div></div>
      <p class="muted grow" style="min-width:220px">${t("Ratings in this demo store are sample data. A review you write here stays in this browser and is marked as yours.")}</p></div>
    <div class="reviews" id="revList" style="margin-top:12px">${reviewItems(p)}</div>
    <form class="panel stack" id="revForm" novalidate style="margin-top:12px"><h3>${t("Write a review")}</h3>
      <div class="starpick" role="group" aria-label="${t("Your rating")}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-act="pick" data-n="${n}" aria-pressed="false" aria-label="${t(n > 1 ? "{n} stars" : "{n} star", { n: num(n) })}"><svg aria-hidden="true"><use href="#i-star"/></svg></button>`).join("")}</div>
      <div class="field"><label for="revText">${t("Your review")}</label><textarea id="revText" maxlength="500" placeholder="${t("What did you like or dislike?")}"></textarea><div class="err" id="revErr" role="alert"></div></div>
      <div><button class="btn brand" type="submit">${t("Post review")}</button></div></form></section>`;
}
VIEWS.product = r => {
  const p = PM.get(r.id);
  if (!p) return notFound();
  if (pdp.id !== p.id) pdp = { id: p.id, q: 1 };
  revStars = 0;
  addRecent(p.id);
  const out = p.stock < 1, wished = state.wish.includes(p.id), d = disc(p);
  const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 6);
  const recent = state.recent.filter(id => id !== p.id).map(id => PM.get(id)).slice(0, 6);
  return {
    html: `<p class="crumbs"><a href="#/">${t("Home")}</a> / <a href="#/c/${p.cat}">${esc(catName(p.cat))}</a></p>
    <div class="pdp">
      <div class="gallery">${art(p, true)}</div>
      <div class="pdp-info">
        <h1>${esc(p.title)}</h1>
        <div class="rate">${stars(p.rating)}<b>${num(p.rating, 1)}</b><a href="#reviews" data-act="jump">${t("{n} sample ratings", { n: num(p.n) })}</a></div>
        <div class="pdp-price"><span class="price">${money(p.price)}</span>${p.was ? `<span class="was">${t("List price {amount}", { amount: money(p.was) })}</span><span class="off">${t("You save {amount} ({pct}%)", { amount: money(p.was - p.price), pct: num(d) })}</span>` : ""}</div>
        <div><h2 style="font-size:1.1rem;margin-bottom:8px">${t("About this item")}</h2><ul class="bullets">${p.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul></div>
        <table class="specs"><caption class="sr">${t("Product details")}</caption><tbody>${p.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}<tr><th scope="row">${t("Department")}</th><td>${esc(catName(p.cat))}</td></tr></tbody></table>
      </div>
      <aside class="buybox" aria-label="${t("Buy this item")}">
        <div class="price" style="font-size:1.7rem">${money(p.price)}</div>
        ${p.price >= FREE_SHIP_MIN ? `<p class="ship">${t("Free delivery")}</p>` : `<p class="muted">${t("Free delivery on orders over {amount}", { amount: money(FREE_SHIP_MIN) })}</p>`}
        <p>${t("Arrives {when}", { when: `<b>${deliveryRange(false)}</b>` })}</p>
        ${stockHtml(p)}
        ${out ? "" : `<div class="row"><label for="qtyOut" class="muted">${t("Quantity")}</label><div class="qty"><button type="button" data-act="qty" data-d="-1" aria-label="${t("Decrease quantity")}" ${pdp.q <= 1 ? "disabled" : ""}>-</button><output id="qtyOut" aria-live="polite">${num(pdp.q)}</output><button type="button" data-act="qty" data-d="1" aria-label="${t("Increase quantity")}" ${pdp.q >= maxQty(p) ? "disabled" : ""}>+</button></div></div>`}
        <button class="btn brand block" type="button" data-act="addpdp" ${out ? "disabled" : ""}>${out ? t("Currently unavailable") : t("Add to cart")}</button>
        <button class="btn primary block" type="button" data-act="buynow" ${out ? "disabled" : ""}>${t("Buy now")}</button>
        <button class="btn block" type="button" data-act="wish" data-id="${p.id}" aria-pressed="${wished}">${wished ? t("Remove from wish list") : t("Add to wish list")}</button>
        ${IS_OWNER ? `<button class="btn danger block" type="button" data-act="unsell" data-id="${p.id}">${t("Delete this item")}</button>` : ""}
        <p class="muted" style="font-size:.82rem">${t("Demo checkout: no payment is taken and nothing ships.")}</p>
      </aside>
    </div>
    ${related.length ? `<section class="sec" aria-labelledby="h-rel"><div class="sec-head"><h2 id="h-rel">${t("More in {name}", { name: esc(catName(p.cat)) })}</h2><a href="#/c/${p.cat}">${t("See all")}</a></div><div class="rail">${related.map(card).join("")}</div></section>` : ""}
    ${reviewsHtml(p)}
    ${recent.length ? `<section class="sec" aria-labelledby="h-rec2"><div class="sec-head"><h2 id="h-rec2">${t("Recently viewed")}</h2></div><div class="rail">${recent.map(card).join("")}</div></section>` : ""}`
  };
};
ACT.qty = el => {
  const p = PM.get(pdp.id);
  pdp.q = Math.max(1, Math.min(maxQty(p), pdp.q + Number(el.dataset.d)));
  $("#qtyOut").textContent = num(pdp.q);
  $$('[data-act="qty"]').forEach(b => { b.disabled = Number(b.dataset.d) < 0 ? pdp.q <= 1 : pdp.q >= maxQty(p); });
};
function addFromPdp() {
  const p = PM.get(pdp.id), line = state.cart.find(l => l.id === p.id), before = line ? line.q : 0;
  if (!cartAdd(p.id, pdp.q)) return false;
  const after = state.cart.find(l => l.id === p.id).q;
  if (after === before) toast(t("You already have the most you can order ({n})", { n: num(maxQty(p)) }), { href: "#/cart", label: t("View cart") });
  else { flyToCart($(".gallery")); toast(t("Added {n} to your cart", { n: num(after - before) }), { href: "#/cart", label: t("View cart") }); }
  return true;
}
ACT.addpdp = () => { addFromPdp(); };
ACT.buynow = () => { if (addFromPdp()) go("/checkout"); };
ACT.jump = (el, e) => { e.preventDefault(); const t = $("#reviews"); if (t) t.scrollIntoView({ behavior: "smooth" }); };
ACT.pick = el => {
  revStars = Number(el.dataset.n);
  $$(".starpick button").forEach(b => { const on = Number(b.dataset.n) <= revStars; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(Number(b.dataset.n) === revStars)); });
};
FORM.revForm = () => {
  const text = $("#revText").value.trim(), err = $("#revErr");
  if (!revStars) { err.textContent = t("Choose a star rating first."); return; }
  if (text.length < 3) { err.textContent = t("Write a few words about the product."); $("#revText").focus(); return; }
  err.textContent = "";
  const list = arr(state.reviews[pdp.id]);
  list.unshift({ stars: revStars, text, date: new Date().toISOString() });
  state.reviews[pdp.id] = list.slice(0, 20);
  save("reviews");
  $("#revList").innerHTML = reviewItems(PM.get(pdp.id));
  $("#revText").value = ""; revStars = 0;
  $$(".starpick button").forEach(b => { b.classList.remove("on"); b.setAttribute("aria-pressed", "false"); });
  toast(t("Thanks. Your review is saved on this device."));
};
