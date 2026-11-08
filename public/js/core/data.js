/* ==================================================================
   data.js - Departments, coupons, delivery prices, home page banners,
   and where the products come from (the shop server's MySQL database).
   (file 5 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Store settings (edit freely) ---------- */
const BRAND = "ShopNest";
const FREE_SHIP_MIN = 35, SHIP_STD = 4.99, SHIP_EXP = 12.99;
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
/* The shop server (server.js: Node.js + Express + MySQL) keeps the products in MySQL, so what the
   owner adds or deletes is the same on every device.
   - Opened from the server itself (http://localhost:8080 or its ngrok link): it uses that server.
   - Opened on the live site (GitHub Pages): it uses SHOP_SERVER, the ngrok link to your laptop
     (NGROK_DOMAIN in .env; server.js prints it when it starts). When the laptop is off, the store
     shows the products it saw last. Empty = no server: added items stay in the owner's browser. */
const SHOP_SERVER = "";
const API_URL = !location.protocol.startsWith("http") ? ""
  : location.hostname.endsWith("github.io") ? SHOP_SERVER : location.origin;
/* The products the owner added. With a server: the last list it sent (bz:srvAdded), checked again
   as soon as the page loads (main.js). Without one: this browser only (bz:mine). */
try { (JSON.parse(localStorage.getItem(API_URL ? "bz:srvAdded" : "bz:mine")) || []).forEach(p => { if (p && p.id && p.photo) P.push(p); }); } catch (e) { /* blocked */ }
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
  { id: "pantry", h: t("Fill the pantry, skip the delivery fee"), t: t("Free delivery on every order over $35. Stock up on coffee, tea, oil and rice."), cta: t("Shop grocery"), to: "#/c/grocery", cat: "grocery", bg: "var(--tag)", ink: "var(--on-tag)" },
  { id: "move", h: t("Move more this season"), t: t("Mats, weights, balls and bottles to get you started."), cta: t("Shop sports"), to: "#/c/sports", cat: "sports", bg: "var(--accent)", ink: "var(--on-accent)" }
];
