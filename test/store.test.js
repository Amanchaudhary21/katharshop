/* store.test.js - Unit tests for the store's own JavaScript (public/js).  Run:  npm test
   The browser files are loaded in the order index.html lists them, into a pretend browser
   (node:vm with a fake page and localStorage). No browser, server, MySQL or internet needed.
   main.js is left out: it starts the page (menus, buttons, events) as soon as it loads. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), vm = require("vm");

const PUBLIC = path.join(__dirname, "..", "public");
const SCRIPTS = [...fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8").matchAll(/<script src="([^"?]+)/g)]
  .map(m => m[1]).filter(f => f !== "js/main.js");
const OWNER = "amanecdy@gmail.com";
const PHOTO = "data:image/jpeg;base64,AAAA";
const plain = v => JSON.parse(JSON.stringify(v)); // objects made inside the pretend browser, as plain objects

/* A fake page element: enough for the code under test (it only sets text and attributes) */
const fakeEl = () => ({
  textContent: "", innerHTML: "", value: "", hidden: false, dataset: {}, style: { setProperty() {} },
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, getAttribute: () => null, removeAttribute() {}, hasAttribute: () => false,
  addEventListener() {}, appendChild() {}, prepend() {}, insertAdjacentHTML() {}, focus() {},
  querySelector: () => null, querySelectorAll: () => [], closest: () => null
});

/* Opens the store as a signed-in shopper. saved = what is already in localStorage.
   server: true = opened from the shop server (http://localhost:8080), false = index.html double-clicked. */
function openStore({ lang = "en", email = "shopper@example.com", server = true, saved = {} } = {}) {
  const user = { id: "u1", first: "Asha", last: "Rai", email, google: "g-1", created: "2026-11-01T09:00:00.000Z", logins: [{ at: "2026-11-09T09:00:00.000Z", via: "Google" }] };
  const data = new Map(Object.entries({ "bz:lang": lang, "bz:users": [user], "bz:session": { id: user.id }, ...saved })
    .map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const storage = { getItem: k => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); }, removeItem: k => { data.delete(k); } };
  const els = new Map();
  const document = {
    documentElement: fakeEl(), body: fakeEl(), head: fakeEl(), hidden: false, addEventListener() {}, createElement: fakeEl,
    querySelector: s => { if (!els.has(s)) els.set(s, fakeEl()); return els.get(s); }, querySelectorAll: () => []
  };
  const location = server ? { protocol: "http:", hostname: "localhost", origin: "http://localhost:8080", hash: "" }
    : { protocol: "file:", hostname: "", origin: "null", hash: "" };
  const ctx = vm.createContext({
    document, location, localStorage: storage, sessionStorage: storage, navigator: {}, console, atob, URLSearchParams, AbortSignal,
    crypto: require("crypto").webcrypto, history: { pushState() {} }, matchMedia: () => ({ matches: false }), scrollTo() {},
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, addEventListener() {}, confirm: () => true,
    fetch: async () => { throw new Error("no internet in unit tests"); }
  });
  ctx.window = ctx;
  for (const f of SCRIPTS) vm.runInContext(fs.readFileSync(path.join(PUBLIC, f), "utf8"), ctx, { filename: f });
  vm.runInContext("function syncSearch() {}", ctx); // main.js's version (not loaded) keeps the search box in step
  return { run: code => vm.runInContext(code, ctx), data, text: sel => els.has(sel) ? els.get(sel).textContent : "" };
}
/* a product as the shop server keeps it: prices in US dollars */
const saved = (id, usd, more = {}) => ({ id, cat: "home", art: "box", title: "Item " + id, usd, usdWas: 0, price: usd, was: 0, rating: 0, n: 0,
  stock: 50, colors: [{ name: "Default", hex: "#8A9BA8" }], bullets: ["Nice"], specs: [["Seller", "Aman"]], kw: "", age: 1, photo: PHOTO, mine: true, ...more });
