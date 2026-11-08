/* server.js - The ShopNest server, all in JavaScript (Node.js + Express + MySQL).
   It shows the store (the public folder) and runs the shop API (server/api.js) that keeps
   products in the MySQL database (server/db.js).
   Start it with start.bat, or type:  npm start
   Then open http://localhost:8080  (Google sign-in needs this address).
   Settings (MySQL password, owner password) go in the .env file; see .env.example. */
const path = require("path"), crypto = require("crypto"), fs = require("fs");
const express = require("express");

try { process.loadEnvFile(path.join(__dirname, ".env")); } catch (e) { /* no .env file: use the defaults */ }

const { connect } = require("./server/db");
const { makeApi } = require("./server/api");

const PORT = Number(process.env.PORT || 8080);
const ownerEmails = (process.env.OWNER_EMAILS || "amanecdy@gmail.com").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
let ownerPassword = process.env.OWNER_PASSWORD || "";
if (!ownerPassword) {
  ownerPassword = crypto.randomBytes(9).toString("hex");
  console.log(`No OWNER_PASSWORD in .env. Owner password for this run: ${ownerPassword}`);
}
/* Other web addresses allowed to call the API. The live site (GitHub Pages) reaches this server
   through the ngrok link, so every device shares the same products. */
const corsOrigins = (process.env.CORS_ORIGINS || "https://amanchaudhary21.github.io").split(",").map(s => s.trim()).filter(Boolean);

function createApp({ dbReady }) {
  const app = express();
  app.disable("x-powered-by");
  // ngrok runs inside this program and connects from this computer; it passes on the visitor's
  // real address in X-Forwarded-For (used to slow down password guessing in server/api.js)
  app.set("trust proxy", "loopback");

  app.use("/api", (req, res, next) => {
    const origin = req.get("Origin");
    if (origin && corsOrigins.includes(origin)) {
      res.set({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning", "Access-Control-Max-Age": "7200", Vary: "Origin" });
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
    res.set("Cache-Control", "no-store");
    if (!dbReady()) return res.status(503).json({ error: "The database is not connected. See the server window." });
    next();
  });
  app.use("/api", makeApi({ ownerEmails, ownerPassword }));

  app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: res => res.set("Cache-Control", "no-store") // always the newest files while you edit
  }));
  return app;
}

/* The ngrok link: a fixed https address on the internet that leads to this computer, so your phone
   and other devices reach this server (and its MySQL products). Needs NGROK_AUTHTOKEN and
   NGROK_DOMAIN in .env (free account at https://ngrok.com). Without them, nothing happens. */
async function openTunnel() {
  const authtoken = process.env.NGROK_AUTHTOKEN, domain = (process.env.NGROK_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!authtoken) return;
  let ngrok;
  try { ngrok = require("@ngrok/ngrok"); } catch (e) { return console.error("ngrok is not installed yet. Run: npm install"); }
  try {
    const listener = await ngrok.forward({ addr: `127.0.0.1:${PORT}`, authtoken, domain: domain || undefined });
    const url = listener.url();
    console.log(`Other devices reach this shop server at ${url}`);
    // the live site must know this address (SHOP_SERVER in public/js/core/data.js)
    const dataJs = fs.readFileSync(path.join(__dirname, "public", "js", "core", "data.js"), "utf8");
    const m = dataJs.match(/const SHOP_SERVER = "([^"]*)"/);
    if (m && m[1] !== url) console.log(`Tip: put "${url}" as SHOP_SERVER in public/js/core/data.js and push to GitHub, so the live site uses this server.`);
  } catch (e) {
    console.error(`\nCould not open the ngrok link: ${e.message}\n` +
      "Check NGROK_AUTHTOKEN and NGROK_DOMAIN in .env, and that no other computer is running the same link.\n" +
      "The store still works on this computer.\n");
  }
}

if (require.main === module) {
  let ready = false;
  createApp({ dbReady: () => ready }).listen(PORT, "127.0.0.1", () => {
    console.log(`ShopNest is running at http://localhost:${PORT}  (close this window to stop)`);
    openTunnel();
  });
  connect().then(() => { ready = true; console.log(`Connected to MySQL (database "${process.env.DB_NAME || "shopnest"}").`); })
    .catch(e => console.error(`\nCould not connect to MySQL: ${e.message}\n` +
      "The store still opens, but adding and deleting products for everyone is off.\n" +
      "Check that MySQL is running and that DB_USER / DB_PASSWORD in .env are right, then restart.\n"));
}

module.exports = { createApp };
