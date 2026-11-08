/* ==================================================================
   checkout.js - Checkout form, order confirmation and the Orders page.
   (file 12 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Checkout, confirmation, orders ---------- */
const CO = { name: "", email: "", street: "", city: "", region: "", zip: "", country: "United States" };
const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Japan", "India", "Bangladesh"];
const RULES = {
  name: v => v.length >= 2 || t("Enter your full name."),
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || t("Enter an email like name@example.com."),
  street: v => v.length >= 4 || t("Enter a street address."),
  city: v => v.length >= 2 || t("Enter a city."),
  region: v => v.length >= 2 || t("Enter a state or region."),
  zip: v => /^[A-Za-z0-9][A-Za-z0-9 -]{2,9}$/.test(v) || t("Enter a postal code (3 to 10 letters or numbers)."),
  country: v => !!v || t("Choose a country.")
};
const dateFmt = d => fmtDate(d, { year: "numeric", month: "short", day: "numeric" });
const H2S = "font-size:1.15rem";

function field(id, label, wide, attrs = 'type="text"') {
  return `<div class="field${wide ? " wide" : ""}"><label for="co_${id}">${label}</label><input id="co_${id}" name="${id}" value="${esc(CO[id])}" autocomplete="off" aria-describedby="err_${id}" ${attrs}><div class="err" id="err_${id}"></div></div>`;
}
function zipField() {
  return `<div class="field wide"><label for="co_zip">${t("Postal code")}</label><input id="co_zip" name="zip" value="${esc(CO.zip)}" autocomplete="off" inputmode="text" aria-describedby="zipNote err_zip" type="text"><div class="muted" id="zipNote" aria-live="polite" style="font-size:.85rem">${t("Type it and we fill in the city and state.")}</div><div class="err" id="err_zip"></div></div>`;
}
function countryField() {
  return `<div class="field wide"><label for="co_country">${t("Country")}</label><select id="co_country" name="country" aria-describedby="err_country">${COUNTRIES.map(c => `<option value="${c}"${c === CO.country ? " selected" : ""}>${t(c)}</option>`).join("")}</select><div class="err" id="err_country"></div></div>`;
}
function speedOpts() {
  const tot = totals(), cp = state.coupon && COUPONS[state.coupon];
  const stdFree = tot.sub >= FREE_SHIP_MIN || (cp && cp.kind === "ship");
  return [["std", t("Standard delivery"), deliveryRange(false), stdFree ? t("FREE") : money(SHIP_STD)], ["exp", t("Express delivery"), deliveryRange(true), money(SHIP_EXP)]]
    .map(([k, name, eta, price]) => `<label class="opt"><input type="radio" id="speed-${k}" name="speed" value="${k}" data-chg="ship" ${state.ship === k ? "checked" : ""}><span class="grow"><b>${name}</b><br><span class="muted">${t("Arrives {when}", { when: eta })}</span></span><b class="mono">${price}</b></label>`).join("");
}
function miniLine(l) {
  const p = l.p, col = p.colors[l.v % p.colors.length];
  return `<div class="line">${art(p, l.v)}<div class="line-info"><a href="#/p/${p.id}">${esc(p.title)}</a><span class="muted">${p.colors.length > 1 ? esc(col.name) + " · " : ""}${t("Qty {n}", { n: num(l.q) })}</span></div><div class="line-total">${money(p.price * l.q)}</div></div>`;
}

