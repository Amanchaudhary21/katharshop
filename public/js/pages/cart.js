/* ==================================================================
   cart.js - Cart, coupon box and wish list.
   (file 12 of 16; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Cart, order summary, wish list ---------- */
const focusFirst = (...sels) => { for (const s of sels) { const el = $(s); if (el && !el.disabled) { el.focus({ preventScroll: true }); return; } } };
const shipText = tot => (tot.ship === 0 ? t("FREE") : money(tot.ship));
const SANS = "font-family:var(--font-body)";

/* The receipt-style box used on the cart page and on the checkout page. */
function summaryInner(mode) {
  const tot = totals(), cp = state.coupon && COUPONS[state.coupon];
  const free = tot.sub >= FREE_SHIP_MIN || (cp && cp.kind === "ship");
  const pct = Math.min(100, Math.round(tot.sub / FREE_SHIP_MIN * 100));
  const prog = state.ship !== "std" ? ""
    : free ? `<div class="stack" style="gap:6px"><span class="ship" style="${SANS}">${t("Your order gets free delivery")}</span><div class="progress"><i style="width:100%"></i></div></div>`
    : `<div class="stack" style="gap:6px"><span style="${SANS};font-size:.88rem">${t("Add {amount} more to get free delivery", { amount: `<b>${money(tot.toFree)}</b>` })}</span><div class="progress" role="progressbar" aria-label="${t("Progress to free delivery")}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>`;
  const coupon = state.coupon && cp
    ? `<div class="r"><span>${t("Coupon")} <b>${esc(state.coupon)}</b></span>${mode === "cart" ? `<button class="link" type="button" id="couponRm" data-act="nocoupon">${t("Remove")}</button>` : ""}</div><div class="muted" style="${SANS};font-size:.82rem">${esc(cp.label)}</div>`
    : mode === "cart" ? `<form class="coupon" id="couponForm" novalidate><label class="sr" for="couponIn">${t("Coupon code")}</label><input id="couponIn" type="text" placeholder="${t("Coupon code")}" autocomplete="off" aria-describedby="couponMsg"><button class="btn small" type="submit">${t("Apply")}</button></form><div id="couponMsg" role="alert" style="${SANS};font-size:.85rem;color:var(--bad)"></div>` : "";
  const cta = mode === "cart"
    ? `<a class="btn primary block" href="#/checkout">${t("Go to checkout")}</a>`
    : `<button class="btn primary block" type="submit" form="coForm">${t("Place demo order")}</button>`;
  return `<h2>${t("Order summary")}</h2>${prog}${coupon}
    <div class="r"><span>${t("Items ({n})", { n: num(tot.count) })}</span><span>${money(tot.sub)}</span></div>
    ${tot.off ? `<div class="r"><span>${t("Discount")}</span><span>-${money(tot.off)}</span></div>` : ""}
    <div class="r"><span>${state.ship === "exp" ? t("Express delivery") : t("Delivery")}</span><span>${shipText(tot)}</span></div>
    <div class="r total"><span>${t("Total")}</span><span>${money(tot.total)}</span></div>
    ${cta}
    <p class="note" style="${SANS};font-size:.82rem">${t("Demo store: no payment is taken and nothing ships.")}</p>`;
}

function cartLine(l) {
  const p = l.p, col = p.colors[l.v % p.colors.length], key = `data-id="${p.id}" data-v="${l.v}"`;
  return `<div class="line">
    <a class="line-art" href="#/p/${p.id}" tabindex="-1" aria-hidden="true">${art(p, l.v)}</a>
    <div class="line-info">
      <a href="#/p/${p.id}">${esc(p.title)}</a>
      ${p.colors.length > 1 ? `<span class="muted">${t("Colour:")} ${esc(col.name)}</span>` : ""}
      ${p.stock <= 5 ? `<span class="stock-low">${t("Only {n} left in stock", { n: num(p.stock) })}</span>` : `<span class="stock-ok">${t("In stock")}</span>`}
      <div class="row">
        <div class="qty"><button type="button" data-act="cqty" ${key} data-d="-1" aria-label="${t("Decrease quantity of {name}", { name: esc(p.title) })}" ${l.q <= 1 ? "disabled" : ""}>-</button><output aria-label="${t("Quantity")}">${num(l.q)}</output><button type="button" data-act="cqty" ${key} data-d="1" aria-label="${t("Increase quantity of {name}", { name: esc(p.title) })}" ${l.q >= maxQty(p) ? "disabled" : ""}>+</button></div>
        <button class="link" type="button" data-act="cremove" ${key}>${t("Remove")}</button>
        <button class="link" type="button" data-act="csave" ${key}>${t("Move to wish list")}</button>
      </div>
    </div>
    <div class="line-total">${money(p.price * l.q)}${l.q > 1 ? `<div class="muted" style="${SANS};font-weight:400;font-size:.8rem">${t("{amount} each", { amount: money(p.price) })}</div>` : ""}</div>
  </div>`;
}

