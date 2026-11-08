/* api.test.js - Checks the shop API against a real MySQL server.  Run:  npm test
   Uses a separate database "shopnest_test" (made and dropped by the test), never your real "shopnest". */
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

process.env.DB_NAME = "shopnest_test";
process.env.OWNER_PASSWORD = "test-owner-pass";
process.env.OWNER_EMAILS = "amanecdy@gmail.com";
try { process.loadEnvFile(path.join(__dirname, "..", ".env")); } catch (e) { /* defaults */ }

const { createApp } = require("../server");
const { connect, close, db } = require("../server/db");

const PHOTO = "data:image/jpeg;base64,AAAA";
let server, base;

async function call(method, url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + "/api" + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}
const owner = async () => (await call("POST", "/owner/login", { email: " AmanEcdy@gmail.com", password: "test-owner-pass" })).body.token;
const vase = (more = {}) => ({ cat: "home", title: "  Handmade Clay Vase ", price: 19.5, was: 25, stock: 4, bullets: ["Made by hand", " "], photo: PHOTO, seller: "Aman", ...more });

before(async () => {
  if (!process.env.DB_NAME.endsWith("_test")) throw new Error("tests must use a *_test database");
  await connect();
  await db().query("DROP DATABASE shopnest_test"); // start clean
  await close();
  await connect();
  server = createApp({ dbReady: () => true }).listen(0, "127.0.0.1");
  await new Promise(r => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await db().query("DROP DATABASE shopnest_test");
  await close();
});

test("the shop starts empty: no sample products in the database", async () => {
  const [[r]] = await db().query("SELECT COUNT(*) AS n FROM products");
  assert.equal(r.n, 0);
  assert.deepEqual((await call("GET", "/products/state")).body, { added: [] });
  assert.deepEqual((await call("GET", "/products/added")).body, []);
});

test("only the owner with the right password can connect", async () => {
  assert.equal((await call("POST", "/owner/login", { email: "amanecdy@gmail.com", password: "wrong" })).status, 401);
  assert.equal((await call("POST", "/owner/login", { email: "someone@gmail.com", password: "test-owner-pass" })).status, 401);
  assert.ok(await owner());
});

test("shoppers cannot add or delete", async () => {
  assert.equal((await call("POST", "/products", vase())).status, 401);
  assert.equal((await call("DELETE", "/products/1001", null, "made-up")).status, 401);
});

test("an added product is saved in MySQL with its date, every shopper sees it, and delete removes the row", async () => {
  const token = await owner();
  const r = await call("POST", "/products", vase(), token);
  assert.equal(r.status, 201);
  const p = r.body;
  assert.ok(p.id > 1000);
  assert.equal(p.title, "Handmade Clay Vase");
  assert.deepEqual(p.bullets, ["Made by hand"]);
  assert.deepEqual(p.specs, [["Seller", "Aman"]]);
  assert.equal(p.age, 1);
  assert.ok(Date.now() - new Date(p.created) < 60000);

  const [[row]] = await db().query("SELECT title, price, created FROM products WHERE id = ?", [p.id]);
  assert.equal(row.title, "Handmade Clay Vase");
  assert.equal(row.price, 19.5);
  assert.ok(row.created instanceof Date);

  assert.ok((await call("GET", "/products/state")).body.added.includes(p.id));
  const added = (await call("GET", "/products/added")).body;
  assert.equal(added.find(x => x.id === p.id).photo, PHOTO);

  assert.equal((await call("DELETE", `/products/${p.id}`, null, token)).status, 200);
  const [rows] = await db().query("SELECT id FROM products WHERE id = ?", [p.id]);
  assert.equal(rows.length, 0);
  assert.ok(!(await call("GET", "/products/state")).body.added.includes(p.id));
  assert.equal((await call("DELETE", `/products/${p.id}`, null, token)).status, 404);
});

test("every shopper gets all added products, newest id last, and the old restore address is gone", async () => {
  const token = await owner();
  const a = (await call("POST", "/products", vase({ title: "Blue Teapot", cat: "home" }), token)).body;
  const b = (await call("POST", "/products", vase({ title: "Kids Football", cat: "sports", was: 0 }), token)).body;
  assert.equal(b.id, a.id + 1);
  assert.deepEqual((await call("GET", "/products/state")).body, { added: [a.id, b.id] });
  assert.deepEqual((await call("GET", "/products/added")).body.map(p => [p.title, p.cat]), [["Blue Teapot", "home"], ["Kids Football", "sports"]]);
  assert.deepEqual((await call("DELETE", `/products/${a.id}`, null, token)).body, { deleted: a.id });
  assert.deepEqual((await call("GET", "/products/state")).body, { added: [b.id] });
  assert.equal((await call("POST", "/products/restore", null, token)).status, 404);
  await call("DELETE", `/products/${b.id}`, null, token);
});

test("the live site may call the API, other sites may not", async () => {
  const ask = async origin => (await fetch(base + "/api/products/state", { method: "OPTIONS", headers: {
    Origin: origin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "content-type,ngrok-skip-browser-warning" } })).headers;
  const ok = await ask("https://amanchaudhary21.github.io");
  assert.equal(ok.get("access-control-allow-origin"), "https://amanchaudhary21.github.io");
  assert.match(ok.get("access-control-allow-headers"), /ngrok-skip-browser-warning/);
  assert.equal((await ask("https://evil.example")).get("access-control-allow-origin"), null);
});

test("prices keep 4 decimals, so a price typed in rupees or yen converts back exactly", async () => {
  const token = await owner();
  // ￥1,999 at 158.32 yen to the dollar = 12.62633... dollars -> saved as 12.6263 -> shown as ￥1,999 again
  const p = (await call("POST", "/products", vase({ price: 1999 / 158.32, was: 0 }), token)).body;
  assert.equal(p.price, 12.6263);
  assert.equal(Math.round(p.price * 158.32), 1999);
  const [[row]] = await db().query("SELECT price FROM products WHERE id = ?", [p.id]);
  assert.equal(row.price, 12.6263);
  await call("DELETE", `/products/${p.id}`, null, token);
});

test("bad products are refused", async () => {
  const token = await owner();
  for (const bad of [{ title: "ab" }, { cat: "nope" }, { price: 0 }, { was: 4, price: 5 }, { photo: "http://x/y.jpg" }, { stock: -1 }]) {
    assert.equal((await call("POST", "/products", vase(bad), token)).status, 400, JSON.stringify(bad));
  }
});

// keep this test last: it locks this computer's address out of owner sign-in for 15 minutes
test("after 10 wrong owner passwords, sign-in waits 15 minutes", async () => {
  for (let i = 0; i < 10; i++) assert.equal((await call("POST", "/owner/login", { email: "amanecdy@gmail.com", password: "guess" + i })).status, 401);
  assert.equal((await call("POST", "/owner/login", { email: "amanecdy@gmail.com", password: "test-owner-pass" })).status, 429);
});
