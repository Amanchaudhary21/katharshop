/* ==================================================================
   auth.js - Sign in with Google. Shoppers must sign in before they can
   use the store. Each account gets its own cart, wish list and orders.
   DEMO ONLY: accounts are kept in this browser (key bz:users). This is
   not real security.
   (file 6 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Google sign-in setup ----------
   Paste your own Google "OAuth client ID" between the quotes to turn on the
   "Sign in with Google" button. README.md explains how to get one (free).
   Google sign-in works on the live site (https://amanchaudhary21.github.io) and on
   http://localhost:8080 (start.bat), as long as both addresses are listed
   under "Authorized JavaScript origins" for your Client ID. It does not work when
   index.html is opened by double-clicking it. */
const GOOGLE_CLIENT_ID = "1014530565910-58qe3k87k41h70bpdu61qc2tckepdths.apps.googleusercontent.com";

/* ---------- Store owner ----------
   Only these accounts can add or delete products ("Sell an item").
   Everyone else can shop but not sell. */
const OWNER_EMAILS = ["amanecdy@gmail.com"];

/* ---------- Accounts and the signed-in shopper ---------- */
const AUTH = {
  users() { try { return JSON.parse(localStorage.getItem("bz:users")) || []; } catch (e) { return []; } },
  saveUsers(list) { try { localStorage.setItem("bz:users", JSON.stringify(list)); return true; } catch (e) { return false; } },
  /* add a new account, or save changes to one that exists */
  put(user) { const list = AUTH.users().filter(u => u.id !== user.id); return AUTH.saveUsers([...list, user]); },
  /* the signed-in account stays signed in until "Sign out" */
  session() { try { return JSON.parse(localStorage.getItem("bz:session")) || null; } catch (e) { return null; } },
  start(user) { try { localStorage.setItem("bz:session", JSON.stringify({ id: user.id })); } catch (e) { /* blocked */ } },
  end() {
    try { localStorage.removeItem("bz:session"); } catch (e) { /* blocked */ }
    try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) { /* not loaded */ }
  }
};
/* Account IDs are always unique */
const newId = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

const USER = (() => { const s = AUTH.session(); return s ? AUTH.users().find(u => u.id === s.id) || null : null; })();
const IS_OWNER = !!(USER && USER.email && OWNER_EMAILS.includes(USER.email));

const cleanEmail = s => s.trim().toLowerCase();

/* Google sends back a signed token. We read the name, email and photo from it.
   (A real store would also check the token on its own server.) */
