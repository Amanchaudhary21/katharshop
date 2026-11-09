/* db.js - The MySQL database (library: mysql2).
   The "shopnest" database and its tables are made the first time the server starts.

   products         every product in the shop: the ones the owner adds on the Sell page.
                    The shop starts empty. Deleting a product removes its row.
                    "created" = the date and time it was added.
   owner_sessions   owners who connected on the Sell page (token -> email) */
const mysql = require("mysql2/promise");

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

async function insertProducts(list) {
  if (!list.length) return;
  await pool.query(`INSERT INTO products (${PRODUCT_COLS}) VALUES ?`, [list.map(row)]);
}

/* Opens the connection and makes the database and tables if they are missing */
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
    price DECIMAL(12,4) NOT NULL,          -- US dollars, 4 decimals: rupee and yen prices convert back exactly
    was DECIMAL(12,4) NOT NULL DEFAULT 0,
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
  // databases made before prices had 4 decimals
  const [[col]] = await pool.query("SELECT NUMERIC_SCALE AS s FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'price'");
  if (col && col.s < 4) await pool.query("ALTER TABLE products MODIFY price DECIMAL(12,4) NOT NULL, MODIFY was DECIMAL(12,4) NOT NULL DEFAULT 0");
  await pool.query(`CREATE TABLE IF NOT EXISTS owner_sessions (
    token CHAR(64) PRIMARY KEY,
    email VARCHAR(200) NOT NULL,
    created DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  )`);
  return pool;
}

async function close() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { connect, close, db, insertProducts };