/* the dollars the Sell page saves for a price typed in rupees: saved(1001, rs(1000)) costs रू 1,000 */
const rs = rupees => Math.round(rupees / 150.58 * 10000) / 10000;
const withProducts = (list, opts = {}) => openStore({ ...opts, saved: { "bz:srvAdded": list, ...(opts.saved || {}) } });

/* ---------- languages ---------- */
test("every browser file loads, in the order index.html gives", () => {
  assert.ok(SCRIPTS.length >= 13);
  const s = openStore();
  assert.equal(s.run("typeof VIEWS.home"), "function");
});

test("t() translates, fills in {names}, and falls back to English", () => {
  const en = openStore(), ne = openStore({ lang: "ne" });
  assert.equal(en.run('t("Add to cart")'), "Add to cart");
  assert.equal(en.run("t")("Hi {n}, {m}", { n: "Aman" }), "Hi Aman, {m}");
  assert.equal(ne.run('t("Sign out")'), ne.run('I18N.ne["Sign out"]'));
  assert.notEqual(ne.run('t("Sign out")'), "Sign out");
  assert.equal(ne.run('t("Some text nobody translated")'), "Some text nobody translated");
});

test("an unknown saved language falls back to Nepali, the default", () => {
  assert.equal(openStore({ lang: "xx" }).run("LANG"), "ne");
});

test("every t(\"...\") text in the code is translated in all three languages, with the same {names}", () => {
  const code = ["core", "pages"].flatMap(d => fs.readdirSync(path.join(PUBLIC, "js", d)).map(f => path.join(PUBLIC, "js", d, f)))
    .concat(path.join(PUBLIC, "js", "main.js")).map(f => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")).join("\n");
  const texts = new Set([...code.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)].map(m => JSON.parse(`"${m[1]}"`)));
  assert.ok(texts.size > 300);
  const names = s => (s.match(/\{\w+\}/g) || []).sort().join(" ");
  for (const lang of ["ne", "hi", "ja"]) {
    const dict = plain(openStore({ lang }).run(`I18N.${lang}`));
    assert.deepEqual([...texts].filter(s => !(s in dict)), [], `${lang}.js is missing translations`);
    for (const [en, tr] of Object.entries(dict)) assert.equal(names(tr), names(en), `${lang}: ${en}`);
  }
});

test("numbers and dates in Nepali use Devanagari digits and lakh grouping", () => {
  const ne = openStore({ lang: "ne" });
  assert.equal(ne.run("num(150580)"), "१,५०,५८०");
  assert.equal(ne.run("num(2.5, 1)"), "२.५");
  assert.equal(ne.run("fmtDate")(new Date(2026, 10, 9).getTime(), { month: "long", day: "numeric" }), "नोभेम्बर ९");
  assert.equal(openStore({ lang: "ja" }).run("num(1234567)"), "1,234,567");
});

/* ---------- money ---------- */
test("prices are in Nepali rupees in every language, with the language's own digits", () => {
  assert.equal(openStore({ lang: "ne" }).run("money(1882)"), "रू १,८८२");
  assert.equal(openStore({ lang: "en" }).run("money(1882)"), "रू 1,882");
  assert.equal(openStore({ lang: "hi" }).run("money(1882)"), "रू 1,882");
  assert.equal(openStore({ lang: "ja" }).run("money(1882)"), "रू 1,882");
  assert.equal(openStore().run("money(-300)"), "-रू 300");
  for (const lang of ["ne", "en", "hi", "ja"]) assert.equal(openStore({ lang }).run("CUR.code"), "NPR", lang);
});

test("an amount in another currency shows in that currency (old orders, yen payments)", () => {
  assert.equal(openStore().run('money(1999, "JPY")'), "￥1,999");
  assert.equal(openStore().run('money(12.5, "USD")'), "$12.50");
});

test("dollar prices become whole rupees in every language", () => {
  for (const lang of ["ne", "en", "hi", "ja"]) assert.equal(openStore({ lang }).run("toCur(12.5)"), 1882, lang); // 12.5 x 150.58 = 1882.25
});

