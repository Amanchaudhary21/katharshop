/* ==================================================================
   i18n.js - Languages: नेपाली, English, हिन्दी, 日本語.
   Texts are written in English in the code. t("English text") swaps in
   the shopper's language from js/i18n/<code>.js (falls back to English).
   {name} in a text is filled from the second argument: t("Hi {n}", { n: "Aman" }).
   Text in index.html marked with data-t is translated the same way.
   (file 2 of 16; the load order is at the bottom of index.html)
   ================================================================== */

/* [code, name shown in the menu, locale for numbers and dates] */
const LANGS = [["ne", "नेपाली", "ne-NP"], ["en", "English", "en-US"], ["hi", "हिन्दी", "hi-IN"], ["ja", "日本語", "ja-JP"]];
const I18N = {};
const LANG = (() => {
  let l = "";
  try { l = localStorage.getItem("bz:lang") || ""; } catch (e) { /* blocked */ }
  return LANGS.some(x => x[0] === l) ? l : "ne";
})();
const LOCALE = LANGS.find(x => x[0] === LANG)[2];
document.documentElement.lang = LANG;

function t(s, vars) {
  let out = (I18N[LANG] && I18N[LANG][s]) || s;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return out;
}
/* Numbers and dates in the shopper's language. Many browsers have no Nepali data for Intl,
   so Nepali is formatted in English first, then gets Devanagari digits and Nepali month and day names. */
const NE_MONTHS = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const NE_DAYS = ["आइत", "सोम", "मङ्गल", "बुध", "बिही", "शुक्र", "शनि"];
const neDigits = s => String(s).replace(/\d/g, d => "०१२३४५६७८९"[d]);
const fmtNum = (n, opts) => (LANG === "ne" ? neDigits(new Intl.NumberFormat("en-US", opts).format(n)) : new Intl.NumberFormat(LOCALE, opts).format(n));
function fmtDate(date, opts) {
  const d = new Date(date);
  if (LANG !== "ne") return new Intl.DateTimeFormat(LOCALE, opts).format(d);
  return new Intl.DateTimeFormat("en-US", opts).formatToParts(d).map(p =>
    p.type === "month" ? NE_MONTHS[d.getMonth()] : p.type === "weekday" ? NE_DAYS[d.getDay()]
      : p.type === "dayPeriod" ? (d.getHours() < 12 ? "बिहान" : d.getHours() < 17 ? "दिउँसो" : "बेलुका") : neDigits(p.value)).join("");
}
/* numbers in the shopper's digits (Nepali: ४,३२१); d = how many decimals to show */
const num = (n, d) => fmtNum(Number(n), d === undefined ? {} : { minimumFractionDigits: d, maximumFractionDigits: d });

/* The language menu (header and sign-in screen). Picking one reloads the page in that language. */
const langPicker = id => `<label class="lang-pick" for="${id}"><span class="sr">${t("Language")}</span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><select id="${id}" data-lang>${LANGS.map(([c, name]) => `<option value="${c}" lang="${c}"${c === LANG ? " selected" : ""}>${name}</option>`).join("")}</select></label>`;
document.addEventListener("change", e => {
  if (!e.target.matches("[data-lang]")) return;
  try { localStorage.setItem("bz:lang", e.target.value); } catch (x) { /* blocked */ }
  location.reload();
});

/* index.html: data-t translates the element's content; data-t-attr="aria-label placeholder" translates those attributes.
   Called by main.js, after the language files (js/i18n/*.js) have loaded. */
function translateStatic() {
  document.querySelectorAll("[data-t]").forEach(el => { el.innerHTML = t(el.innerHTML.trim().replace(/\s+/g, " ")); });
  document.querySelectorAll("[data-t-attr]").forEach(el => el.dataset.tAttr.split(" ").forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, t(el.getAttribute(a))); }));
}
