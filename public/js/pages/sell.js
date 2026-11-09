/* ==================================================================
   sell.js - The "Sell an item" page (owner only): add a product with a photo.
   With the shop server (API_URL) products are saved in its MySQL database and every
   shopper sees them; without it they are saved in this browser only (key bz:mine).
   (file 13 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Sell an item ---------- */
let sellPhoto = "";
const SELL_RULES = {
  title: v => v.length >= 3 || t("Give your item a name (at least 3 letters)."),
  price: v => Number(v) > 0 || t("Enter a price above 0."),
  stock: v => (Number.isInteger(Number(v)) && Number(v) >= 0) || t("Enter a whole number, like 10.")
};

/* Make the photo small (max 600 px) so many items fit in the browser's storage */
function shrinkPhoto(file, done) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 600 / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
      const g = cv.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, 0, 0, cv.width, cv.height);
      done(cv.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => done("");
    img.src = reader.result;
  };
  reader.onerror = () => done("");
  reader.readAsDataURL(file);
}

/* Save your products. Returns false if the browser storage is full or blocked. */
function saveMine() {
  const mine = P.filter(p => p.mine);
  try { localStorage.setItem("bz:mine", JSON.stringify(mine)); return true; } catch (e) { return false; }
}
/* Only the store owner (OWNER_EMAILS in auth.js) can add or remove items. isMine = items the owner added. */
const isMine = p => p.mine && IS_OWNER;
function unlist(id) {
  const i = P.findIndex(p => p.id === id);
  if (i >= 0) P.splice(i, 1);
  PM.delete(id);
  state.cart = state.cart.filter(l => l.id !== id); save("cart");
  state.wish = state.wish.filter(x => x !== id); save("wish");
  state.recent = state.recent.filter(x => x !== id); save("recent");
  updateCounts();
}

function sellField(id, label, attrs, hint) {
  return `<div class="field"><label for="sl_${id}">${label}</label><input id="sl_${id}" name="${id}" autocomplete="off" aria-describedby="slerr_${id}" ${attrs}>${hint ? `<span class="muted" style="font-size:.82rem">${hint}</span>` : ""}<div class="err" id="slerr_${id}"></div></div>`;
}

