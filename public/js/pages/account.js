/* ==================================================================
   account.js - The account menu in the header (the round avatar) and
   the "Your profile" page with every detail of the signed-in account.
   (file 14 of 15; the load order is at the bottom of index.html)
   ================================================================== */

const fullName = u => [u.first, u.last].filter(Boolean).join(" ");
const avatar = u => u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc(u.first[0].toUpperCase());
const longDate = iso => fmtDate(iso, { dateStyle: "medium", timeStyle: "short" });

/* every way this account can sign in */
function signInWays(u) {
  const ways = [];
  if (u.hash && u.email) ways.push(["Email and password", u.email]);
  if (u.hash && u.phone) ways.push(["Phone and password", u.phone]);
  if (u.email) ways.push(["Email code", u.email]);
  if (u.phone) ways.push(["Phone code", u.phone]);
  if (u.google) ways.push(["Google", u.email]);
  return ways;
}

/* ---------- Header account menu ---------- */
function mountAccountMenu() {
  const login = USER.email || USER.phone;
  $("#cartCount").parentElement.insertAdjacentHTML("afterend", `<button class="icon-btn avatar" id="userBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="userMenu" aria-label="${t("Account: {name}", { name: esc(fullName(USER)) })}" data-tip="${t("Your account")}">${avatar(USER)}</button>`);
  document.body.insertAdjacentHTML("beforeend", `<div class="user-menu" id="userMenu" hidden>
    <div class="um-head"><span class="um-ava" aria-hidden="true">${avatar(USER)}</span><div><b>${esc(fullName(USER))}</b><span>${esc(login)}</span></div></div>
    <nav aria-label="${t("Your account")}">
      <a href="#/account">${t("Your profile")}</a>
      <a href="#/orders">${t("Your orders")}</a>
      <a href="#/wishlist">${t("Wish list")}</a>
      ${IS_OWNER ? `<a href="#/sell">${t("Sell an item")}</a>` : ""}
    </nav>
    <button type="button" class="um-out" data-act="signout">${t("Sign out")}</button>
  </div>`);
  const btn = $("#userBtn"), menu = $("#userMenu");
  const close = (back) => { if (menu.hidden) return; menu.hidden = true; btn.setAttribute("aria-expanded", "false"); if (back) btn.focus(); };
  const open = () => {
    const r = btn.getBoundingClientRect();
    menu.style.top = r.bottom + 8 + "px";
    menu.style.right = Math.max(16, innerWidth - r.right) + "px";
    menu.hidden = false; btn.setAttribute("aria-expanded", "true");
    menu.querySelector("a").focus();
  };
  btn.addEventListener("click", () => (menu.hidden ? open() : close(true)));
  menu.addEventListener("click", e => { if (e.target.closest("a, button")) close(false); });
  document.addEventListener("click", e => { if (!e.target.closest("#userMenu, #userBtn")) close(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(true); });
  addEventListener("resize", () => close(false));
  addEventListener("scroll", () => close(false), { passive: true });
}
ACT.signout = () => { AUTH.end(); location.hash = "#/"; location.reload(); };

/* ---------- Change (or create) password ---------- */
let pwOpen = false;
function pwForm(u) {
  const f = (id, label, auto) => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="password" autocomplete="${auto}" data-pw></div>`;
  return `<form id="pwForm" class="pf-pw stack" novalidate aria-labelledby="h-pf-pw">
    <h3 id="h-pf-pw" class="pf-sub" style="margin-top:0">${u.hash ? t("Change your password") : t("Create a password")}</h3>
    ${u.hash ? f("pw_now", t("Current password"), "current-password") : ""}
    ${f("pw_new", t("New password"), "new-password")}
    ${f("pw_new2", t("Confirm new password"), "new-password")}
    <p class="muted" style="font-size:.85rem">${t("Use 6 or more characters. Demo store: do not use a real password.")}</p>
    <label class="row" style="gap:8px"><input type="checkbox" data-chg="pwshow"> ${t("Show passwords")}</label>
    <p class="pf-pw-err" id="pw_err" role="alert"></p>
    <div class="row"><button class="btn primary" type="submit">${t("Save password")}</button><button class="btn" type="button" data-act="pwcancel">${t("Cancel")}</button></div>
  </form>`;
}
ACT.pwopen = () => { pwOpen = true; rerender("#pwForm [data-pw]"); };
ACT.pwcancel = () => { pwOpen = false; rerender(".pf-pw-btn"); };
CHG.pwshow = el => $$("#pwForm [data-pw]").forEach(i => { i.type = el.checked ? "text" : "password"; });
FORM.pwForm = async () => {
  const say = msg => { $("#pw_err").textContent = msg; };
  const now = $("#pw_now"), pass = $("#pw_new").value;
  if (now && await hashPass(now.value, USER.salt) !== USER.hash) { say(t("Your current password is wrong.")); now.focus(); return; }
  const bad = passError(pass, $("#pw_new2").value);
  if (bad) { say(bad); $("#pw_new").focus(); return; }
  if (now && now.value === pass) { say(t("Pick a password that is different from your current one.")); $("#pw_new").focus(); return; }
  const had = !!USER.hash;
  await saltPass(USER, pass);
  if (!AUTH.put(USER)) { say(t("Your browser is blocking storage, so your password can't be saved here.")); return; }
  pwOpen = false; rerender(".pf-pw-btn");
  toast(had ? t("Password changed") : t("Password created"));
};

/* ---------- Add or change email ----------
   Step 1: the new email (and the password, if the account has one).
   Step 2: the 6-digit code "sent" to the new email (shown on screen in this demo). */
let em = null; // null = closed, otherwise { step: "enter" | "verify", mail, code, until, tries }
function emForm(u) {
  const f = (id, label, type, auto, extra = "") => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" autocomplete="${auto}" ${extra}></div>`;
  const body = em.step === "enter"
    ? `${f("em_new", t("New email"), "email", "email", `inputmode="email" value="${esc(em.mail || "")}"`)}
       ${u.hash ? f("em_pass", t("Your password"), "password", "current-password", "data-pw") : ""}
       <p class="muted" style="font-size:.85rem">${t("We'll send a code to the new email to check it's yours.")}</p>
       <p class="pf-pw-err" id="em_err" role="alert"></p>
       <div class="row"><button class="btn primary" type="submit">${t("Send code")}</button><button class="btn" type="button" data-act="emcancel">${t("Cancel")}</button></div>`
    : `<div class="g-sms" role="note"><b>${t("Demo email to {mail}", { mail: esc(em.mail) })}</b><span>${t("Your ShopNest code is {code}", { code: `<b class="mono">${em.code}</b>` })}</span><small>${t("This practice store can't send real email, so the code is shown here.")}</small></div>
       ${f("em_code", t("6-digit code"), "text", "one-time-code", 'inputmode="numeric" maxlength="6"')}
       <p class="pf-pw-err" id="em_err" role="alert"></p>
       <div class="row"><button class="btn primary" type="submit">${t("Verify and save")}</button><button class="btn" type="button" data-act="emresend">${t("Send a new code")}</button><button class="btn" type="button" data-act="emcancel">${t("Cancel")}</button></div>`;
  return `<form id="emForm" class="pf-pw stack" novalidate aria-labelledby="h-pf-em">
    <h3 id="h-pf-em" class="pf-sub" style="margin-top:0">${u.email ? t("Change your email") : t("Add an email")}</h3>${body}</form>`;
}
const emCode = () => ({ code: String(Math.floor(100000 + Math.random() * 900000)), until: Date.now() + 5 * 60 * 1000, tries: 0 });
ACT.emopen = () => { em = { step: "enter" }; rerender("#em_new"); };
ACT.emcancel = () => { em = null; rerender(".pf-em-btn"); };
ACT.emresend = () => { Object.assign(em, emCode()); rerender("#em_code"); toast(t("New code sent")); };
FORM.emForm = async () => {
  const say = msg => { $("#em_err").textContent = msg; };
  if (em.step === "enter") {
    const mail = cleanEmail($("#em_new").value), pass = $("#em_pass");
    if (!okEmail(mail)) { say(t("Enter a valid email, like name@example.com.")); $("#em_new").focus(); return; }
    if (mail === USER.email) { say(t("That is already your email.")); $("#em_new").focus(); return; }
    if (AUTH.users().some(x => x.email === mail && x.id !== USER.id)) { say(t("Another account already uses that email.")); $("#em_new").focus(); return; }
    if (pass && await hashPass(pass.value, USER.salt) !== USER.hash) { say(t("Your password is wrong.")); pass.focus(); return; }
    em = { step: "verify", mail, ...emCode() };
    rerender("#em_code");
    return;
  }
  const code = $("#em_code").value.replace(/\D/g, "");
  if (Date.now() > em.until) { say(t("That code has expired. Send a new code.")); return; }
  if (code !== em.code) {
    em.tries++;
    if (em.tries >= 3) { em.until = 0; say(t("Too many wrong tries. Send a new code.")); }
    else say(t("Wrong code. Check it and try again."));
    $("#em_code").focus();
    return;
  }
  if (AUTH.users().some(x => x.email === em.mail && x.id !== USER.id)) { say(t("Another account already uses that email.")); return; }
  const had = !!USER.email;
  USER.email = em.mail; USER.emailSet = new Date().toISOString();
  if (!AUTH.put(USER)) { say(t("Your browser is blocking storage, so your email can't be saved here.")); return; }
  CO.email = USER.email;
  const menuLogin = $("#userMenu .um-head span:not(.um-ava)");
  if (menuLogin) menuLogin.textContent = USER.email;
  em = null; rerender(".pf-em-btn");
  toast(had ? t("Email changed") : t("Email added"));
};

/* ---------- Your profile ---------- */
VIEWS.account = () => {
  const u = USER, ways = signInWays(u), logins = u.logins || [];
  // each order in the shopper's currency (orders keep the currency they were paid in; old ones are dollars)
  const spent = roundCur(state.orders.reduce((s, o) => s + fromCur(o.total || 0, o.cur || "USD"), 0));
  const row = (label, value) => `<div class="pf-row"><dt>${t(label)}</dt><dd>${value}</dd></div>`;
  const none = `<span class="muted">${t("Not added")}</span>`;
  const stat = (n, label, href) => `<a class="pf-stat" href="${href}"><b>${typeof n === "number" ? num(n) : n}</b><span>${t(label)}</span></a>`;
  return {
    html: `<h1 class="sr" id="pfTitle" tabindex="-1">${t("Your profile")}</h1>
    <section class="pf-hero">
      <span class="pf-ava" aria-hidden="true">${avatar(u)}</span>
      <div><h2>${esc(fullName(u))}</h2><p>${esc(u.email || u.phone)}</p>${u.created ? `<p class="pf-since">${t("Member since {date}", { date: esc(fmtDate(u.created, { month: "long", year: "numeric" })) })}</p>` : ""}</div>
      <button type="button" class="btn" data-act="signout">${t("Sign out")}</button>
    </section>
    <div class="pf-stats">${stat(state.orders.length, state.orders.length === 1 ? "Order" : "Orders", "#/orders")}${stat(money(spent), "Spent", "#/orders")}${stat(state.wish.length, "In wish list", "#/wishlist")}${stat(totals().count, "In cart", "#/cart")}${IS_OWNER ? stat(P.filter(isMine).length, "Items you sell", "#/sell") : ""}</div>
    <div class="pf-grid">
      <section class="panel" aria-labelledby="h-pf-me"><h2 id="h-pf-me" style="${H2S}">${t("Personal details")}</h2>
        <dl class="pf-list">
          ${row("First name", esc(u.first))}
          ${row("Last name", u.last ? esc(u.last) : none)}
          ${row("Email", `${u.email ? esc(u.email) : none}${u.emailSet ? ` <span class="muted">· ${t("changed {date}", { date: esc(longDate(u.emailSet)) })}</span>` : ""}
            ${em ? "" : `<div><button type="button" class="btn small pf-pw-btn pf-em-btn" data-act="emopen">${u.email ? t("Change email") : t("Add email")}</button></div>`}`)}
          ${row("Phone", u.phone ? esc(u.phone) : none)}
          ${row("Account created", u.created ? esc(longDate(u.created)) : `<span class="muted">${t("Unknown")}</span>`)}
          ${row("Account ID", `<span class="mono">${esc(u.id)}</span>`)}
        </dl>
        ${em ? emForm(u) : ""}
      </section>
      <section class="panel" aria-labelledby="h-pf-sign"><h2 id="h-pf-sign" style="${H2S}">${t("Sign-in and security")}</h2>
        <dl class="pf-list">
          ${row("Sign-in methods", ways.length ? `<ul class="pf-ways">${ways.map(([how, id]) => `<li><b>${esc(t(how))}</b> <span class="muted">${esc(id)}</span></li>`).join("")}</ul>` : none)}
          ${row("Password", `${u.hash ? `${t("Set")}${u.passSet ? ` <span class="muted">· ${t("changed {date}", { date: esc(longDate(u.passSet)) })}</span>` : ""}` : `<span class="muted">${t("No password (signs in without one)")}</span>`}
            ${pwOpen ? "" : `<div><button type="button" class="btn small pf-pw-btn" data-act="pwopen">${u.hash ? t("Change password") : t("Create password")}</button></div>`}`)}
          ${row("On this device", AUTH.remembered() ? t("Stays signed in") : t("Signed out when the browser closes"))}
        </dl>
        ${pwOpen ? pwForm(u) : ""}
        <h3 class="pf-sub">${t("Recent sign-ins")}</h3>
        ${logins.length ? `<ol class="pf-log">${logins.map((l, i) => `<li><span>${esc(longDate(l.at))}${i === 0 ? ` <span class="pf-now">${t("This visit")}</span>` : ""}</span><span class="muted">${esc(t(l.via || "Unknown"))}</span></li>`).join("")}</ol>` : `<p class="muted">${t("Sign-ins from now on will show here.")}</p>`}
      </section>
    </div>
    <p class="muted pf-note">${t("This demo keeps your account only in this browser. Never use a real password here.")}</p>`
  };
};