VIEWS.checkout = () => {
  const tot = totals();
  if (!tot.items.length) return { html: `<h1 class="sr" id="coTitle" tabindex="-1">${t("Checkout")}</h1>${emptyState(t("Nothing to check out"), t("Your cart is empty. Add a few things first."), "#/", t("Start shopping"))}` };
  return {
    html: `<div class="sec-head" style="margin-top:0"><h1 id="coTitle" tabindex="-1">${t("Checkout")}</h1><a class="link" href="#/cart">${t("Back to cart")}</a></div>
    <div class="cart-layout">
      <form id="coForm" novalidate>
        <section class="panel stack" aria-labelledby="h-addr"><h2 id="h-addr" style="${H2S}">1. ${t("Delivery address")}</h2>
          <p class="note">${t("Demo only. Please use made-up details. Nothing is sent anywhere.")}</p>
          <div class="form-grid">${field("name", t("Full name"), true)}${field("email", t("Email"), true, 'type="email" inputmode="email"')}${zipField()}${countryField()}${field("city", t("City"), true)}${field("region", t("State or region"), true)}${field("street", t("Street address"), true, `type="text" placeholder="${t("Street, building and house number")}"`)}</div></section>
        <section class="panel" role="radiogroup" aria-labelledby="h-speed"><h2 id="h-speed" style="${H2S};margin-bottom:10px">2. ${t("Delivery speed")}</h2><div id="speedBox">${speedOpts()}</div></section>
        <section class="panel stack" aria-labelledby="h-pay"><h2 id="h-pay" style="${H2S}">3. ${t("Payment")}</h2>
          <p class="note">${t("<b>Demo mode.</b> No money is taken. Use the test details shown below and never type a real card number.")}</p>
          <div role="radiogroup" aria-labelledby="h-pay">${payOpts()}</div>
          <div id="payBox">${payBox()}</div></section>
        <section class="panel" aria-labelledby="h-items"><h2 id="h-items" style="${H2S}">4. ${t("Review items")}</h2>${tot.items.map(miniLine).join("")}</section>
      </form>
      <aside class="receipt" id="sumBox" aria-label="${t("Order summary")}">${summaryInner("checkout")}</aside>
    </div>`
  };
};
/* ---------- Postal code lookup: fills city, state (and the town in Japan) ---------- */
// Japan uses zipcloud (gives the city); other countries use zippopotam.us. Both are free and need no key.
const ZIP_CC = { "United States": "us", "Canada": "ca", "United Kingdom": "gb", "Australia": "au", "India": "in", "Bangladesh": "bd" };
let zipTimer = 0, zipSeq = 0;
function setCo(k, v) {
  const el = $("#co_" + k);
  if (!el || !v) return;
  el.value = CO[k] = v;
  el.closest(".field").classList.remove("bad");
  el.setAttribute("aria-invalid", "false");
  $("#err_" + k).textContent = "";
}
async function zipFetch(country, zip) {
  if (country === "Japan") {
    const d = await (await fetch("https://zipcloud.ibsnet.co.jp/api/search?zipcode=" + zip.replace(/\D/g, ""))).json();
    const r = d.results && d.results[0];
    return r && { region: r.address1, city: r.address2, town: r.address3 };
  }
  const cc = ZIP_CC[country];
  if (!cc) return null;
  let code = zip.toUpperCase();
  if (cc === "ca") code = code.replace(/\s/g, "").slice(0, 3);             // only the first half is listed
  if (cc === "gb") code = code.includes(" ") ? code.split(" ")[0] : code.length > 4 ? code.slice(0, -3) : code;
  if (cc === "us") code = code.slice(0, 5);                                  // ZIP+4 -> ZIP
  const res = await fetch(`https://api.zippopotam.us/${cc}/${encodeURIComponent(code)}`);
  if (!res.ok) return null;
  const p = (await res.json()).places[0];
  return p && { region: p.state, city: cc === "ca" || cc === "gb" ? "" : p["place name"] };
}
async function zipLookup() {
  const zipEl = $("#co_zip"), note = $("#zipNote");
  if (!zipEl || !note) return;
  const zip = zipEl.value.trim(), seq = ++zipSeq;
  // 7 digits (or 123-4567) is a Japanese postal code
  if (/^\d{3}-?\d{4}$/.test(zip) && CO.country !== "Japan") { $("#co_country").value = CO.country = "Japan"; }
  if (RULES.zip(zip) !== true) { note.textContent = t("Type it and we fill in the city and state."); return; }
  note.textContent = t("Looking up…");
  let found = null;
  try { found = await zipFetch(CO.country, zip); } catch (err) { found = null; }
  if (seq !== zipSeq) return; // a newer lookup has started
  if (!found) { note.textContent = t("We could not find that code. Please type the city and state."); return; }
  setCo("region", found.region);
  setCo("city", found.city);
  const street = $("#co_street");
  if (found.town && street && !street.value.trim()) setCo("street", found.town);
  note.textContent = t("Filled in: {place}", { place: [found.town, found.city, found.region].filter(Boolean).join(", ") }) + (found.town ? " " + t("Add your house or block number.") : "");
}
document.addEventListener("input", e => { if (e.target.id === "co_zip") { clearTimeout(zipTimer); zipTimer = setTimeout(zipLookup, 450); } });
document.addEventListener("change", e => { if (e.target.id === "co_country") { CO.country = e.target.value; zipLookup(); } });