test("a price typed in rupees on the Sell page comes back exactly as typed", () => {
  for (const lang of ["ne", "en"]) {
    const s = openStore({ lang }), toUsd = s.run("toUsd"), toCur = s.run("toCur");
    for (let amount = 1; amount <= 100000; amount++) if (toCur(toUsd(amount)) !== amount) assert.fail(`${lang}: रू ${amount} came back as ${toCur(toUsd(amount))}`);
  }
});

test("an old order paid in dollars or yen counts in rupees", () => {
  assert.equal(openStore({ lang: "ja" }).run('fromCur(10, "USD")'), 1506); // 10 x 150.58 = 1505.8
  assert.equal(openStore().run('fromCur(1583, "JPY")'), 1506);              // ￥1,583 is about $10
  assert.equal(openStore().run('fromCur(1506, "NPR")'), 1506);
  assert.equal(openStore().run('fromCur(7, "XYZ")'), 1054); // unknown currency: treated as dollars
});

test("delivery fees and the free-delivery limit are round rupees in every language", () => {
  for (const lang of ["ne", "en", "hi", "ja"]) assert.deepEqual(plain(openStore({ lang }).run("[FREE_SHIP_MIN, SHIP_STD, SHIP_EXP]")), [5300, 750, 2000], lang);
});

test("the price filter's bands are round rupees", () => {
  for (const lang of ["ne", "en", "ja"]) assert.deepEqual(plain(openStore({ lang }).run("PRICE_BANDS.map(b => b[0])")), ["", "0-3800", "3800-7500", "7500-15000", "15000-38000", "38000-"], lang);
  assert.equal(openStore().run("PRICE_BANDS[1][1]"), "Under रू 3,800");
});

/* ---------- products ---------- */
test("saved products load at start: no photo = skipped, prices from before currencies were dollars", () => {
  const s = withProducts([saved(1001, 10), { ...saved(1002, 0), usd: undefined, price: 20 }, { ...saved(1003, 5), photo: "" }], { lang: "ja" });
  assert.deepEqual(plain(s.run("P.map(p => [p.id, p.usd, p.price])")), [[1001, 10, 1506], [1002, 20, 3012]]);
  assert.equal(s.run("PM.has(1003)"), false);
});

test("opened from a double-clicked index.html, the store uses this browser's own products (bz:mine)", () => {
  const s = openStore({ server: false, saved: { "bz:mine": [saved(1001, 3)], "bz:srvAdded": [saved(1002, 4)] } });
  assert.equal(s.run("API_URL"), "");
  assert.deepEqual(plain(s.run("P.map(p => p.id)")), [1001]);
});

test("a product from the shop server gets its price in rupees and keeps the dollars", () => {
  const p = plain(openStore({ lang: "ja" }).run("fromServer")({
    id: 1001, cat: "home", art: "box", title: "Clay vase", price: 13.2753, was: 0, rating: 0, n: 0, stock: 4, // रू 1,999 typed on the Sell page
    colors: [{ name: "Default", hex: "#8A9BA8" }], bullets: ["Made by hand"], specs: [["Seller", "Aman"]], kw: "", age: 1, photo: PHOTO, created: "2026-11-09T00:00:00.000Z"
  }));
  assert.equal(p.price, 1999);
  assert.equal(p.usd, 13.2753);
  assert.equal(p.mine, true);
  assert.equal(p.photo, PHOTO);
});

test("art() shows the photo, names it only when asked, and never lets a quote break out", () => {
  const art = openStore().run("art");
  assert.equal(art({ title: "Vase", photo: PHOTO }), `<span class="art photo"><img src="${PHOTO}" alt="" loading="lazy"></span>`);
  assert.match(art({ title: 'Big "Blue" Vase', photo: PHOTO }, true), /alt="Big &quot;Blue&quot; Vase"/);
  assert.doesNotMatch(art({ title: "x", photo: 'data:image/png" onerror="alert(1)' }), /" onerror="/);
  const drawn = art({ title: "No photo", colors: [{ name: "Default", hex: "#8A9BA8" }] }, true);
  assert.match(drawn, /<svg[^>]+role="img" aria-label="No photo"/);
});

