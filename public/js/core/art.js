/* ==================================================================
   art.js - Shows the product pictures: a real photo when the product has one (see PHOTOS in data.js),
   otherwise a small SVG drawing made by code.
   (file 7 of 15; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Product art: small flat illustrations drawn in code ---------- */
function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16), to = t < 0 ? 0 : 255, k = Math.abs(t);
  const ch = s => Math.round(((n >> s) & 255) * (1 - k) + to * k);
  return "#" + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, "0")).join("");
}
const SCREEN = "#14262A";
const ICONS = {
  headphones: c => `<path d="M52 110V98a48 48 0 0196 0v12" fill="none" stroke="${c.d}" stroke-width="10" stroke-linecap="round"/>
    <rect x="38" y="104" width="32" height="54" rx="14" fill="${c.m}"/><rect x="130" y="104" width="32" height="54" rx="14" fill="${c.m}"/>
    <rect x="62" y="114" width="10" height="34" rx="5" fill="${c.d}"/><rect x="128" y="114" width="10" height="34" rx="5" fill="${c.d}"/>
    <path d="M46 122q0-9 7-10" stroke="${c.l}" stroke-width="3.500" fill="none" stroke-linecap="round" opacity=".8"/>`,
  phone: c => `<rect x="62" y="26" width="76" height="144" rx="14" fill="${c.m}"/>
    <rect x="68" y="34" width="64" height="128" rx="9" fill="${SCREEN}"/><rect x="88" y="40" width="24" height="5" rx="2.500" fill="${c.m}"/>
    <rect x="76" y="62" width="20" height="20" rx="6" fill="${c.l}"/><rect x="104" y="62" width="20" height="20" rx="6" fill="${c.m}"/>
    <rect x="76" y="90" width="20" height="20" rx="6" fill="${c.m}"/><rect x="104" y="90" width="20" height="20" rx="6" fill="${c.l}"/>
    <rect x="76" y="122" width="48" height="26" rx="8" fill="${c.d}"/>`,
  laptop: c => `<rect x="44" y="40" width="112" height="80" rx="8" fill="${c.d}"/><rect x="50" y="46" width="100" height="68" rx="3" fill="${SCREEN}"/>
    <path d="M58 106l18-22 14 12 16-24 28 34z" fill="${c.l}" opacity=".9"/><circle cx="128" cy="64" r="7" fill="${c.m}"/>
    <path d="M28 128h144l-8 14a7 7 0 01-6 3H42a7 7 0 01-6-3z" fill="${c.m}"/><rect x="84" y="128" width="32" height="5" rx="2.500" fill="${c.d}" opacity=".6"/>`,
  watch: c => `<rect x="80" y="18" width="40" height="48" rx="9" fill="${c.d}"/><rect x="80" y="134" width="40" height="48" rx="9" fill="${c.d}"/>
    <rect x="60" y="54" width="80" height="92" rx="24" fill="${c.m}"/><rect x="67" y="61" width="66" height="78" rx="18" fill="${SCREEN}"/>
    <path d="M76 102h12l6-18 10 32 7-16h13" stroke="${c.l}" stroke-width="4.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="140" y="84" width="7" height="18" rx="3.500" fill="${c.d}"/>`,
  speaker: c => `<rect x="34" y="62" width="132" height="80" rx="32" fill="${c.m}"/><rect x="58" y="44" width="36" height="16" rx="8" fill="${c.d}"/>
    ${[0, 1, 2, 3, 4, 5].map(i => [0, 1, 2].map(j => `<circle cx="${60 + i * 16}" cy="${82 + j * 18}" r="3.600" fill="${c.d}" opacity=".6"/>`).join("")).join("")}
    <circle cx="154" cy="102" r="6" fill="${c.l}"/>`,
  camera: c => `<rect x="30" y="60" width="140" height="92" rx="14" fill="${c.m}"/><path d="M62 60l9-16h40l9 16z" fill="${c.d}"/>
    <circle cx="98" cy="106" r="34" fill="${c.d}"/><circle cx="98" cy="106" r="24" fill="${SCREEN}"/><circle cx="98" cy="106" r="12" fill="${c.l}" opacity=".35"/>
    <circle cx="89" cy="97" r="5" fill="#fff" opacity=".55"/><rect x="138" y="70" width="22" height="11" rx="4" fill="${c.l}"/>`,
  sneaker: c => `<path d="M26 134c0-12 3-30 9-44 4-9 13-11 22-6l12 6c6 3 12 2 17-2l8-8c3-3 8-3 11 0l19 27c5 6 11 9 18 11l20 6c9 3 14 9 14 17v7H26z" fill="${c.m}"/>
    <path d="M24 138h160v14c0 6-4 9-9 9H34c-6 0-10-3-10-9z" fill="${c.l}"/><path d="M26 136h158" stroke="${c.d}" stroke-width="4"/>
    <path d="M86 94l16 9M95 85l16 9M104 76l16 9" stroke="${c.l}" stroke-width="4.500" stroke-linecap="round"/><path d="M36 112q14 8 28 4" stroke="${c.d}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>`,
  tshirt: c => `<path d="M72 34L28 58l16 34 20-9v83h72V83l20 9 16-34-44-24c-4 13-15 21-28 21S76 47 72 34z" fill="${c.m}"/>
    <path d="M78 33c4 12 13 19 22 19s18-7 22-19" fill="${c.d}" opacity=".55"/><path d="M64 84v82M136 84v82" stroke="${c.d}" stroke-width="3" opacity=".25"/>`,
  backpack: c => `<path d="M80 50c0-16 6-26 20-26s20 10 20 26" fill="none" stroke="${c.d}" stroke-width="8" stroke-linecap="round"/>
    <rect x="54" y="46" width="92" height="120" rx="28" fill="${c.m}"/><rect x="70" y="106" width="60" height="44" rx="10" fill="${c.d}"/>
    <rect x="84" y="118" width="32" height="7" rx="3.500" fill="${c.l}"/><rect x="82" y="68" width="36" height="7" rx="3.500" fill="${c.l}" opacity=".85"/>
    <path d="M54 88q-14 20 0 48M146 88q14 20 0 48" stroke="${c.d}" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  sunglasses: c => `<path d="M24 84h152" stroke="${c.m}" stroke-width="8" stroke-linecap="round"/>
    <path d="M30 86c0 30 14 44 34 44s32-13 32-36V86zM170 86c0 30-14 44-34 44s-32-13-32-36V86z" fill="${SCREEN}" stroke="${c.m}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M94 92q6-9 12 0" stroke="${c.m}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M42 98l16-5M126 98l16-5" stroke="${c.l}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`,
  lamp: c => `<path d="M80 62l22-30 36 22-18 40z" fill="${c.d}"/><path d="M96 90l60 76H56z" fill="#FFE27A" opacity=".28"/>
    <path d="M62 148l22-52 18-6" stroke="${c.m}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M62 148V124" stroke="${c.m}" stroke-width="9" stroke-linecap="round"/><ellipse cx="60" cy="158" rx="36" ry="9" fill="${c.m}"/><circle cx="104" cy="70" r="6" fill="${c.l}"/>`,
  mug: c => `<path d="M138 72q30 4 26 30t-32 26" fill="none" stroke="${c.d}" stroke-width="10" stroke-linecap="round"/>
    <path d="M60 54h80l-6 104a12 12 0 01-12 12H78a12 12 0 01-12-12z" fill="${c.m}"/><rect x="54" y="40" width="92" height="20" rx="8" fill="${c.d}"/>
    <rect x="78" y="28" width="44" height="14" rx="6" fill="${c.d}"/><rect x="68" y="90" width="64" height="34" rx="6" fill="${c.l}" opacity=".75"/>`,
  kettle: c => `<path d="M122 82c22-4 42-28 48-44l8 3c-6 20-28 50-54 56z" fill="${c.d}"/>
    <path d="M58 72h66l8 76a12 12 0 01-12 13H62a12 12 0 01-12-13z" fill="${c.m}"/><path d="M64 72c0-30 8-42 28-42s28 12 28 42" fill="none" stroke="${c.d}" stroke-width="8" stroke-linecap="round"/>
    <rect x="46" y="154" width="92" height="14" rx="6" fill="${c.d}"/><circle cx="92" cy="112" r="11" fill="${c.l}" opacity=".75"/>`,
  pan: c => `<rect x="138" y="97" width="56" height="13" rx="6.500" fill="${c.d}"/><circle cx="188" cy="103.500" r="3" fill="${c.l}"/>
    <circle cx="82" cy="104" r="58" fill="${c.d}"/><circle cx="82" cy="104" r="47" fill="${c.m}"/><circle cx="82" cy="104" r="33" fill="${SCREEN}" opacity=".25"/>
    <path d="M54 78q12-14 30-16" stroke="${c.l}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`
};

