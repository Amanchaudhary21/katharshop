/* api-unit.test.js - Unit tests for the shop API's rules (server/api.js), with a pretend database
   in memory instead of MySQL, so they run on any computer.  Run:  npm test
   test/api.test.js checks the same API against a real MySQL server. */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.OWNER_PASSWORD = "unit-owner-pass";
process.env.OWNER_EMAILS = "owner@example.com";
process.env.CORS_ORIGINS = "https://amanchaudhary21.github.io";

/* The pretend database: answers exactly the SQL that server/api.js sends */
const products = new Map(), sessions = new Map();
const fakeDb = {
  async query(sql, params = []) {
    if (sql.startsWith("SELECT email FROM owner_sessions")) return [sessions.has(params[0]) ? [{ email: sessions.get(params[0]) }] : []];
    if (sql.startsWith("INSERT INTO owner_sessions")) { sessions.set(params[0], params[1]); return [{}]; }
    if (sql.startsWith("SELECT id FROM products")) return [[...products.keys()].sort((a, b) => a - b).map(id => ({ id }))];
    if (sql.startsWith("SELECT COALESCE(MAX(id), 0) AS max")) return [[{ max: Math.max(0, ...products.keys()) }]];
    if (sql.startsWith("SELECT * FROM products WHERE id = ?")) return [products.has(params[0]) ? [products.get(params[0])] : []];
    if (sql.startsWith("SELECT * FROM products")) return [[...products.values()].sort((a, b) => a.id - b.id)];
    if (sql.startsWith("DELETE FROM products WHERE id = ?")) return [{ affectedRows: products.delete(params[0]) ? 1 : 0 }];
    throw new Error("the pretend database does not know this SQL: " + sql);
  }
};
const dbFile = require.resolve("../server/db");
require.cache[dbFile] = { id: dbFile, filename: dbFile, loaded: true, exports: {
  db: () => fakeDb, connect: async () => fakeDb, close: async () => {},
  insertProducts: async list => list.forEach(p => products.set(p.id, { ...p }))
} };

const { createApp } = require("../server");
const { CATEGORIES } = require("../server/catalog");