test("a product card escapes its title, and only the owner gets a Delete button", () => {
  const bad = saved(1001, 10, { title: "<img src=x onerror=alert(1)>" });
  const shopper = withProducts([bad]).run("card(PM.get(1001))");
  assert.ok(!shopper.includes("<img src=x"));
  assert.ok(shopper.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!shopper.includes('data-act="unsell"'));
  assert.ok(withProducts([bad], { email: OWNER }).run("card(PM.get(1001))").includes('data-act="unsell"'));
});

test("product cards: sale badge from 20% off, New for new items, disabled when out of stock", () => {
  const s = withProducts([saved(1001, 10, { usdWas: 20 }), saved(1002, 10, { age: 3 }), saved(1003, 10, { stock: 0 })]);
  assert.match(s.run("card(PM.get(1001))"), /badge sale">-50%/);
  assert.match(s.run("card(PM.get(1002))"), /class="badge">New</);
  assert.match(s.run("card(PM.get(1003))"), /disabled>Unavailable</);
});

test("shoppers see how many are left: the number, and 'Only' from 5 down", () => {
  const s = withProducts([saved(1001, 10, { stock: 12 }), saved(1002, 10, { stock: 3 }), saved(1003, 10, { stock: 0 })]);
  assert.match(s.run("card(PM.get(1001))"), /class="stock-ok">12 left in stock</);
  assert.match(s.run("card(PM.get(1002))"), /class="stock-low">Only 3 left in stock</);
  assert.doesNotMatch(s.run("card(PM.get(1003))"), /left in stock/); // out of stock: "Currently unavailable" instead
  assert.match(s.run("VIEWS.product({ id: 1001 }).html"), /class="stock-ok">12 left in stock</);
  assert.match(s.run("VIEWS.product({ id: 1002 }).html"), /Only 3 left in stock\. Order soon\./);
  s.run("cartAdd(1001, 1)");
  assert.match(s.run("VIEWS.cart({}).html"), /12 left in stock/);
  assert.match(withProducts([saved(1001, 10, { stock: 12 })], { lang: "ne" }).run("card(PM.get(1001))"), /स्टकमा १२ वटा बाँकी/);
});

test("search: every word must match; title beats department; the department filter narrows it", () => {
  const s = withProducts([saved(1001, 10, { title: "Blue Clay Vase", cat: "home" }), saved(1002, 10, { title: "Blue Running Shoes", cat: "sports" }),
    saved(1003, 10, { title: "Green Tea", cat: "grocery" })]);
  const find = (q, cat = "") => plain(s.run("baseList")({ mode: "search", q, cat }).map(p => p.id));
  assert.deepEqual(find("blue").sort(), [1001, 1002]);
  assert.deepEqual(find("BLUE vase"), [1001]);
  assert.deepEqual(find("kitchen"), [1001]); // the department is called "Home & Kitchen"
  assert.deepEqual(find("blue", "sports"), [1002]);
  assert.deepEqual(find("red"), []);
  assert.deepEqual(plain(s.run("baseList")({ mode: "cat", cat: "grocery" }).map(p => p.id)), [1003]);
});

test("filters: price band, in stock, on sale and sorting", () => {
  const s = withProducts([saved(1001, rs(1500)), saved(1002, rs(4500), { usdWas: rs(6000) }), saved(1003, rs(9000), { stock: 0 })]);
  const ids = setup => { s.run("LF = fresh('test')"); Object.assign(s.run("LF"), setup); return plain(s.run("applyFilters(P)").map(p => p.id)); };
  assert.deepEqual(ids({ band: "3800-7500" }), [1002]);
  assert.deepEqual(ids({ stock: true }), [1001, 1002]);
  assert.deepEqual(ids({ sale: true }), [1002]);
  assert.deepEqual(ids({ sort: "price-desc" }), [1003, 1002, 1001]);
  assert.deepEqual(ids({ min: "2000", max: "8999" }), [1002]);
});

/* ---------- cart, wish list, totals ---------- */
test("cart: never more than the stock or 10, out-of-stock items can't be added, counts update", () => {
  const s = withProducts([saved(1001, 10, { stock: 3 }), saved(1002, 20), saved(1003, 5, { stock: 0 })]);
  assert.equal(s.run("cartAdd(1003)"), false);
  assert.equal(s.run("cartAdd(999)"), false); // no such product
  s.run("cartAdd(1001, 5); cartAdd(1001, 1); cartAdd(1002, 20)");
  assert.deepEqual(plain(s.run("state.cart")), [{ id: 1001, q: 3 }, { id: 1002, q: 10 }]);
  assert.equal(s.text("#cartCount"), "13");
  s.run("cartSet(1001, 0); cartSet(1002, 4)");
  assert.deepEqual(JSON.parse(s.data.get("bz:u1:cart")), [{ id: 1002, q: 4 }]);
  assert.equal(s.text("#cartCount"), "4");
});

test("a cart saved by the older version (with a colour number) still works", () => {
  const s = withProducts([saved(1001, 10)], { saved: { "bz:u1:cart": [{ id: 1001, v: 0, q: 2 }, { id: 4242, v: 0, q: 1 }] } });
  assert.equal(s.run("state.cart.length"), 1); // the product that is gone is dropped
  s.run("cartAdd(1001, 1)");
  assert.equal(s.run("state.cart[0].q"), 3);
});

test("totals: free delivery over रू 5,300, coupons, express", () => {
  const s = withProducts([saved(1001, rs(1000))]);
  const tot = () => plain(s.run("totals()"));
  const pick = ({ count, sub, off, ship, total, toFree }) => ({ count, sub, off, ship, total, toFree });
  assert.deepEqual(pick(tot()), { count: 0, sub: 0, off: 0, ship: 0, total: 0, toFree: 5300 });
  s.run("cartAdd(1001, 1)");
  assert.deepEqual(pick(tot()), { count: 1, sub: 1000, off: 0, ship: 750, total: 1750, toFree: 4300 });
  s.run("state.coupon = 'WELCOME10'");
  assert.equal(tot().total, 1650);
  s.run("state.coupon = 'FREESHIP'");
  assert.equal(tot().total, 1000);
  s.run("state.coupon = null; cartSet(1001, 6)");
  assert.equal(tot().ship, 0); // रू 6,000 is over रू 5,300
  s.run("state.ship = 'exp'");
  assert.equal(tot().ship, 2000);
});

test("delivery is free from exactly the limit, not just above it", () => {
  const s = withProducts([saved(1001, rs(5300)), saved(1002, rs(5299))]);
  s.run("cartAdd(1001, 1)");
  assert.equal(s.run("totals().ship"), 0);
  s.run("cartSet(1001, 0); cartAdd(1002, 1)");
  assert.equal(s.run("totals().ship"), 750);
  assert.equal(s.run("totals().toFree"), 1);
});

test("totals are whole rupees", () => {
  const s = withProducts([saved(1001, 0.333)], { lang: "ja" }); // 50.14 rupees -> 50
  s.run("cartAdd(1001, 3); state.coupon = 'WELCOME10'");
  const { sub, off, ship, total } = plain(s.run("totals()"));
  assert.deepEqual({ sub, off, ship, total }, { sub: 150, off: 15, ship: 750, total: 885 });
});

test("wish list and recently viewed", () => {
  const s = withProducts([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009].map(id => saved(id, 1)));
  assert.equal(s.run("toggleWish(1001)"), true);
  assert.equal(s.text("#wishCount"), "1");
  assert.equal(s.run("toggleWish(1001)"), false);
  assert.equal(s.text("#wishCount"), "");
  s.run("[1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1002].forEach(addRecent)");
  assert.deepEqual(plain(s.run("state.recent")), [1002, 1009, 1008, 1007, 1006, 1005, 1004, 1003]);
});

test("a demo order is in rupees and empties the cart; an old order paid in yen still shows in yen", () => {
  const old = { id: "BZ-111111", date: "2026-11-01T09:00:00.000Z", items: [{ id: 1001, q: 1, price: 1979 }], cur: "JPY",
    sub: 1979, off: 0, ship: 0, total: 1979, eta: "Nov 3 to Nov 5", pay: "PayPay", to: { name: "Asha", place: "Tokyo, Japan" } };
  const s = withProducts([saved(1001, rs(1000))], { lang: "ja", saved: { "bz:u1:orders": [old] } });
  s.run("cartAdd(1001, 2); placeOrder('BZ-123456', totals(), 'Visa ending 4242')");
  const o = plain(s.run("state.orders[0]"));
  assert.equal(o.cur, "NPR");
  assert.deepEqual(o.items, [{ id: 1001, q: 2, price: 1000 }]);
  assert.equal(o.total, 2000 + 750);
  assert.equal(s.run("state.cart.length"), 0);
  assert.match(s.run("VIEWS.done({ id: 'BZ-123456' }).html"), /रू 2,750/);
  assert.match(s.run("VIEWS.done({ id: 'BZ-111111' }).html"), /￥1,979/);
});

/* ---------- pages, sign-in, owner ---------- */
test("every page draws without errors, with products in the cart, wish list and orders", () => {
  for (const email of ["shopper@example.com", OWNER]) {
    const s = withProducts([saved(1001, 10, { title: "Blue Clay Vase", usdWas: 15 }), saved(1002, 40, { cat: "sports", stock: 2 })], { email });
    s.run("cartAdd(1001, 2); cartAdd(1002, 1); toggleWish(1002); placeOrder('BZ-111111', totals(), 'Visa ending 4242'); cartAdd(1001, 1)");
    const pages = { home: {}, list: { mode: "search", q: "blue", cat: "" }, product: { id: 1001 }, cart: {}, checkout: {}, orders: {},
      wishlist: {}, account: {}, sell: {}, done: { id: "BZ-111111" } };
    for (const [name, route] of Object.entries(pages)) {
      const html = s.run("VIEWS")[name]({ name, ...route }).html;
      assert.ok(html.length > 200, `${name} page for ${email}`);
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, `${name} page for ${email}`);
    }
    assert.match(s.run("VIEWS.product({ id: 1001 }).html"), /Blue Clay Vase/);
    assert.match(s.run("VIEWS.cart({}).html"), /Blue Clay Vase/);
    assert.match(s.run("VIEWS.orders({}).html"), /BZ-111111.*Buy it again/s);
  }
});