/* ---------- Payment (demo): card, QR apps, konbini, bank transfer, cash on delivery ----------
   Nothing here talks to a bank. Card details stay in the form only and are never saved.
   Only the test cards below are accepted, so a real card can never "work" by mistake.
   Each method: [name, short line, kind, badge]. kind decides what happens at "Place order". */
const PAY = {
  card: ["Credit or debit card", "Visa, Mastercard, JCB, American Express, Diners", "card", "CARD"],
  paypay: ["PayPay", "Scan a QR code with the PayPay app", "qr", "QR"],
  rakuten: ["Rakuten Pay", "Scan a QR code with the Rakuten Pay app", "qr", "QR"],
  dpay: ["d払い (d Barai)", "Scan a QR code with the d払い app (docomo)", "qr", "QR"],
  aupay: ["au PAY", "Scan a QR code with the au PAY app", "qr", "QR"],
  merpay: ["メルペイ (Merpay)", "Scan a QR code with the Mercari app", "qr", "QR"],
  konbini: ["Convenience store (konbini)", "Pay in cash at the store within 3 days", "konbini", "CVS"],
  bank: ["Bank transfer / Pay-easy", "Transfer from your bank or ATM within 7 days", "bank", "BANK"],
  cod: ["Cash on delivery (代引き)", "Pay the driver in cash when it arrives", "cod", "COD"]
};
const PAY_GROUPS = [["Card", ["card"]], ["Smartphone QR pay", ["paypay", "rakuten", "dpay", "aupay", "merpay"]], ["Pay later", ["konbini", "bank", "cod"]]];
const payName = k => t(PAY[k][0]);
const KONBINI = ["7-Eleven", "Lawson", "FamilyMart", "Ministop", "Daily Yamazaki", "Seicomart"];
const payKind = () => PAY[CO.pay][2];
const randDigits = n => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
const deadline = days => when(addDays(days)) + ", 23:59";
const TEST_CARDS = { "4242424242424242": "Visa", "5555555555554444": "Mastercard", "3566002020360505": "JCB", "378282246310005": "American Express", "4000000000000002": "decline" };
const YEN_RATE = 150; // demo exchange rate for the QR apps, which charge in yen
const yen = usd => fmtNum(Math.round(usd * YEN_RATE), { style: "currency", currency: "JPY" });
const digits = v => v.replace(/\D/g, "");
const luhn = n => [...n].reverse().reduce((s, d, i) => { let x = +d; if (i % 2) { x *= 2; if (x > 9) x -= 9; } return s + x; }, 0) % 10 === 0;
const CARD_RULES = {
  num: v => {
    const n = digits(v);
    if (n.length < 13 || !luhn(n)) return t("Enter a valid card number.");
    if (!TEST_CARDS[n]) return t("Demo store: use a test card such as 4242 4242 4242 4242. Never type a real card.");
    return TEST_CARDS[n] === "decline" ? t("Your card was declined (test card). Try 4242 4242 4242 4242.") : true;
  },
  holder: v => v.trim().length >= 2 || t("Enter the name on the card."),
  exp: v => {
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v.trim());
    if (!m || +m[1] < 1 || +m[1] > 12) return t("Enter the expiry date as MM/YY.");
    return new Date(2000 + +m[2], +m[1]) > new Date() || t("This card has expired.");
  },
  cvc: v => /^\d{3,4}$/.test(v.trim()) || t("Enter the 3 or 4 digit security code.")
};
CO.pay = CO.pay || "card";
CO.konbini = CO.konbini || KONBINI[0];