const PHOTO = "data:image/jpeg;base64,AAAA";
let dbUp = true, server, base;
before(async () => {
  server = createApp({ dbReady: () => dbUp }).listen(0, "127.0.0.1");
  await new Promise(r => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function call(method, url, body, headers = {}) {
  const res = await fetch(base + "/api" + url, { method, headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
const ownerToken = async () => (await call("POST", "/owner/login", { email: "Owner@Example.com ", password: "unit-owner-pass" })).body.token;
const asOwner = async () => ({ Authorization: "Bearer " + await ownerToken() });
const vase = (more = {}) => ({ cat: "home", title: "Clay Vase", price: 19.5, stock: 4, photo: PHOTO, ...more });

test("the API accepts exactly the store's departments (read from public/js/core/data.js)", () => {
  assert.deepEqual([...CATEGORIES], ["electronics", "fashion", "home", "books", "sports", "beauty", "toys", "grocery"]);
});

test("while MySQL is not connected the API says so (503), and the store itself still opens", async () => {
  dbUp = false;
  try {
    const r = await call("GET", "/products/state");
    assert.equal(r.status, 503);
    assert.match(r.body.error, /database is not connected/);
    const page = await fetch(base + "/index.html");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>ShopNest<\/title>/);
  } finally { dbUp = true; }
});

test("owner sign-in: the owner email in any case with the right password gives a token", async () => {
  const ok = await call("POST", "/owner/login", { email: "  OWNER@example.com", password: "unit-owner-pass" });
  assert.equal(ok.status, 200);
  assert.match(ok.body.token, /^[0-9a-f]{64}$/);
  assert.equal(sessions.get(ok.body.token), "owner@example.com");
  assert.equal((await call("POST", "/owner/login", { email: "owner@example.com", password: "nope" })).status, 401);
  assert.equal((await call("POST", "/owner/login", { email: "someone@example.com", password: "unit-owner-pass" })).status, 401);
  assert.equal((await call("POST", "/owner/login", {})).status, 401);
});

test("adding or deleting needs a token the server gave out, sent as 'Bearer <token>'", async () => {
  const token = await ownerToken();
  assert.equal((await call("POST", "/products", vase())).status, 401);
  assert.equal((await call("POST", "/products", vase(), { Authorization: token })).status, 401); // no "Bearer "
  assert.equal((await call("POST", "/products", vase(), { Authorization: "Bearer " + "0".repeat(64) })).status, 401);
  assert.equal((await call("DELETE", "/products/1001", undefined, { Authorization: "Bearer made-up" })).status, 401);
});

test("a new product is tidied: name trimmed, empty points dropped, at most 10 points, price to 4 decimals", async () => {
  const r = await call("POST", "/products", vase({
    title: "  Clay Vase  ", price: 12.626338, was: 20.123456,
    bullets: [" Made by hand ", "", "   ", 42, ...Array.from({ length: 12 }, (_, i) => "Point " + i)]
  }), await asOwner());
  assert.equal(r.status, 201);
  const p = r.body;
  assert.equal(p.title, "Clay Vase");
  assert.equal(p.price, 12.6263);
  assert.equal(p.was, 20.1235);
  assert.equal(p.bullets.length, 10);
  assert.equal(p.bullets[0], "Made by hand");
  assert.deepEqual(p.specs, [["Seller", "ShopNest"]]); // no seller name sent
  assert.equal(p.age, 1);
  assert.equal(p.art, "box");
  assert.deepEqual(p.colors, [{ name: "Default", hex: "#8A9BA8" }]);
  products.clear();
});

test("no points given: the product says who added it; a long seller name is cut to 60 letters", async () => {
  const p = (await call("POST", "/products", vase({ bullets: [], seller: "  " + "S".repeat(80) + " " }), await asOwner())).body;
  assert.deepEqual(p.bullets, ["Added by the shop owner"]);
  assert.equal(p.specs[0][1], "S".repeat(60));
  products.clear();
});

test("owner products get ids from 1001, each one after the highest", async () => {
  const h = await asOwner();
  const a = (await call("POST", "/products", vase(), h)).body, b = (await call("POST", "/products", vase(), h)).body;
  assert.deepEqual([a.id, b.id], [1001, 1002]);
  assert.deepEqual((await call("GET", "/products/state")).body, { added: [1001, 1002] });
  assert.deepEqual((await call("DELETE", "/products/1001", undefined, h)).body, { deleted: 1001 });
  assert.equal((await call("POST", "/products", vase(), h)).body.id, 1003);
  products.clear();
});

test("bad products are refused with a reason", async () => {
  const h = await asOwner();
  const bad = [
    [{ title: "ab" }, /3 to 90/], [{ title: "x".repeat(91) }, /3 to 90/], [{ title: 123 }, /3 to 90/],
    [{ cat: "cars" }, /department/], [{ cat: undefined }, /department/],
    [{ price: 0 }, /above 0/], [{ price: -5 }, /above 0/], [{ price: "abc" }, /above 0/], [{ price: 1_000_001 }, /above 0/],
    [{ was: 10, price: 19.5 }, /old price/], [{ was: 19.5 }, /old price/],
    [{ stock: 1.5 }, /stock/], [{ stock: -1 }, /stock/], [{ stock: undefined }, /stock/],
    [{ photo: "https://example.com/a.jpg" }, /photo/], [{ photo: "data:text/html,hi" }, /photo/],
    [{ photo: "data:image/jpeg;base64," + "A".repeat(1_500_000) }, /photo/],
    [{ bullets: ["x".repeat(601)] }, /600/]
  ];
  for (const [change, why] of bad) {
    const r = await call("POST", "/products", vase(change), h);
    assert.equal(r.status, 400, JSON.stringify(change).slice(0, 80));
    assert.match(r.body.error, why);
  }
  assert.equal(products.size, 0);
});

test("broken JSON, a body over 2 MB, a bad id and an unknown address get clear errors", async () => {
  const h = await asOwner();
  assert.deepEqual(await call("POST", "/products", "{not json", h), { status: 400, body: { error: "Bad JSON." } });
  const big = await call("POST", "/products", vase({ photo: "data:image/jpeg;base64," + "A".repeat(2_200_000) }), h);
  assert.equal(big.status, 413);
  assert.equal((await call("DELETE", "/products/abc", undefined, h)).status, 400);
  assert.equal((await call("DELETE", "/products/4242", undefined, h)).status, 404);
  assert.deepEqual(await call("GET", "/no/such/address"), { status: 404, body: { error: "Not found" } });
});

test("API answers are never cached, and the live site may call the API from the browser", async () => {
  const res = await fetch(base + "/api/products/state", { headers: { Origin: "https://amanchaudhary21.github.io" } });
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(res.headers.get("access-control-allow-origin"), "https://amanchaudhary21.github.io");
  const other = await fetch(base + "/api/products/state", { headers: { Origin: "https://evil.example" } });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
  assert.equal((await fetch(base + "/api/products", { method: "OPTIONS", headers: { Origin: "https://amanchaudhary21.github.io" } })).status, 204);
});