Object.assign(ICONS, {
  book: c => `<rect x="50" y="26" width="100" height="142" rx="7" fill="${c.m}"/><rect x="50" y="26" width="16" height="142" rx="5" fill="${c.d}"/>
    <rect x="80" y="52" width="56" height="9" rx="4.500" fill="${c.l}"/><rect x="80" y="70" width="38" height="9" rx="4.500" fill="${c.l}" opacity=".8"/>
    <circle cx="108" cy="122" r="18" fill="${c.l}" opacity=".5"/><path d="M99 122l7 7 12-14" stroke="${c.d}" stroke-width="4.500" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  notebook: c => `<rect x="52" y="24" width="96" height="146" rx="9" fill="${c.m}"/><rect x="132" y="24" width="9" height="146" fill="${c.d}"/>
    <rect x="66" y="48" width="54" height="42" rx="5" fill="${c.l}" opacity=".9"/>
    ${[0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j => `<circle cx="${76 + i * 11}" cy="${58 + j * 9}" r="1.800" fill="${c.d}"/>`).join("")).join("")}
    <rect x="66" y="108" width="40" height="7" rx="3.500" fill="${c.l}" opacity=".7"/><rect x="66" y="122" width="28" height="7" rx="3.500" fill="${c.l}" opacity=".5"/>`,
  ball: c => `<circle cx="100" cy="98" r="64" fill="${c.m}" stroke="${c.d}" stroke-width="4"/><path d="M100 64l25 18-10 29H85L75 82z" fill="${c.d}"/>
    <path d="M100 64V36M125 82l28-9M115 111l17 24M85 111L68 135M75 82L47 73" stroke="${c.d}" stroke-width="4.500" stroke-linecap="round"/>
    <path d="M66 52q18-14 40-14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".45"/>`,
  dumbbell: c => `<rect x="26" y="78" width="22" height="48" rx="7" fill="${c.d}"/><rect x="48" y="64" width="24" height="76" rx="7" fill="${c.m}"/>
    <rect x="72" y="94" width="56" height="16" rx="5" fill="${c.l}"/><rect x="128" y="64" width="24" height="76" rx="7" fill="${c.m}"/><rect x="152" y="78" width="22" height="48" rx="7" fill="${c.d}"/>
    <path d="M54 76v26" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".4"/>`,
  bottle: c => `<rect x="92" y="14" width="16" height="16" rx="5" fill="${c.d}"/><rect x="76" y="26" width="48" height="24" rx="9" fill="${c.d}"/>
    <path d="M72 54h56l8 22v82a13 13 0 01-13 13H77a13 13 0 01-13-13V76z" fill="${c.m}"/>
    <rect x="68" y="92" width="64" height="46" fill="${c.l}" opacity=".88"/><rect x="80" y="106" width="40" height="7" rx="3.500" fill="${c.d}" opacity=".85"/><rect x="86" y="119" width="28" height="6" rx="3" fill="${c.d}" opacity=".55"/>
    <path d="M78 66v70" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".3"/>`,
  mat: c => `<rect x="46" y="58" width="100" height="88" rx="6" fill="${c.m}"/><ellipse cx="146" cy="102" rx="21" ry="44" fill="${c.d}"/>
    <ellipse cx="146" cy="102" rx="14" ry="30" fill="${c.m}"/><ellipse cx="146" cy="102" rx="7" ry="16" fill="${c.l}"/>
    <rect x="70" y="58" width="11" height="88" fill="${c.d}" opacity=".4"/><rect x="112" y="58" width="11" height="88" fill="${c.d}" opacity=".4"/>`,
  jar: c => `<rect x="54" y="62" width="92" height="94" rx="18" fill="${c.l}"/><rect x="50" y="38" width="100" height="32" rx="9" fill="${c.d}"/>
    <rect x="68" y="88" width="64" height="44" rx="7" fill="${c.m}"/><circle cx="100" cy="110" r="10" fill="${c.l}" opacity=".9"/>
    <path d="M64 76v70" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>`,
  perfume: c => `<rect x="90" y="24" width="20" height="16" rx="4" fill="${c.d}"/><rect x="78" y="38" width="44" height="26" rx="6" fill="${c.d}"/>
    <rect x="58" y="62" width="84" height="100" rx="16" fill="${c.m}"/><rect x="58" y="62" width="84" height="100" rx="16" fill="${c.l}" opacity=".35"/>
    <rect x="74" y="96" width="52" height="34" rx="5" fill="#fff" opacity=".88"/><rect x="82" y="108" width="36" height="6" rx="3" fill="${c.d}"/><rect x="88" y="119" width="24" height="5" rx="2.500" fill="${c.d}" opacity=".5"/>`,
  dropper: c => `<path d="M88 70V44a12 12 0 0124 0v26z" fill="${c.l}"/><rect x="80" y="66" width="40" height="20" rx="5" fill="${c.d}"/>
    <rect x="66" y="84" width="68" height="82" rx="16" fill="${c.m}"/><rect x="74" y="112" width="52" height="36" rx="6" fill="${c.l}" opacity=".92"/><circle cx="100" cy="130" r="8" fill="${c.d}"/>
    <path d="M74 94v54" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".3"/>`,
  blocks: c => `<rect x="30" y="112" width="58" height="50" rx="6" fill="${c.m}"/><rect x="92" y="112" width="58" height="50" rx="6" fill="${c.d}"/>
    <rect x="156" y="130" width="22" height="32" rx="6" fill="${c.l}"/><rect x="58" y="62" width="58" height="46" rx="6" fill="${c.l}"/>
    <circle cx="59" cy="137" r="13" fill="#fff" opacity=".82"/><path d="M104 152l15-28 15 28z" fill="#fff" opacity=".82"/><rect x="76" y="73" width="22" height="22" rx="4" fill="${c.m}"/>`,
  robot: c => `<path d="M100 22v22" stroke="${c.d}" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="22" r="8" fill="${c.l}"/>
    <rect x="56" y="44" width="88" height="64" rx="18" fill="${c.m}"/><circle cx="80" cy="74" r="12" fill="${SCREEN}"/><circle cx="120" cy="74" r="12" fill="${SCREEN}"/>
    <circle cx="84" cy="70" r="4.500" fill="${c.l}"/><circle cx="124" cy="70" r="4.500" fill="${c.l}"/><rect x="82" y="92" width="36" height="7" rx="3.500" fill="${c.d}"/>
    <rect x="64" y="114" width="72" height="46" rx="13" fill="${c.d}"/><circle cx="100" cy="137" r="9" fill="${c.l}"/>
    <rect x="38" y="116" width="20" height="36" rx="10" fill="${c.m}"/><rect x="142" y="116" width="20" height="36" rx="10" fill="${c.m}"/>
    <rect x="72" y="160" width="20" height="14" rx="5" fill="${c.m}"/><rect x="108" y="160" width="20" height="14" rx="5" fill="${c.m}"/>`,
  box: c => `<rect x="32" y="50" width="136" height="108" rx="9" fill="${c.m}"/><rect x="32" y="50" width="136" height="24" rx="9" fill="${c.d}"/>
    <rect x="54" y="88" width="46" height="46" rx="9" fill="#fff"/>${[[66, 100], [88, 100], [77, 111], [66, 122], [88, 122]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4.500" fill="${c.d}"/>`).join("")}
    <circle cx="132" cy="102" r="13" fill="${c.l}"/><path d="M116 136q16-26 32 0z" fill="${c.l}"/>`,
  pouch: c => `<path d="M54 36h92l6 124a11 11 0 01-11 11H59a11 11 0 01-11-11z" fill="${c.m}"/><path d="M54 36h92v16H54z" fill="${c.d}"/>
    <path d="M60 44h80" stroke="${c.l}" stroke-width="3" stroke-dasharray="5 5" opacity=".7"/><rect x="64" y="84" width="72" height="62" rx="9" fill="${c.l}" opacity=".93"/>
    <ellipse cx="100" cy="106" rx="10" ry="14" fill="${c.m}" transform="rotate(30 100 106)"/><path d="M95 114q10-14 10-18" stroke="${c.l}" stroke-width="2.500" fill="none" stroke-linecap="round"/>
    <rect x="78" y="128" width="44" height="6" rx="3" fill="${c.d}" opacity=".7"/>`,
  tea: c => `<rect x="46" y="44" width="108" height="122" rx="9" fill="${c.m}"/><rect x="46" y="44" width="108" height="24" rx="9" fill="${c.d}"/>
    <rect x="62" y="80" width="76" height="62" rx="7" fill="${c.l}" opacity=".92"/><path d="M100 132c-22-4-32-22-28-42 22 0 36 14 28 42z" fill="${c.m}"/><path d="M100 132c0-14 2-24 8-34" stroke="${c.d}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="72" y="150" width="56" height="6" rx="3" fill="${c.l}" opacity=".7"/>`
});

/* art(p, variantIndex, opts) -> a square tile with the product drawing in the chosen colour */
function art(p, v = 0, label = false) {
  if (p.photo) return `<span class="art photo"><img src="${p.photo}" alt="${label ? p.title.replace(/"/g, "&quot;") : ""}" loading="lazy"></span>`;
  const col = p.colors[v % p.colors.length], c = { m: col.hex, d: shade(col.hex, -0.3), l: shade(col.hex, 0.5) };
  const body = (ICONS[p.art] || ICONS.box)(c);
  const a11y = label ? `role="img" aria-label="${p.title.replace(/"/g, "&quot;")}, ${col.name}"` : `aria-hidden="true"`;
  return `<span class="art" style="--tile:${col.hex}"><svg viewBox="0 0 200 200" ${a11y} focusable="false"><ellipse cx="100" cy="176" rx="54" ry="7" fill="#000" opacity=".13"/>${body}</svg></span>`;
}