function readGoogleToken(token) {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = decodeURIComponent([...atob(part)].map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  return JSON.parse(json);
}
let gsiLoad = null;
const loadGoogle = () => gsiLoad || (gsiLoad = new Promise((ok, fail) => {
  const s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client?hl=" + LANG; s.async = true; s.onload = ok; s.onerror = fail;
  document.head.appendChild(s);
}));

/* ---------- The sign-in screen (shown instead of the store) ---------- */
function showLogin() {
  const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M5 15L8 5h24l3 10z" fill="currentColor"/><path d="M12.5 5L11.5 15M20 5v10M27.5 5l1 10" stroke="var(--g-logo-gap)" stroke-width="3"/><path d="M5 15q3.75 5 7.5 0 3.75 5 7.5 0 3.75 5 7.5 0 3.75 5 7.5 0z" fill="var(--accent)"/><path d="M9 21v13h22V21" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><rect x="16" y="26" width="8" height="8" fill="currentColor"/></svg>`;
  const PERKS = [t("Your own cart, wish list and orders"), t("Sell your items with just a photo"), t("Free delivery on orders over {amount}", { amount: money(FREE_SHIP_MIN) })].map(s => `<li>${s}</li>`).join("");
  const gate = document.createElement("div");
  gate.id = "gate";
  gate.innerHTML = `<div class="g-wrap">
    <aside class="g-hero" aria-hidden="true">
      <div class="g-logo">${LOGO}<span>shopnest</span></div>
      <h2>${t("Your whole market, one sign-in away.")}</h2>
      <ul>${PERKS}</ul>
      <p class="g-small">${t("Demo store. No real payments.")}</p>
    </aside>
    <main class="g-main" id="gMain"></main>
  </div>`;
  document.documentElement.classList.add("locked");
  document.body.prepend(gate);
  const host = gate.querySelector("#gMain");

  /* Google's own button is the only way in. Someone who signed in here before is greeted by name. */
  const e = s => String(s ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const last = AUTH.users().filter(u => u.logins && u.logins.length).sort((a, b) => b.logins[0].at.localeCompare(a.logins[0].at))[0];
  const err = msg => { host.querySelector("#g_err").textContent = msg; };
  host.innerHTML = `<div class="g-card"><div class="g-top">${langPicker("g_lang")}</div><div class="g-logo g-logo-card">${LOGO}<span>shopnest</span></div>
      <h1 tabindex="-1">${last ? t("Welcome back, {name}", { name: e(last.first) }) : t("Welcome to ShopNest")}</h1>
      <p class="g-sub">${last ? t("Sign in with Google to pick up where you left off.") : t("Sign in with your Google account to start shopping.")}</p>
      <div class="g-google" id="g_google" aria-live="polite"></div>
      <p class="g-err" id="g_err" role="alert"></p>
      <ul class="g-perks">${PERKS}</ul>
      <p class="g-note"><span aria-hidden="true">🔒</span> ${t("No password to remember. New here? Your account is made the first time you sign in. We only get your name, email and photo from Google.")}</p></div>
    <p class="g-foot">${t("Accounts in this demo are saved only in this browser.")} <a href="privacy.html">${t("Privacy")}</a></p>`;
  host.querySelector("h1").focus();
  /* remember the last 5 sign-ins (when and how) for the profile page */
  const enter = (user, via) => {
    user.logins = [{ at: new Date().toISOString(), via }, ...(user.logins || [])].slice(0, 5);
    AUTH.put(user); AUTH.start(user); location.reload();
  };

  /* Google's own button. It needs your Client ID (top of this file) and a http:// address. */
  function mountGoogle(slot) {
    if (!GOOGLE_CLIENT_ID || location.protocol === "file:") {
      slot.innerHTML = `<p class="g-setup"><b>${t("Sign in with Google is not set up yet.")}</b> ${!GOOGLE_CLIENT_ID ? t("Add your Google Client ID at the top of js/core/auth.js.") : ""} ${location.protocol === "file:" ? t("Open the store with start.bat instead of double-clicking index.html.") : ""} ${t("See README.md.")}</p>`;
      return;
    }
    slot.innerHTML = `<div class="g-loading"><span class="g-spin" aria-hidden="true"></span>${t("Loading Google sign-in…")}</div>`;
    loadGoogle().then(() => {
      if (!mountGoogle.ready) {
        /* a random one-time value: Google puts it inside the signed token, and we check it comes back unchanged */
        const nonce = crypto.getRandomValues(new Uint32Array(4)).join("-");
        try { sessionStorage.setItem("bz:nonce", nonce); } catch (x) { /* blocked */ }
        google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, nonce, callback: r => onGoogle(r.credential) });
        mountGoogle.ready = true;
      }
      slot.innerHTML = "";
      google.accounts.id.renderButton(slot, { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: LANG, width: Math.max(220, Math.min(400, slot.clientWidth || 360)) });
    }).catch(() => {
      slot.innerHTML = `<p class="g-setup">${t("Could not reach Google. Check your internet connection.")}</p><button type="button" class="btn g-retry">${t("Try again")}</button>`;
      slot.querySelector(".g-retry").onclick = () => { gsiLoad = null; document.querySelectorAll('script[src*="accounts.google.com/gsi"]').forEach(s => s.remove()); mountGoogle(slot); };
    });
  }
  function onGoogle(token) {
    let g;
    try { g = readGoogleToken(token); } catch (x) { return err(t("Google sign-in did not work. Please try again.")); }
    let nonce = ""; try { nonce = sessionStorage.getItem("bz:nonce") || ""; } catch (x) { /* blocked */ }
    const issuer = g.iss === "https://accounts.google.com" || g.iss === "accounts.google.com";
    if (g.aud !== GOOGLE_CLIENT_ID || !issuer || (nonce && g.nonce !== nonce) || g.exp * 1000 < Date.now() || !g.email || g.email_verified === false) return err(t("Google sign-in did not work. Please try again."));
    const mail = cleanEmail(g.email), users = AUTH.users();
    let user = users.find(u => u.google === g.sub) || users.find(u => u.email === mail);
    if (user) Object.assign(user, { google: g.sub, picture: g.picture || user.picture });
    else user = { id: newId(), first: g.given_name || g.name || mail.split("@")[0], last: g.family_name || "", email: mail, google: g.sub, picture: g.picture || "", created: new Date().toISOString() };
    if (!AUTH.put(user)) return err(t("Your browser is blocking storage, so you can't sign in here."));
    enter(user, "Google");
  }

  mountGoogle(host.querySelector("#g_google"));
}
if (!USER) showLogin();
