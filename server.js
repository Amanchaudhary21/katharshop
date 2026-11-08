/* server.js - The ShopNest server, all in JavaScript (Node.js + Express + MySQL).
   It shows the store (the public folder) and runs the shop API (server/api.js) that keeps
   products in the MySQL database (server/db.js).
   Start it with start.bat, or type:  npm start
   Then open http://localhost:8080  (Google sign-in needs this address).
   Settings (MySQL password, owner password) go in the .env file; see .env.example. */
const path = require("path"), crypto = require("crypto");
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
/* other web addresses allowed to call the API (for example the GitHub Pages site, if this server is put online) */
const corsOrigins = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);

function createApp({ dbReady }) {
  const app = express();
  app.disable("x-powered-by");

  app.use("/api", (req, res, next) => {
    const origin = req.get("Origin");
    if (origin && corsOrigins.includes(origin)) {
      res.set({ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "3600", Vary: "Origin" });
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

if (require.main === module) {
  let ready = false;
  createApp({ dbReady: () => ready }).listen(PORT, "127.0.0.1", () =>
    console.log(`ShopNest is running at http://localhost:${PORT}  (close this window to stop)`));
  connect().then(() => { ready = true; console.log(`Connected to MySQL (database "${process.env.DB_NAME || "shopnest"}").`); })
    .catch(e => console.error(`\nCould not connect to MySQL: ${e.message}\n` +
      "The store still opens, but adding and deleting products for everyone is off.\n" +
      "Check that MySQL is running and that DB_USER / DB_PASSWORD in .env are right, then restart.\n"));
}

module.exports = { createApp };
