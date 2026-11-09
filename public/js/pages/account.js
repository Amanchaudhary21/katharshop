/* ==================================================================
   account.js - The account menu in the header (the round avatar) and
   the "Your profile" page with every detail of the signed-in account.
   (file 14 of 15; the load order is at the bottom of index.html)
   ================================================================== */

const fullName = u => [u.first, u.last].filter(Boolean).join(" ");
const avatar = u => u.picture ? `<img src="${esc(u.picture)}" alt="" referrerpolicy="no-referrer">` : esc(u.first[0].toUpperCase());
const longDate = iso => fmtDate(iso, { dateStyle: "medium", timeStyle: "short" });

/* ---------- Header account menu ---------- */
function mountAccountMenu() {
  $("#cartCount").parentElement.insertAdjacentHTML("afterend", `<button class="icon-btn avatar" id="userBtn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="userMenu" aria-label="${t("Account: {name}", { name: esc(fullName(USER)) })}" data-tip="${t("Your account")}">${avatar(USER)}</button>`);
  document.body.insertAdjacentHTML("beforeend", `<div class="user-menu" id="userMenu" hidden>
    <div class="um-head"><span class="um-ava" aria-hidden="true">${avatar(USER)}</span><div><b>${esc(fullName(USER))}</b><span>${esc(USER.email)}</span></div></div>
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

/* ---------- Your profile ---------- */
VIEWS.account = () => {
  const u = USER, logins = u.logins || [];
  // each order in the shopper's currency (orders keep the currency they were paid in; old ones are dollars)
  const spent = roundCur(state.orders.reduce((s, o) => s + fromCur(o.total || 0, o.cur || "USD"), 0));
  const row = (label, value) => `<div class="pf-row"><dt>${t(label)}</dt><dd>${value}</dd></div>`;
  const none = `<span class="muted">${t("Not added")}</span>`;
  const stat = (n, label, href) => `<a class="pf-stat" href="${href}"><b>${typeof n === "number" ? num(n) : n}</b><span>${t(label)}</span></a>`;
  return {
    html: `<h1 class="sr" id="pfTitle" tabindex="-1">${t("Your profile")}</h1>
    <section class="pf-hero">
      <span class="pf-ava" aria-hidden="true">${avatar(u)}</span>
      <div><h2>${esc(fullName(u))}</h2><p>${esc(u.email)}</p>${u.created ? `<p class="pf-since">${t("Member since {date}", { date: esc(fmtDate(u.created, { month: "long", year: "numeric" })) })}</p>` : ""}</div>
      <button type="button" class="btn" data-act="signout">${t("Sign out")}</button>
    </section>
    <div class="pf-stats">${stat(state.orders.length, state.orders.length === 1 ? "Order" : "Orders", "#/orders")}${stat(money(spent), "Spent", "#/orders")}${stat(state.wish.length, "In wish list", "#/wishlist")}${stat(totals().count, "In cart", "#/cart")}${IS_OWNER ? stat(P.filter(isMine).length, "Items you sell", "#/sell") : ""}</div>
    <div class="pf-grid">
      <section class="panel" aria-labelledby="h-pf-me"><h2 id="h-pf-me" style="${H2S}">${t("Personal details")}</h2>
        <dl class="pf-list">
          ${row("First name", esc(u.first))}
          ${row("Last name", u.last ? esc(u.last) : none)}
          ${row("Email", u.email ? esc(u.email) : none)}
          ${row("Account created", u.created ? esc(longDate(u.created)) : `<span class="muted">${t("Unknown")}</span>`)}
          ${row("Account ID", `<span class="mono">${esc(u.id)}</span>`)}
        </dl>
      </section>
      <section class="panel" aria-labelledby="h-pf-sign"><h2 id="h-pf-sign" style="${H2S}">${t("Sign-in and security")}</h2>
        <dl class="pf-list">
          ${row("Sign-in methods", `<b>${t("Google")}</b> <span class="muted">${esc(u.email)}</span>`)}
        </dl>
        <h3 class="pf-sub">${t("Recent sign-ins")}</h3>
        ${logins.length ? `<ol class="pf-log">${logins.map((l, i) => `<li><span>${esc(longDate(l.at))}${i === 0 ? ` <span class="pf-now">${t("This visit")}</span>` : ""}</span><span class="muted">${esc(t(l.via || "Unknown"))}</span></li>`).join("")}</ol>` : `<p class="muted">${t("Sign-ins from now on will show here.")}</p>`}
      </section>
    </div>
    <p class="muted pf-note">${t("Accounts in this demo are saved only in this browser.")}</p>`
  };
};
