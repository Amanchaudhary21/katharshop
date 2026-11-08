/* api.js - The shop's API (library: Express). Same addresses the store's JavaScript calls:

   POST   /api/owner/login      owner email + owner password -> token (the "Connect" box on the Sell page)
   GET    /api/products/state   { added: [ids] }  the ids of all products; every shopper checks this every 30 s
   GET    /api/products/added   all products, with photos
   POST   /api/products         owner: add a product (saved in MySQL with the date it was added)
   DELETE /api/products/:id     owner: delete a product (its row is removed from MySQL) */
const express = require("express");
const crypto = require("crypto");
const { db, insertProducts } = require("./db");
const { CATEGORIES } = require("./catalog");

const MAX_PHOTO = 1_500_000; // a data: URL; the Sell page shrinks photos to 600 px (about 100 KB)
// prices are US dollars with 4 decimals, so rupee and yen prices typed on the Sell page convert back exactly
const round4 = n => Math.round(n * 10000) / 10000;

function makeApi({ ownerEmails, ownerPassword }) {
  const api = express.Router();
  api.use(express.json({ limit: "2mb" }));

  const isOwnerEmail = e => typeof e === "string" && ownerEmails.includes(e.trim().toLowerCase());
  const same = (a, b) => {
    const x = crypto.createHash("sha256").update(String(a)).digest(), y = crypto.createHash("sha256").update(String(b)).digest();
    return crypto.timingSafeEqual(x, y); // takes the same time either way, so the password can't be guessed from timing
  };
  const fail = (res, status, error) => res.status(status).json({ error });

  async function requireOwner(req, res, next) {
    const auth = req.get("Authorization") || "", token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token) {
      const [[s]] = await db().query("SELECT email FROM owner_sessions WHERE token = ?", [token]);
      if (s && isOwnerEmail(s.email)) return next();
    }
    fail(res, 401, "Connect to the shop server as the owner first.");
  }

  const productIds = async () => (await db().query("SELECT id FROM products ORDER BY id"))[0].map(r => Number(r.id));

  /* a product as the store's JavaScript wants it (see mk() in public/js/core/data.js) */
  const toJson = r => ({
    id: Number(r.id), cat: r.cat, art: r.art, title: r.title, price: r.price, was: r.was, rating: r.rating, n: r.n,
    stock: r.stock, colors: r.colors, bullets: r.bullets, specs: r.specs, kw: r.kw,
    age: 1 + Math.max(0, Math.floor((Date.now() - new Date(r.created)) / 86400000)), // days since it was added
    photo: r.photo, created: new Date(r.created).toISOString()
  });

  /* Slow down password guessing (the server can be reached from the internet through ngrok):
     after 10 wrong passwords from one address, that address waits 15 minutes */
  const LOCK_AFTER = 10, LOCK_MS = 15 * 60 * 1000, misses = new Map(); // address -> { n, first }
  api.post("/owner/login", async (req, res) => {
    const ip = req.ip || "?", now = Date.now();
    if (misses.size > 1000) for (const [k, m] of misses) if (now - m.first > LOCK_MS) misses.delete(k);
    let m = misses.get(ip);
    if (m && now - m.first > LOCK_MS) { misses.delete(ip); m = null; }
    if (m && m.n >= LOCK_AFTER) return fail(res, 429, "Too many wrong passwords. Wait 15 minutes, then try again.");
    const { email, password } = req.body || {};
    if (!isOwnerEmail(email) || !same(password || "", ownerPassword)) {
      if (m) m.n++; else misses.set(ip, { n: 1, first: now });
      return fail(res, 401, "Wrong owner email or password.");
    }
    misses.delete(ip);
    const token = crypto.randomBytes(32).toString("hex");
    await db().query("INSERT INTO owner_sessions (token, email) VALUES (?, ?)", [token, email.trim().toLowerCase()]);
    res.json({ token });
  });

  api.get("/products/state", async (req, res) => res.json({ added: await productIds() }));
  api.get("/products/added", async (req, res) => {
    const [rows] = await db().query("SELECT * FROM products ORDER BY id");
    res.json(rows.map(toJson));
  });

  /* "Save item to the shop" on the Sell page */
  api.post("/products", requireOwner, async (req, res) => {
    const b = req.body || {};
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const photo = typeof b.photo === "string" ? b.photo : "";
    const price = Number(b.price), was = Number(b.was) || 0, stock = Number(b.stock);
    const bullets = (Array.isArray(b.bullets) ? b.bullets : []).filter(x => typeof x === "string" && x.trim()).map(x => x.trim()).slice(0, 10);
    if (title.length < 3 || title.length > 90) return fail(res, 400, "The name must be 3 to 90 letters.");
    if (!CATEGORIES.includes(b.cat)) return fail(res, 400, "Unknown department.");
    if (!(price > 0) || price > 1_000_000) return fail(res, 400, "Enter a price above 0.");
    if (was !== 0 && !(was > price)) return fail(res, 400, "The old price must be higher than the price.");
    if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) return fail(res, 400, "Enter a stock of 0 or more.");
    if (!photo.startsWith("data:image/") || photo.length > MAX_PHOTO) return fail(res, 400, "Add a photo (JPG or PNG, up to about 1 MB).");
    if (bullets.some(x => x.length > 600)) return fail(res, 400, "Each point can have up to 600 letters.");
    const seller = (typeof b.seller === "string" && b.seller.trim() ? b.seller.trim() : "ShopNest").slice(0, 60);

    const product = {
      cat: b.cat, art: "box", title, price: round4(price), was: round4(was), rating: 0, n: 0, stock, kw: "", age: 1,
      colors: [{ name: "Default", hex: "#8A9BA8" }], bullets: bullets.length ? bullets : ["Added by the shop owner"],
      specs: [["Seller", seller]], photo, mine: true, created: new Date()
    };
    for (let tries = 0; ; tries++) { // a new id after the highest one (owner products start at 1001)
      const [[m]] = await db().query("SELECT COALESCE(MAX(id), 0) AS max FROM products");
      product.id = Math.max(1000, Number(m.max)) + 1;
      try { await insertProducts([product]); break; } catch (e) { if (e.code !== "ER_DUP_ENTRY" || tries > 3) throw e; }
    }
    const [[saved]] = await db().query("SELECT * FROM products WHERE id = ?", [product.id]);
    res.status(201).json(toJson(saved));
  });

  api.delete("/products/:id", requireOwner, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, "Bad product id.");
    const [r] = await db().query("DELETE FROM products WHERE id = ?", [id]);
    if (!r.affectedRows) return fail(res, 404, "No product " + id);
    res.json({ deleted: id });
  });

  api.use((req, res) => fail(res, 404, "Not found"));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err.type === "entity.too.large") return fail(res, 413, "That is too big. Try a smaller photo.");
    if (err.type === "entity.parse.failed") return fail(res, 400, "Bad JSON.");
    console.error(err);
    fail(res, 500, "The server had a problem. See its window for details.");
  });
  return api;
}

module.exports = { makeApi };