function payOpts() {
  const opt = k => { const [name, sub, , badge] = PAY[k]; return `<label class="opt"><input type="radio" id="pay-${k}" name="pay" value="${k}" data-chg="pay" ${CO.pay === k ? "checked" : ""}><span class="grow"><b>${t(name)}</b><br><span class="muted">${t(sub)}</span></span><span class="pay-badge pay-${k}" aria-hidden="true">${badge}</span></label>`; };
  return PAY_GROUPS.map(([title, keys]) => `<p class="pay-group">${t(title)}</p>${keys.map(opt).join("")}`).join("");
}
function cardField(id, label, wide, attrs) {
  return `<div class="field${wide ? " wide" : ""}"><label for="pay_${id}">${label}</label><input id="pay_${id}" type="text" autocomplete="off" aria-describedby="perr_${id}" ${attrs}><div class="err" id="perr_${id}"></div></div>`;
}
function payBox() {
  if (CO.pay === "card") return `<div class="form-grid pay-card">
    ${cardField("num", t("Card number"), true, 'inputmode="numeric" maxlength="23" placeholder="1234 5678 9012 3456"')}
    ${cardField("holder", t("Name on card"), true, "")}
    ${cardField("exp", t("Expiry (MM/YY)"), false, 'inputmode="numeric" maxlength="5" placeholder="MM/YY"')}
    ${cardField("cvc", t("Security code"), false, 'inputmode="numeric" maxlength="4" placeholder="123"')}
    <div class="wide row" style="gap:10px;align-items:center"><button class="btn small" type="button" data-act="testcard">${t("Fill in a test card")}</button><span class="muted" style="font-size:.85rem">${t("Test card: 4242 4242 4242 4242, any future date, any 3 digits.")}</span></div></div>`;
  const amt = `<b>${yen(totals().total)}</b> ${t("(about {amount})", { amount: money(totals().total) })}`;
  if (CO.pay === "konbini") return `<div class="field"><label for="pay_store">${t("Which store will you pay at?")}</label><select id="pay_store" data-chg="konbini">${KONBINI.map(s => `<option${s === CO.konbini ? " selected" : ""}>${s}</option>`).join("")}</select></div>
    <p class="muted">${t("After you place the order you get a payment number. Show it at the register (or type it into the store's kiosk) and pay {amount} in cash by {when}. We ship once you have paid.", { amount: amt, when: `<b>${deadline(3)}</b>` })}</p>`;
  if (CO.pay === "bank") return `<p class="muted">${t("After you place the order you see our bank account. Transfer {amount} by {when} from your bank, a Japan Post Bank ATM or Pay-easy. Put your order number in the transfer name. Bank fees are paid by you. We ship once the money arrives.", { amount: amt, when: `<b>${deadline(7)}</b>` })}</p>`;
  if (CO.pay === "cod") return `<p class="muted">${t("Pay the driver {amount} in cash when your parcel arrives. Please have the exact amount ready. No extra fee in this demo (real stores often add ¥330 or more).", { amount: amt })}</p>`;
  return `<p class="muted">${t("When you press {button}, a QR code appears. Scan it with the {app} app to pay {amount}.", { button: `<b>${t("Place demo order")}</b>`, app: payName(CO.pay), amount: amt })}</p>`;
}
CHG.pay = el => {
  CO.pay = PAY[el.value] ? el.value : "card";
  $("#payBox").innerHTML = payBox();
};
CHG.konbini = el => {
  CO.konbini = KONBINI.includes(el.value) ? el.value : KONBINI[0];
};
ACT.testcard = () => {
  const d = new Date(), exp = String(d.getMonth() + 1).padStart(2, "0") + "/" + String((d.getFullYear() + 3) % 100).padStart(2, "0");
  Object.entries({ num: "4242 4242 4242 4242", holder: CO.name || t("Test Shopper"), exp, cvc: "123" }).forEach(([k, v]) => { $("#pay_" + k).value = v; markPay(k, true); });
};
function markPay(k, r) {
  const el = $("#pay_" + k), ok = r === true;
  el.closest(".field").classList.toggle("bad", !ok);
  el.setAttribute("aria-invalid", String(!ok));
  $("#perr_" + k).textContent = ok ? "" : r;
  return ok;
}
// tidy card typing: "4242424242424242" -> "4242 4242 4242 4242", "1229" -> "12/29"
document.addEventListener("input", e => {
  const el = e.target;
  if (el.id === "pay_num") el.value = digits(el.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
  else if (el.id === "pay_exp" && e.inputType !== "deleteContentBackward") { const n = digits(el.value).slice(0, 4); el.value = n.length > 2 ? n.slice(0, 2) + "/" + n.slice(2) : n; }
  else if (el.id === "pay_cvc") el.value = digits(el.value).slice(0, 4);
});

// QR apps: load the QR drawing library only when someone picks PayPay or Rakuten Pay
let qrLib = null;
function loadQR() {
  return qrLib || (qrLib = new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.integrity = "sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1";
    s.crossOrigin = "anonymous";
    s.onload = () => ok(window.qrcode);
    s.onerror = () => { qrLib = null; fail(new Error("offline")); };
    document.head.appendChild(s);
  }));
}
function qrPay(id, total, done) {
  const app = payName(CO.pay);
  const dlg = document.createElement("dialog");
  dlg.className = "qr-dialog pay-" + CO.pay;
  dlg.setAttribute("aria-labelledby", "qrTitle");
  dlg.innerHTML = `<div class="qr-head"><h2 id="qrTitle">${t("Pay with {app}", { app })}</h2><button class="btn small" type="button" data-qr="cancel" aria-label="${t("Cancel payment")}">${t("Cancel")}</button></div>
    <p class="qr-amount">${yen(total)} <span class="muted">${t("(about {amount})", { amount: money(total) })}</span></p>
    <div class="qr-code" id="qrCode"><span class="muted">${t("Making your QR code…")}</span></div>
    <p class="qr-timer" id="qrTimer" aria-live="polite"></p>
    <ol class="qr-steps"><li>${t("Open the {app} app on your phone.", { app })}</li><li>${t("Tap <b>Scan</b>.")}</li><li>${t("Point the camera at this code and confirm the amount.")}</li></ol>
    <p class="note" style="font-size:.85rem">${t("<b>Demo:</b> this code takes no money (a real app will say it is not valid). Press the button below to pretend you paid.")}</p>
    <button class="btn primary block" type="button" data-qr="paid">${t("I have paid (demo)")}</button>`;
  document.body.appendChild(dlg);
  let left = 300, tick = 0;
  const close = () => { clearInterval(tick); if (dlg.open) dlg.close(); dlg.remove(); };
  const draw = () => {
    loadQR().then(qrcode => {
      const q = qrcode(0, "M");
      q.addData(`https://example.com/shopnest-demo-pay?app=${CO.pay}&order=${id}&jpy=${Math.round(total * YEN_RATE)}`);
      q.make();
      $("#qrCode", dlg).innerHTML = q.createSvgTag({ cellSize: 6, margin: 3, scalable: true });
      $("#qrCode svg", dlg).setAttribute("aria-label", t("QR code to pay {amount} with {app}", { amount: yen(total), app }));
      $("#qrCode svg", dlg).setAttribute("role", "img");
    }).catch(() => { $("#qrCode", dlg).innerHTML = `<span class="muted">${t("Could not load the QR code. Check your internet connection.")}</span>`; });
    left = 300; clearInterval(tick);
    const show = () => {
      if (left <= 0) {
        clearInterval(tick);
        $("#qrTimer", dlg).innerHTML = `${t("This code has expired.")} <button class="link" type="button" data-qr="again">${t("Make a new code")}</button>`;
        $("#qrCode", dlg).classList.add("expired");
        return;
      }
      $("#qrTimer", dlg).textContent = t("Code expires in {time}", { time: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` });
      left--;
    };
    $("#qrCode", dlg).classList.remove("expired");
    show(); tick = setInterval(show, 1000);
  };
  dlg.addEventListener("click", e => {
    const b = e.target.closest("[data-qr]");
    if (!b) return;
    if (b.dataset.qr === "cancel") { close(); toast(t("Payment cancelled. Your cart is unchanged.")); }
    else if (b.dataset.qr === "again") draw();
    else if (b.dataset.qr === "paid") {
      if (left <= 0) { toast(t("That code expired. Make a new one first.")); return; }
      b.disabled = true; b.textContent = t("Checking payment…");
      setTimeout(() => { close(); done(app); }, 900);
    }
  });
  dlg.addEventListener("cancel", () => { clearInterval(tick); setTimeout(() => dlg.remove(), 0); toast(t("Payment cancelled. Your cart is unchanged.")); });
  dlg.showModal();
  draw();
}

CHG.ship = el => {
  state.ship = el.value === "exp" ? "exp" : "std"; save("ship");
  $("#sumBox").innerHTML = summaryInner("checkout");
  if (CO.pay !== "card") $("#payBox").innerHTML = payBox(); // the yen amount changes with delivery
};
let paying = false;
FORM.coForm = () => {
  if (paying) return;
  let first = null;
  Object.keys(RULES).forEach(k => {
    const el = $("#co_" + k), v = el.value.trim(), r = RULES[k](v), ok = r === true;
    CO[k] = v;
    el.closest(".field").classList.toggle("bad", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    $("#err_" + k).textContent = ok ? "" : r;
    if (!ok && !first) first = el;
  });
  let cardLabel = "";
  if (CO.pay === "card") {
    Object.keys(CARD_RULES).forEach(k => {
      const el = $("#pay_" + k);
      if (!markPay(k, CARD_RULES[k](el.value)) && !first) first = el;
    });
    const n = digits($("#pay_num").value);
    if (!first) cardLabel = t("{brand} ending {last4}", { brand: TEST_CARDS[n], last4: n.slice(-4) });
    else if (n.length >= 13 && luhn(n) && !TEST_CARDS[n]) $("#pay_num").value = ""; // a possibly real card: do not keep it on screen
  }
  if (first) { first.focus(); toast(t("Please fix the highlighted fields.")); return; }
  const tot = totals();
  if (!tot.items.length) { go("/cart"); return; }
  let id;
  do { id = "BZ-" + (Math.floor(Math.random() * 900000) + 100000); } while (state.orders.some(o => o.id === id));
  const kind = payKind();
  if (kind === "qr") { qrPay(id, tot.total, app => placeOrder(id, tot, app)); return; }
  if (kind === "konbini") { placeOrder(id, tot, `${CO.konbini} (${t("konbini")})`, { kind, store: CO.konbini, number: randDigits(4) + "-" + randDigits(4) + "-" + randDigits(4), due: deadline(3), jpy: yen(tot.total) }); return; }
  if (kind === "bank") { placeOrder(id, tot, t("Bank transfer"), { kind, due: deadline(7), jpy: yen(tot.total) }); return; }
  if (kind === "cod") { placeOrder(id, tot, t("Cash on delivery"), { kind, jpy: yen(tot.total) }); return; }
  // card: show a short "processing" step, like a real payment
  const btn = $('button[form="coForm"]');
  paying = true;
  if (btn) { btn.disabled = true; btn.textContent = t("Processing payment…"); }
  setTimeout(() => { paying = false; placeOrder(id, tot, cardLabel); }, 1200);
};
function placeOrder(id, tot, payLabel, payInfo) {
  state.orders.unshift({
    id, date: new Date().toISOString(),
    items: tot.items.map(l => ({ id: l.id, v: l.v, q: l.q, price: l.p.price })),
    sub: tot.sub, off: tot.off, ship: tot.ship, total: tot.total, coupon: state.coupon || "",
    speed: state.ship, eta: deliveryRange(state.ship === "exp"), pay: payLabel, payInfo: payInfo || null,
    to: { name: CO.name, place: `${CO.city}, ${CO.country}` }
  });
  state.orders = state.orders.slice(0, 30);
  state.cart = []; state.coupon = null;
  ["orders", "cart", "coupon"].forEach(save);
  updateCounts();
  Object.assign(CO, { name: "", email: "", street: "", city: "", region: "", zip: "" });
  go("/done/" + id);
}

VIEWS.done = r => {
  const o = state.orders.find(x => x.id === r.id);
  if (!o) return notFound();
  const first = (o.to.name || "").split(" ")[0];
  return {
    html: `<div class="done">
      <div class="tick"><svg aria-hidden="true" style="fill:none"><use href="#i-check"/></svg></div>
      <h1 id="doneTitle" tabindex="-1">${first ? t("Thank you, {name}! Your demo order is placed.", { name: esc(first) }) : t("Thank you! Your demo order is placed.")}</h1>
      <p>${t("Order number")} <b class="mono">${esc(o.id)}</b></p>
      <p>${t("Pretend delivery: {when} to {place}", { when: `<b>${esc(o.eta)}</b>`, place: esc(o.to.place) })}</p>
      ${o.pay ? `<p>${o.payInfo ? t("Payment") : t("Paid with")}: <b>${esc(o.pay)}</b> (${t("demo")})</p>` : ""}
      ${payHowTo(o)}
      <p class="note" style="max-width:520px">${t("This is a practice order. No real money was taken, nothing will ship and no email was sent.")}</p>
      <div class="row" style="justify-content:center"><a class="btn primary" href="#/orders">${t("View your orders")}</a><a class="btn" href="#/">${t("Keep shopping")}</a></div>
    </div>
    <section class="panel" style="max-width:680px;margin:8px auto 0" aria-label="${t("Order details")}">
      ${o.items.map(it => orderLine(it, false)).join("")}
      <div class="receipt" style="position:relative;top:0;border:0;padding:12px 0 0">
        <div class="r"><span>${t("Items")}</span><span>${money(o.sub)}</span></div>
        ${o.off ? `<div class="r"><span>${t("Discount")} (${esc(o.coupon)})</span><span>-${money(o.off)}</span></div>` : ""}
        <div class="r"><span>${t("Delivery")}</span><span>${o.ship ? money(o.ship) : t("FREE")}</span></div>
        <div class="r total"><span>${t("Total")}</span><span>${money(o.total)}</span></div>
      </div>
    </section>`
  };
};

// what to do next for the "pay later" methods (konbini, bank transfer, cash on delivery)
function payHowTo(o) {
  const p = o.payInfo;
  if (!p) return "";
  const row = (k, v) => `<div class="r"><span>${t(k)}</span><b class="mono">${esc(v)}</b></div>`;
  const box = (title, rows, text) => `<section class="pay-howto" aria-label="${t(title)}"><h2>${t(title)}</h2>${rows}<p class="muted">${text}</p></section>`;
  if (p.kind === "konbini") return box("How to pay at the store", row("Store", p.store) + row("Payment number", p.number) + row("Amount", p.jpy) + row("Pay by", p.due),
    t("Show the payment number at the {store} register or kiosk and pay in cash. Demo: this number does not work in a real store.", { store: esc(p.store) }));
  if (p.kind === "bank") return box("Bank transfer details", row("Bank", "ShopNest Demo Bank") + row("Branch", t("Online branch (001)")) + row("Account", t("Ordinary 1234567")) + row("Account name", "ショップネスト (デモ)") + row("Transfer name", o.id + " + " + t("your name")) + row("Amount", p.jpy) + row("Pay by", p.due),
    t("Demo: this account does not exist. Do not send real money."));
  if (p.kind === "cod") return box("Cash on delivery", row("Pay the driver", p.jpy), t("Have the exact amount ready when the parcel arrives."));
  return "";
}

function orderLine(it, again) {
  const p = PM.get(it.id);
  if (!p) return "";
  const col = p.colors[it.v % p.colors.length];
  return `<div class="line">${art(p, it.v)}<div class="line-info"><a href="#/p/${p.id}">${esc(p.title)}</a><span class="muted">${p.colors.length > 1 ? esc(col.name) + " · " : ""}${t("Qty {n}", { n: num(it.q) })}</span>${again ? `<div><button class="btn small" type="button" data-act="again" data-id="${p.id}" data-v="${it.v}" ${p.stock < 1 ? "disabled" : ""}>${p.stock < 1 ? t("Unavailable") : t("Buy it again")}</button></div>` : ""}</div><div class="line-total">${money(it.price * it.q)}</div></div>`;
}
VIEWS.orders = () => {
  if (!state.orders.length) return { html: `<h1 class="sr" id="ordTitle" tabindex="-1">${t("Your orders")}</h1>${emptyState(t("No orders yet"), t("Orders you place in this demo show up here."), "#/", t("Start shopping"))}` };
  return {
    html: `<div class="sec-head" style="margin-top:0"><h1 id="ordTitle" tabindex="-1">${t("Your orders")}</h1><button class="btn small" type="button" data-act="clearorders">${t("Clear demo orders")}</button></div>
    <div class="stack" style="gap:16px">${state.orders.map(o => `<article class="order" aria-label="${t("Order {id}", { id: esc(o.id) })}">
      <div class="order-head"><div><span class="muted">${t("Order placed")}</span><b>${esc(dateFmt(o.date))}</b></div><div><span class="muted">${t("Total")}</span><b>${money(o.total)}</b></div><div><span class="muted">${t("Ship to")}</span><b>${esc(o.to.name)}</b></div><div><span class="muted">${t("Order number")}</span><b class="mono">${esc(o.id)}</b></div></div>
      <div class="order-body"><p class="muted" style="padding-top:6px">${t("Pretend delivery: {when}", { when: esc(o.eta) })}${o.pay ? ` · ${t("Paid with")} ${esc(o.pay)}` : ""}</p>${o.items.map(it => orderLine(it, true)).join("")}</div></article>`).join("")}</div>`
  };
};
ACT.again = el => {
  const id = Number(el.dataset.id), p = PM.get(id);
  if (cartAdd(id, Number(el.dataset.v), 1)) { flyToCart(el); toast(t("Added to your cart"), { href: "#/cart", label: t("View cart") }); }
  else toast(t("{name} is unavailable", { name: p ? p.title : t("That item") }));
};
ACT.clearorders = () => {
  state.orders = []; save("orders");
  rerender(); focusFirst("#ordTitle", "#main");
  toast(t("Demo orders cleared"));
};
