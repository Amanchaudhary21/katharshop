/* ==================================================================
   data.js - Departments, coupons, delivery prices, home page banners,
   and where the products come from (the shop server's MySQL database).
   (file 5 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Store settings (edit freely) ---------- */
const BRAND = "ShopNest";

/* ---------- Money: every price is in Nepali rupees (रू), in every language ----------
   Prices are saved in US dollars (also in the shop server's MySQL) and shown in rupees with
   "rate" = how much 1 US dollar is. A price typed on the Sell page comes back exactly as typed.
   Don't change the NPR rate once the shop has products: every price would change with it.
   The other currencies are only for orders placed before the shop used rupees only, and for the
   Japanese payment methods at checkout (they charge in yen). Rates from exchangerate-api.com on 8 Nov 2026. */
const CURRENCIES = {
  en: { code: "USD", symbol: "$", rate: 1, digits: 2 },
  ne: { code: "NPR", symbol: "रू ", rate: 150.58, digits: 0 },
  hi: { code: "INR", symbol: "₹", rate: 94.11, digits: 0 },
  ja: { code: "JPY", symbol: "￥", rate: 158.32, digits: 0 }
};
const CUR = CURRENCIES.ne; // the shop's currency
const CUR_BY_CODE = Object.fromEntries(Object.values(CURRENCIES).map(c => [c.code, c]));
/* round the way this currency is shown: dollars to cents, rupees and yen to whole numbers */
const roundCur = n => { const f = 10 ** CUR.digits; return Math.round(n * f) / f; };
const toCur = usd => roundCur(usd * CUR.rate);                         // US dollars -> shopper's currency
const toUsd = amount => Math.round(amount / CUR.rate * 10000) / 10000; // shopper's currency -> US dollars
/* an amount in another currency (an old order's) -> the shopper's currency */
const fromCur = (amount, code) => roundCur(amount / (CUR_BY_CODE[code] || CURRENCIES.en).rate * CUR.rate);
/* An amount of money: रू १,८८२ in Nepali, रू 1,882 in the other languages.
   code: show it in that currency instead (an old order paid in $12.50, a yen payment ￥1,979). */
function money(n, code) {
  const c = (code && CUR_BY_CODE[code]) || CUR;
  return (n < 0 ? "-" : "") + c.symbol + fmtNum(Math.abs(n), { minimumFractionDigits: c.digits, maximumFractionDigits: c.digits });
}
/* Delivery, written in US dollars: free over FREE_SHIP_MIN, otherwise standard or express.
   In rupees they become round numbers: 35 dollars = रू 5,300, 4.99 = रू 750, 12.99 = रू 2,000. */
const shopFee = usd => CUR.rate === 1 ? usd : Number((usd * CUR.rate).toPrecision(2));
const FREE_SHIP_MIN = shopFee(35), SHIP_STD = shopFee(4.99), SHIP_EXP = shopFee(12.99);
const COUPONS = {
  WELCOME10: { kind: "pct", value: 10, label: "10% off your items" },
  FREESHIP: { kind: "ship", label: "Free standard delivery" }
};
const CATS = [
  { id: "electronics", name: "Electronics", blurb: "Audio, phones and computers" },
  { id: "fashion", name: "Fashion", blurb: "Shoes, tees and bags" },
  { id: "home", name: "Home & Kitchen", blurb: "Lighting and cookware" },
  { id: "books", name: "Books & Stationery", blurb: "Read, plan and write" },
  { id: "sports", name: "Sports & Outdoors", blurb: "Training and travel gear" },
  { id: "beauty", name: "Beauty & Care", blurb: "Skin, hair and scent" },
  { id: "toys", name: "Toys & Games", blurb: "Play for every age" },
  { id: "grocery", name: "Grocery & Pantry", blurb: "Staples and treats" }
];
const C = (...pairs) => pairs.map(p => ({ name: p[0], hex: p[1] }));
// mk(id, category, art, title, price, listPrice|0, rating, ratingCount, stock, colors, bullets, specs, keywords, daysOld)
const mk = (id, cat, art, title, price, was, rating, n, stock, colors, bullets, specs, kw, age) =>
  ({ id, cat, art, title, price, was: was || 0, rating, n, stock, colors, bullets, specs, kw: kw || "", age: age || 60 });

/* The products. The shop starts empty: the owner adds products on the "Sell an item" page
   (js/pages/sell.js), and they are saved in the shop server's MySQL database. */
const P = [];
/* The shop server (the backend folder: Java + Spring Boot + MySQL) keeps the products in MySQL, so what the
   owner adds or deletes is the same on every device.
   - Opened from the server itself (http://localhost:8080 or its ngrok link): it uses that server.
   - Opened on the live site (GitHub Pages): it uses SHOP_SERVER, the ngrok link to your laptop
     (NGROK_DOMAIN in .env; the server prints it when it starts). When the laptop is off, the store
     shows the products it saw last. Empty = no server: added items stay in the owner's browser. */
const SHOP_SERVER = "";
const API_URL = !location.protocol.startsWith("http") ? ""
  : location.hostname.endsWith("github.io") ? SHOP_SERVER : location.origin;
/* The products the owner added. With a server: the last list it sent (bz:srvAdded), checked again
   as soon as the page loads (main.js). Without one: this browser only (bz:mine).
   usd / usdWas = the saved US-dollar prices; price / was = the same in the shopper's currency. */
const inShopCurrency = p => { p.price = toCur(p.usd); p.was = toCur(p.usdWas || 0); return p; };
try {
  (JSON.parse(localStorage.getItem(API_URL ? "bz:srvAdded" : "bz:mine")) || []).forEach(p => {
    if (!p || !p.id || !p.photo) return;
    if (typeof p.usd !== "number") { p.usd = p.price; p.usdWas = p.was || 0; } // saved before currencies: those were dollars
    P.push(inShopCurrency(p));
  });
} catch (e) { /* blocked */ }
/* Department names and coupon labels in the shopper's language (js/i18n).
   Products keep the words the owner typed. */
if (LANG !== "en") {
  CATS.forEach(c => { c.name = t(c.name); c.blurb = t(c.blurb); });
  Object.values(COUPONS).forEach(c => { c.label = t(c.label); });
}
const PM = new Map(P.map(p => [p.id, p]));
/* Home page banners. A banner shows only when its department has products, with the newest one's photo. */
const HERO = [
  { id: "audio", h: t("Sound that goes where you go"), t: t("Headphones and speakers, with deals on the most loved models."), cta: t("Shop audio"), to: "#/c/electronics", cat: "electronics", bg: "var(--brand-2)", ink: "var(--on-brand)" },
  { id: "pantry", h: t("Fill the pantry, skip the delivery fee"), t: t("Free delivery on every order over {amount}. Stock up on coffee, tea, oil and rice.", { amount: money(FREE_SHIP_MIN) }), cta: t("Shop grocery"), to: "#/c/grocery", cat: "grocery", bg: "var(--tag)", ink: "var(--on-tag)" },
  { id: "move", h: t("Move more this season"), t: t("Mats, weights, balls and bottles to get you started."), cta: t("Shop sports"), to: "#/c/sports", cat: "sports", bg: "var(--accent)", ink: "var(--on-accent)" }
];