test("router: every kind of link opens the right page", () => {
  const parse = path => plain(openStore().run("parse")(path));
  assert.deepEqual(parse("/"), { name: "home" });
  assert.deepEqual(parse("/deals"), { name: "list", mode: "deals" });
  assert.deepEqual(parse("/c/home"), { name: "list", mode: "cat", cat: "home" });
  assert.deepEqual(parse("/s/blue%20mug?cat=home"), { name: "list", mode: "search", q: "blue mug", cat: "home" });
  assert.deepEqual(parse("/s"), { name: "list", mode: "search", q: "", cat: "" });
  assert.deepEqual(parse("/p/1001"), { name: "product", id: 1001 });
  assert.deepEqual(parse("/sell?name=Clay%20vase&cat=home"), { name: "sell", title: "Clay vase", cat: "home" });
  for (const name of ["cart", "checkout", "orders", "wishlist", "account"]) assert.deepEqual(parse("/" + name), { name });
  assert.deepEqual(parse("/done/BZ-123456"), { name: "done", id: "BZ-123456" });
  assert.deepEqual(parse("/no/such/page"), { name: "home" });
  assert.deepEqual(parse("/s/%E0%A4"), { name: "list", mode: "search", q: "%E0%A4", cat: "" }); // broken link text: no crash
});