VIEWS.sell = (r = {}) => {
  if (!IS_OWNER) return { html: `<h1 class="sr" id="sellTitle" tabindex="-1">${t("Sell an item")}</h1>${emptyState(t("Only the store owner can add items"), t("You can still shop everything in the store."), "#/", t("Start shopping"))}` };
  sellPhoto = "";
  const mine = P.filter(isMine);
  return {
    html: `<div class="sec-head" style="margin-top:0"><h1 id="sellTitle" tabindex="-1">${t("Sell an item")}</h1></div>
    <form id="sellForm" class="sell-layout" novalidate>
      <section class="panel stack" aria-labelledby="h-photo"><h2 id="h-photo" style="${H2S}">1. ${t("Photo")}</h2>
        <label class="photo-drop" id="photoDrop" for="sl_photo">
          <img id="photoPrev" alt="" hidden>
          <span id="photoHint"><svg aria-hidden="true"><use href="#i-plus"/></svg><b>${t("Choose a photo")}</b><span class="muted">${t("JPG or PNG from your phone or computer")}</span></span>
        </label>
        <input id="sl_photo" type="file" accept="image/*" class="sr" data-chg="photo" aria-describedby="slerr_photo">
        <div class="err" id="slerr_photo" style="color:var(--bad)"></div>
      </section>
      <section class="panel stack" aria-labelledby="h-info"><h2 id="h-info" style="${H2S}">2. ${t("Details")}</h2>
        <div class="form-grid">
          <div class="wide">${sellField("title", t("Item name"), `type="text" maxlength="90" value="${esc(r.title || "")}"`)}</div>
          ${/* the price is typed in rupees and saved in US dollars */
            sellField("price", t("Price ({symbol})", { symbol: CUR.symbol.trim() }), CUR.digits ? 'type="number" min="0.01" step="0.01" inputmode="decimal"' : 'type="number" min="1" step="1" inputmode="numeric"')}
          ${sellField("stock", t("How many in stock"), 'type="number" min="0" step="1" value="10" inputmode="numeric"')}
          <div class="field wide"><label for="sl_cat">${t("Department")}</label><select id="sl_cat" name="cat">${CATS.map(c => `<option value="${c.id}" ${c.id === r.cat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
          <div class="field wide"><label for="sl_about">${t("About this item")}</label><textarea id="sl_about" name="about" maxlength="600" placeholder="${t("One point per line")}"></textarea></div>
        </div>
        <button class="btn brand block" type="submit">${t("Save item to the shop")}</button>
        <p class="muted" style="font-size:.82rem">${API_URL ? t("Saved in the shop server's MySQL database. Every shopper sees it.") : t("Saved only in this browser. \"Reset demo data\" in the footer removes it.")}</p>
      </section>
    </form>
    <section class="sec" aria-labelledby="h-mine"><div class="sec-head"><h2 id="h-mine">${t("Your items ({n})", { n: num(mine.length) })}</h2></div>
      ${mine.length ? `<div class="grid">${mine.map(card).join("")}</div>`
        : `<p class="muted">${t("You have not added any items yet.")}</p>`}
    </section>
    ${API_URL ? serverPanel() : ""}`
  };
};

CHG.photo = el => {
  const file = el.files && el.files[0], err = $("#slerr_photo");
  if (!file) return;
  if (!file.type.startsWith("image/")) { err.textContent = t("That file is not a picture. Choose a JPG or PNG."); return; }
  err.textContent = t("Loading photo...");
  shrinkPhoto(file, url => {
    sellPhoto = url;
    err.textContent = url ? "" : t("Could not read that picture. Try another one.");
    const prev = $("#photoPrev");
    if (!prev) return;
    prev.src = url; prev.hidden = !url;
    $("#photoHint").hidden = !!url;
  });
};

FORM.sellForm = async () => {
  if (!IS_OWNER) return;
  let first = null;
  const bad = (el, errEl, msg) => {
    const ok = !msg;
    const f = el.closest(".field"); if (f) f.classList.toggle("bad", !ok);
    el.setAttribute("aria-invalid", String(!ok));
    errEl.textContent = msg || "";
    if (!ok && !first) first = el;
  };
  bad($("#sl_photo"), $("#slerr_photo"), sellPhoto ? "" : t("Add a photo of your item."));
  Object.keys(SELL_RULES).forEach(k => {
    const el = $("#sl_" + k), r = SELL_RULES[k](el.value.trim());
    bad(el, $("#slerr_" + k), r === true ? "" : r);
  });
  if (first) { first.focus(); toast(t("Please fix the highlighted fields.")); return; }

  const val = k => $("#sl_" + k).value.trim();
  const about = val("about").split("\n").map(s => s.trim()).filter(Boolean);
  if (API_URL) return saveToServer(val, about);
  const id = Math.max(1000, ...P.map(p => p.id)) + 1;
  const p = mk(id, val("cat"), "box", val("title"), 0, 0, 0, 0, Number(val("stock")),
    C(["Default", "#8A9BA8"]), about.length ? about : ["Added by you on this device"], [["Seller", USER.first]], "", 1);
  p.photo = sellPhoto; p.mine = true; p.owner = USER.id;
  p.usd = toUsd(Number(val("price"))); p.usdWas = 0; inShopCurrency(p); // saved in US dollars, shown in this currency
  P.push(p); PM.set(id, p);
  if (!saveMine()) {
    unlist(id);
    toast(t("Not saved: your browser storage is full or blocked. Try a smaller photo or remove some items."));
    return;
  }
  toast(t("{name} is now in the shop", { name: `"${p.title}"` }), { href: `#/p/${id}`, label: t("View item") });
  rerender("#sellTitle");
};

/* With the shop server: the product (and the date it was added) is saved in MySQL, and every
   shopper's store picks it up within 30 seconds (main.js, syncShop) */
async function saveToServer(val, about) {
  if (!ownerToken()) {
    toast(t("Connect to the shop server first (owner password below), then save the item again."));
    const pass = $("#ow_pass"); if (pass) pass.focus();
    return;
  }
  const btn = $('#sellForm button[type="submit"]');
  btn.disabled = true;
  let j;
  try {
    j = await api("/products", { method: "POST", body: JSON.stringify({
      cat: val("cat"), title: val("title"), price: toUsd(Number(val("price"))), was: 0, // US dollars
      stock: Number(val("stock")), bullets: about, photo: sellPhoto, seller: USER.first || "" }) });
  } catch (e) {
    btn.disabled = false;
    toast(serverError(e)); if (e.status === 401) rerender("#ow_pass");
    return;
  }
  const p = fromServer(j);
  if (!PM.has(p.id)) { P.push(p); PM.set(p.id, p); }
  saveSrvAdded();
  toast(t("{name} is now in the shop for every shopper", { name: `"${p.title}"` }), { href: `#/p/${p.id}`, label: t("View item") });
  rerender("#sellTitle");
}

/* With the shop server, products are deleted from its database, so every shopper stops seeing them */
const viaServer = () => !!API_URL;
ACT.unsell = async el => {
  const id = Number(el.dataset.id), p = PM.get(id);
  if (!p || !IS_OWNER) return;
  if (viaServer() && !ownerToken()) { go("/sell"); toast(t("Connect to the shop server first (owner password below), then delete the item again.")); return; }
  if (!confirm(t(viaServer() ? "Delete {name} from the shop for every shopper?" : "Delete {name} from the shop?", { name: `"${p.title}"` }) + "\n\n" + t("It will also be removed from carts and wish lists."))) return;
  if (viaServer()) {
    try { await api(`/products/${id}`, { method: "DELETE" }); }
    catch (e) { if (e.status !== 404) { toast(serverError(e)); if (e.status === 401) rerender(); return; } /* 404: already gone */ }
  }
  unlist(id);
  if (API_URL) saveSrvAdded(); else saveMine();
  if (route.name === "product") go("/sell"); else rerender();
  toast(t(viaServer() ? "{name} was deleted for everyone" : "{name} was deleted", { name: `"${p.title}"` }));
};

/* ---------- Connect to the shop server (owner only) ---------- */
function serverPanel() {
  const on = !!ownerToken();
  return `<section class="sec panel stack" aria-labelledby="h-server">
    <h2 id="h-server" style="${H2S}">${t("Shop server")}</h2>
    <p class="muted" style="font-size:.88rem">${t("Connect once with the owner password. Then the products you add or delete are saved in the shop server's MySQL database, and every shopper sees them.")}</p>
    ${on ? `<div class="row"><span>${t("<b>Connected</b> to the shop server as the owner.")}</span><button class="btn small" type="button" data-act="srvout">${t("Disconnect")}</button></div>`
      : `<form id="ownerForm" class="stack" novalidate>
        <div class="field"><label for="ow_pass">${t("Owner password for the shop server")}</label><input id="ow_pass" type="password" autocomplete="current-password" aria-describedby="ow_err">
          <span class="muted" style="font-size:.82rem">${t("Set in .env (OWNER_PASSWORD), or printed when the server starts.")}</span>
          <div class="err" id="ow_err" role="alert"></div></div>
        <div class="row"><button class="btn brand" type="submit">${t("Connect")}</button></div>
      </form>`}
  </section>`;
}
FORM.ownerForm = async () => {
  const pass = $("#ow_pass"), say = msg => { $("#ow_err").textContent = msg; pass.focus(); };
  if (!pass.value) return say(t("Enter the owner password."));
  try {
    const r = await api("/owner/login", { method: "POST", body: JSON.stringify({ email: USER.email, password: pass.value }) });
    localStorage.setItem("bz:ownerToken", r.token);
  } catch (e) { return say(e.status === 401 ? t("Wrong password, or this account is not the owner on the server.") : e.status === 429 ? t("Too many wrong passwords. Wait 15 minutes, then try again.") : serverError(e)); }
  rerender("#h-server");
  toast(t("Connected to the shop server"));
};
ACT.srvout = () => { try { localStorage.removeItem("bz:ownerToken"); } catch (e) { /* blocked */ } rerender("#ow_pass"); };