VIEWS.cart = () => {
  const tot = totals();
  if (!tot.items.length) return { html: `<h1 class="sr" id="cartTitle" tabindex="-1">${t("Your cart")}</h1>${emptyState(t("Your cart is empty"), t("Add something you like and it will wait for you here."), "#/", t("Start shopping"))}` };
  return {
    html: `<div class="sec-head" style="margin-top:0"><h1 id="cartTitle" tabindex="-1">${t("Your cart")} <span class="muted" style="font-size:1rem;font-weight:600">(${t(tot.count === 1 ? "{n} item" : "{n} items", { n: num(tot.count) })})</span></h1><a class="link" href="#/">${t("Continue shopping")}</a></div>
    <div class="cart-layout">
      <section class="panel" aria-label="${t("Items in your cart")}">${tot.items.map(cartLine).join("")}</section>
      <aside class="receipt" id="sumBox" aria-label="${t("Order summary")}">${summaryInner("cart")}</aside>
    </div>`
  };
};

ACT.cqty = el => {
  const id = Number(el.dataset.id), v = Number(el.dataset.v), d = Number(el.dataset.d);
  const line = state.cart.find(l => l.id === id && l.v === v);
  if (!line) return;
  cartSet(id, v, line.q + d);
  rerender();
  const base = `[data-act="cqty"][data-id="${id}"][data-v="${v}"]`;
  focusFirst(`${base}[data-d="${d}"]`, `${base}[data-d="${-d}"]`, "#cartTitle");
};
ACT.cremove = el => {
  cartSet(Number(el.dataset.id), Number(el.dataset.v), 0);
  rerender(); focusFirst("#cartTitle", "#main");
  toast(t("Removed from your cart"));
};
ACT.csave = el => {
  const id = Number(el.dataset.id);
  cartSet(id, Number(el.dataset.v), 0);
  if (!state.wish.includes(id)) toggleWish(id);
  rerender(); focusFirst("#cartTitle", "#main");
  toast(t("Moved to your wish list"), { href: "#/wishlist", label: t("View") });
};
FORM.couponForm = () => {
  const input = $("#couponIn"), msg = $("#couponMsg"), code = input.value.trim().toUpperCase();
  if (!code) { msg.textContent = t("Type a coupon code first."); input.focus(); return; }
  if (!COUPONS[code]) { msg.textContent = t("{code} is not a valid code. Try WELCOME10 or FREESHIP.", { code: `"${code}"` }); input.focus(); return; }
  state.coupon = code; save("coupon");
  $("#sumBox").innerHTML = summaryInner("cart");
  focusFirst("#couponRm");
  toast(t("Coupon {code} applied", { code }));
};
ACT.nocoupon = () => {
  state.coupon = null; save("coupon");
  $("#sumBox").innerHTML = summaryInner("cart");
  focusFirst("#couponIn");
};

/* ---------- Wish list ---------- */
VIEWS.wishlist = () => {
  const items = state.wish.map(id => PM.get(id)).filter(Boolean);
  if (!items.length) return { html: `<h1 class="sr" id="wishTitle" tabindex="-1">${t("Your wish list")}</h1>${emptyState(t("Your wish list is empty"), t("Tap the heart on any product to save it here for later."), "#/", t("Browse products"))}` };
  const inStock = items.filter(p => p.stock > 0).length;
  return {
    html: `<div class="sec-head" style="margin-top:0"><h1 id="wishTitle" tabindex="-1">${t("Your wish list")} <span class="muted" style="font-size:1rem;font-weight:600">(${num(items.length)})</span></h1>
      <div class="row">${inStock ? `<button class="btn brand small" type="button" data-act="wishall">${t("Add all in-stock items to cart")}</button>` : ""}<button class="btn small" type="button" data-act="wishclear">${t("Clear wish list")}</button></div></div>
      <div class="grid">${items.map(card).join("")}</div>`
  };
};
ACT.wishall = () => {
  let n = 0;
  state.wish.map(id => PM.get(id)).filter(p => p && p.stock > 0).forEach(p => { if (cartAdd(p.id, 0, 1)) n++; });
  toast(n ? t(n === 1 ? "Added {n} item to your cart" : "Added {n} items to your cart", { n: num(n) }) : t("Nothing in stock to add"), n ? { href: "#/cart", label: t("View cart") } : null);
};
ACT.wishclear = () => {
  state.wish = []; save("wish"); updateCounts();
  rerender(); focusFirst("#wishTitle", "#main");
  toast(t("Wish list cleared"));
};