test("esc() makes any text safe to put in the page", () => {
  const esc = openStore().run("esc");
  assert.equal(esc(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  assert.equal(esc(null), "");
  assert.equal(esc(0), "0");
});

test("only the owner's Google account may sell", () => {
  assert.equal(openStore({ email: OWNER }).run("IS_OWNER"), true);
  assert.equal(openStore().run("IS_OWNER"), false);
  assert.match(openStore().run("VIEWS.sell({}).html"), /Only the store owner can add items/);
  assert.match(openStore({ email: OWNER }).run("VIEWS.sell({}).html"), /id="sellForm"/);
});

test("the Google sign-in token is read with non-English names intact", () => {
  const body = Buffer.from(JSON.stringify({ given_name: "アマン", name: "चौधरी अमन", email: "a@example.com" })).toString("base64url");
  const g = plain(openStore().run("readGoogleToken")(`e30.${body}.sig`));
  assert.equal(g.given_name, "アマン");
  assert.equal(g.name, "चौधरी अमन");
});

test("profile page: Google sign-in only (no password form) and money spent in the shopper's currency", () => {
  const s = openStore({ saved: { "bz:u1:orders": [{ id: "BZ-1", total: 1583, cur: "JPY", items: [] }, { id: "BZ-2", total: 10, items: [] }] } });
  const html = s.run("VIEWS.account().html");
  assert.match(html, /<b>Google<\/b> <span class="muted">shopper@example\.com<\/span>/);
  assert.match(html, /<b>रू 3,012<\/b><span>Spent<\/span>/); // ￥1,583 and $10 are each about रू 1,506
  assert.doesNotMatch(html, /type="password"|data-act="pwopen"|data-act="emopen"/);
});

/* ---------- checkout and Sell forms ---------- */
test("checkout address rules", () => {
  const R = openStore().run("RULES");
  assert.notEqual(R.name("A"), true);
  assert.equal(R.name("Asha Rai"), true);
  assert.notEqual(R.email("asha@example"), true);
  assert.equal(R.email("asha@example.com"), true);
  for (const zip of ["10001", "100-0001", "SW1A 1AA", "K1A 0B1"]) assert.equal(R.zip(zip), true, zip);
  for (const zip of ["12", "!!!!", "12345678901"]) assert.notEqual(R.zip(zip), true, zip);
});

test("demo card payment: only the test cards work, a real-looking card never does", () => {
  const s = openStore(), luhn = s.run("luhn"), C = s.run("CARD_RULES");
  assert.equal(luhn("4242424242424242"), true);
  assert.equal(luhn("4242424242424241"), false);
  assert.equal(C.num("4242 4242 4242 4242"), true);
  assert.match(C.num("4111 1111 1111 1111"), /use a test card/); // valid number, but not a test card
  assert.match(C.num("4000 0000 0000 0002"), /declined/);
  assert.match(C.num("1234"), /valid card number/);
  assert.equal(C.exp("12/99"), true);
  assert.match(C.exp("01/20"), /expired/);
  assert.match(C.exp("13/30"), /MM\/YY/);
  assert.equal(C.cvc("123"), true);
  assert.notEqual(C.cvc("12"), true);
});

test("QR, konbini and bank payments are charged in yen", () => {
  for (const lang of ["ne", "en"]) assert.equal(openStore({ lang }).run("toYen(1506)"), 1583, lang); // रू 1,506 is about $10
  assert.equal(openStore().run("yen(1506)"), "￥1,583");
});

test("Sell form rules", () => {
  const R = openStore({ email: OWNER }).run("SELL_RULES");
  assert.notEqual(R.title("ab"), true);
  assert.equal(R.title("Clay vase"), true);
  assert.notEqual(R.price("0"), true);
  assert.equal(R.price("19.99"), true);
  assert.notEqual(R.stock("1.5"), true);
  assert.notEqual(R.stock("-1"), true);
  assert.equal(R.stock("0"), true);
});
