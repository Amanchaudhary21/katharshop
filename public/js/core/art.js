/* ==================================================================
   art.js - Shows the product picture: the photo the owner added on the Sell page.
   A product without a photo (only possible if one was put into MySQL by hand)
   gets a plain box drawing instead.
   (file 7 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* hex colour made darker (t < 0) or lighter (t > 0) */
function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16), to = t < 0 ? 0 : 255, k = Math.abs(t);
  const ch = s => Math.round(((n >> s) & 255) * (1 - k) + to * k);
  return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
}
const boxArt = c => `<rect x="32" y="50" width="136" height="108" rx="9" fill="${c.m}"/><rect x="32" y="50" width="136" height="24" rx="9" fill="${c.d}"/>
    <rect x="54" y="88" width="46" height="46" rx="9" fill="#fff"/>${[[66, 100], [88, 100], [77, 111], [66, 122], [88, 122]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4.500" fill="${c.d}"/>`).join("")}
    <circle cx="132" cy="102" r="13" fill="${c.l}"/><path d="M116 136q16-26 32 0z" fill="${c.l}"/>`;

/* art(p, label) -> a square tile with the product's photo. label = true: screen readers hear the product name. */
function art(p, label = false) {
  const name = label ? esc(p.title) : "";
  if (p.photo) return `<span class="art photo"><img src="${esc(p.photo)}" alt="${name}" loading="lazy"></span>`;
  const hex = (p.colors && p.colors[0] && p.colors[0].hex) || "#8A9BA8", c = { m: hex, d: shade(hex, -0.3), l: shade(hex, 0.5) };
  const a11y = label ? `role="img" aria-label="${name}"` : `aria-hidden="true"`;
  return `<span class="art" style="--tile:${hex}"><svg viewBox="0 0 200 200" ${a11y} focusable="false"><ellipse cx="100" cy="176" rx="54" ry="7" fill="#000" opacity=".13"/>${boxArt(c)}</svg></span>`;
}
