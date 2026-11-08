/* db.js - The MySQL database (library: mysql2).
   The "shopnest" database and its tables are made the first time the server starts.

   products         every product in the shop: the 32 samples and the ones the owner adds.
                    Deleting a product removes its row. "created" = the date and time it was added.
   owner_sessions   owners who connected on the Sell page (token -> email)
   shop_meta        small settings, like "the sample products were added once" */
const mysql = require("mysql2/promise");
const { SAMPLES } = require("./catalog");

const config = () => ({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopnest"
});

let pool = null;
const db = () => pool;

const PRODUCT_COLS = "id, cat, art, title, price, was, rating, n, stock, kw, age, colors, bullets, specs, photo, mine, created";
const row = p => [p.id, p.cat, p.art || "box", p.title, p.price, p.was || 0, p.rating || 0, p.n || 0, p.stock || 0, p.kw || "",
  p.age || 60, JSON.stringify(p.colors || []), JSON.stringify(p.bullets || []), JSON.stringify(p.specs || []),
  p.photo || null, p.mine ? 1 : 0, p.created || new Date()];

async function insertProducts(list, ignoreExisting = false) {
  if (!list.length) return;
  await pool.query(`INSERT ${ignoreExisting ? "IGNORE " : ""}INTO products (${PRODUCT_COLS}) VALUES ?`, [list.map(row)]);
}

/* Opens the connection, makes the database and tables if they are missing, adds the sample products once */
async function connect() {
  const c = config();
  if (!/^[A-Za-z0-9_]+$/.test(c.database)) throw new Error("DB_NAME may only use letters, numbers and _");
  const first = await mysql.createConnection({ ...c, database: undefined });
  await first.query(`CREATE DATABASE IF NOT EXISTS \`${c.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await first.end();

  pool = mysql.createPool({ ...c, connectionLimit: 10, decimalNumbers: true, timezone: "Z", charset: "utf8mb4" });
  await pool.query(`CREATE TABLE IF NOT EXISTS products (
    id BIGINT PRIMARY KEY,
    cat VARCHAR(40) NOT NULL,
    art VARCHAR(40) NOT NULL DEFAULT 'box',
    title VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    was DECIMAL(10,2) NOT NULL DEFAULT 0,
    rating DECIMAL(3,1) NOT NULL DEFAULT 0,
    n INT NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    kw VARCHAR(500) NOT NULL DEFAULT '',
    age INT NOT NULL DEFAULT 60,
    colors JSON NOT NULL,
    bullets JSON NOT NULL,
    specs JSON NOT NULL,
    photo MEDIUMTEXT NULL,
    mine BOOLEAN NOT NULL DEFAULT FALSE,
    created DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) CHARACTER SET utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS owner_sessions (
    token CHAR(64) PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    created DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  )`);
  await pool.query("CREATE TABLE IF NOT EXISTS shop_meta (k VARCHAR(40) PRIMARY KEY, v VARCHAR(200) NOT NULL)");

  const [[seeded]] = await pool.query("SELECT v FROM shop_meta WHERE k = 'seeded'");
  if (!seeded) {
    const moved = await copyFromJavaTables();
    if (!moved) await insertProducts(SAMPLES);
    await pool.query("INSERT INTO shop_meta (k, v) VALUES ('seeded', ?)", [moved ? "copied from the old Java tables" : "samples"]);
    console.log(moved ? `Copied ${moved} products from the old Java backend's tables into "products".` : "Added the 32 sample products to the database.");
  }
  return pool;
}

/* The old Java (Spring Boot) backend kept products in the tables product, product_color,
   product_bullet and product_spec. Copy what is there, once, so nothing is lost. Those tables are left as they are. */
async function copyFromJavaTables() {
  const [[t]] = await pool.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'product'");
  if (!t.n) return 0;
  const [old] = await pool.query("SELECT id, cat, art, title, price, was, rating, n, stock, kw, age, photo, mine, created FROM product WHERE deleted = 0 ORDER BY id");
  if (!old.length) return 0;
  const children = async (table, cols) => {
    try { const [r] = await pool.query(`SELECT product_id, ${cols} FROM ${table} ORDER BY product_id, pos`); return r; } catch (e) { return []; }
  };
  const colors = await children("product_color", "name, hex"), bullets = await children("product_bullet", "text"),
    specs = await children("product_spec", "label, val");
  const of = (rows, id) => rows.filter(r => Number(r.product_id) === Number(id));
  const list = old.map(p => ({
    ...p, id: Number(p.id), price: Number(p.price), was: Number(p.was), rating: Number(p.rating),
    mine: p.mine && (Buffer.isBuffer(p.mine) ? p.mine[0] === 1 : !!p.mine),
    colors: of(colors, p.id).map(c => ({ name: c.name, hex: c.hex })),
    bullets: of(bullets, p.id).map(b => b.text),
    specs: of(specs, p.id).map(s => [s.label, s.val])
  }));
  await insertProducts(list, true);
  return list.length;
}

async function close() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { connect, close, db, insertProducts, config };
