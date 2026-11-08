/* ==================================================================
   data.js - The product list, categories, coupons and delivery prices.
   Edit this file to sell different things.
   (file 6 of 16; the load order is at the bottom of index.html)
   ================================================================== */

/* ---------- Store settings and sample catalog (edit freely) ---------- */
const BRAND = "ShopNest";
const FREE_SHIP_MIN = 35, SHIP_STD = 4.99, SHIP_EXP = 12.99;
const COUPONS = {
  WELCOME10: { kind: "pct", value: 10, label: "10% off your items" },
  FREESHIP: { kind: "ship", label: "Free standard delivery" }
};
const CATS = [
  { id: "electronics", name: "Electronics", blurb: "Audio, phones and computers" },
  { id: "fashion", name: "Fashion", blurb: "Shoes, tees and bags" },
  { id: "home", name: "Home & Kitchen", blurb: "Lighting and cookware" },
  { id: "books", name: "Books & Stationery", blurb: "Read, plan and write" },
  { id: "sports", name: "Sports & Outdoors", blurb: "Training and travel gear" },
  { id: "beauty", name: "Beauty & Care", blurb: "Skin, hair and scent" },
  { id: "toys", name: "Toys & Games", blurb: "Play for every age" },
  { id: "grocery", name: "Grocery & Pantry", blurb: "Staples and treats" }
];
const C = (...pairs) => pairs.map(p => ({ name: p[0], hex: p[1] }));
// mk(id, category, art, title, price, listPrice|0, rating, ratingCount, stock, colors, bullets, specs, keywords, daysOld)
const mk = (id, cat, art, title, price, was, rating, n, stock, colors, bullets, specs, kw, age) =>
  ({ id, cat, art, title, price, was: was || 0, rating, n, stock, colors, bullets, specs, kw: kw || "", age: age || 60 });

const P = [
  mk(1, "electronics", "headphones", "Wireless Over-Ear Headphones with Noise Cancelling", 79.99, 109.99, 4.6, 2841, 38,
    C(["Midnight", "#2F3E52"], ["Sand", "#C9A25F"], ["Sage", "#6E9C7F"]),
    ["Active noise cancelling for flights and busy commutes", "Up to 40 hours of playtime on one charge", "Foldable frame with a hard carry case"],
    [["Connection", "Bluetooth 5.3"], ["Battery", "40 hours"], ["Weight", "254 g"]], "audio music earphones bluetooth sound", 12),
  mk(2, "electronics", "phone", "Smartphone 6.5\" 128 GB with Dual Camera", 249.00, 299.00, 4.3, 1520, 21,
    C(["Graphite", "#3A4350"], ["Ocean", "#2F6FD0"], ["Mint", "#4DB49A"]),
    ["Bright 6.5 inch display with a smooth 90 Hz refresh rate", "Dual rear camera with night mode", "Two-day battery and 33 W fast charging"],
    [["Storage", "128 GB"], ["Screen", "6.5 inch"], ["Battery", "5000 mAh"]], "mobile cellphone android", 30),
  mk(3, "electronics", "laptop", "Slim Laptop 14\" with 16 GB RAM and 512 GB SSD", 629.00, 749.00, 4.5, 864, 9,
    C(["Silver", "#9AA7B5"], ["Space Gray", "#4B5563"]),
    ["Light 1.3 kg body that fits in any bag", "Fast 512 GB solid state drive", "Full HD anti-glare screen, up to 12 hours of battery"],
    [["Memory", "16 GB"], ["Storage", "512 GB SSD"], ["Weight", "1.3 kg"]], "computer notebook pc work", 25),
  mk(4, "electronics", "watch", "Fitness Smartwatch with Heart-Rate Monitor", 59.99, 89.99, 4.2, 3302, 64,
    C(["Black", "#262B33"], ["Rose", "#D98A9B"], ["Teal", "#2A8F95"]),
    ["Tracks steps, sleep and heart rate all day", "Water resistant to 50 metres", "Calls and message alerts on your wrist"],
    [["Display", "1.69 inch"], ["Battery", "10 days"], ["Water rating", "5 ATM"]], "wearable fitness tracker band", 8),
  mk(5, "electronics", "speaker", "Portable Bluetooth Speaker, Waterproof", 34.99, 49.99, 4.7, 5120, 120,
    C(["Coral", "#E4604A"], ["Navy", "#2B4A7A"], ["Forest", "#3F7D5A"]),
    ["Loud, clear 20 W sound with deep bass", "Floats and survives splashes (IP67)", "12 hours of playtime"],
    [["Power", "20 W"], ["Battery", "12 hours"], ["Rating", "IP67"]], "audio music wireless bluetooth", 40),
  mk(6, "electronics", "camera", "Compact Mirrorless Camera Kit with 16-50 mm Lens", 449.00, 0, 4.4, 612, 0,
    C(["Black", "#2B2F36"], ["Silver", "#A5AEB8"]),
    ["24 megapixel sensor for sharp detail in low light", "Tilting touch screen for vlogs and selfies", "Shoots 4K video"],
    [["Sensor", "24 MP"], ["Video", "4K 30p"], ["Kit lens", "16-50 mm"]], "photo photography vlog", 90),
  mk(7, "fashion", "sneaker", "Lightweight Running Shoes", 54.99, 74.99, 4.4, 2210, 80,
    C(["Coral", "#E8664F"], ["Ink", "#2D3A5C"], ["Lime", "#9BC53D"]),
    ["Breathable mesh upper keeps feet cool", "Cushioned sole for daily runs", "Weighs only 240 g per shoe"],
    [["Type", "Road running"], ["Drop", "8 mm"], ["Weight", "240 g"]], "shoes trainers footwear jogging", 18),
  mk(8, "fashion", "tshirt", "Organic Cotton T-Shirt, Pack of 2", 24.99, 0, 4.5, 4033, 150,
    C(["Navy", "#2B3A63"], ["Olive", "#6F7B45"], ["Clay", "#C27A5A"]),
    ["Soft 100% organic cotton", "Relaxed fit that keeps its shape after washing", "Two shirts in every pack"],
    [["Material", "Organic cotton"], ["Fit", "Regular"], ["Care", "Machine wash"]], "clothes shirt top clothing", 55),
  mk(9, "fashion", "backpack", "Water-Resistant Travel Backpack 30 L", 39.99, 54.99, 4.6, 3710, 44,
    C(["Charcoal", "#3C434D"], ["Forest", "#3C6E55"], ["Rust", "#B5573A"]),
    ["Padded compartment fits a 15.6 inch laptop", "USB charging port on the outside", "Water-resistant fabric and strong zips"],
    [["Capacity", "30 L"], ["Laptop", "Up to 15.6 inch"], ["Weight", "0.9 kg"]], "bag travel school commute", 22),
  mk(10, "fashion", "sunglasses", "Polarized Sunglasses with UV400 Protection", 19.99, 29.99, 4.1, 1288, 90,
    C(["Black", "#1F2227"], ["Tortoise", "#8A5A2B"]),
    ["Polarized lenses cut glare on road and water", "Blocks 100% of UVA and UVB light", "Flexible, lightweight frame"],
    [["Lens", "Polarized"], ["Protection", "UV400"], ["Frame", "Nylon"]], "shades eyewear summer", 70),
  mk(11, "home", "lamp", "Dimmable LED Desk Lamp with USB Charging Port", 27.99, 0, 4.5, 2540, 52,
    C(["White", "#E9ECEF"], ["Black", "#2D3138"]),
    ["Five brightness levels and three light colours", "Built-in USB port charges your phone", "Flexible neck points light where you need it"],
    [["Power", "10 W"], ["Colour modes", "3"], ["Cable", "1.5 m"]], "light office study reading", 35),
  mk(12, "home", "mug", "Insulated Stainless Steel Travel Mug 16 oz", 18.99, 24.99, 4.7, 6120, 140,
    C(["Teal", "#2A8A8F"], ["Pink", "#D9708F"], ["Steel", "#9AA3AD"]),
    ["Keeps drinks hot for 6 hours or cold for 12", "Leak-resistant lid with a one-hand sip opening", "Fits most car cup holders"],
    [["Volume", "473 ml"], ["Material", "Stainless steel"], ["Lid", "Leak-resistant"]], "coffee tea cup flask", 48),
  mk(13, "home", "kettle", "Electric Gooseneck Kettle 1 L", 42.00, 59.00, 4.6, 1760, 27,
    C(["Matte Black", "#2C3036"], ["Cream", "#D9CDB4"]),
    ["Precise pour spout for tea and coffee", "Set the exact temperature from 40 to 100 C", "Auto shut-off when the water boils"],
    [["Capacity", "1 L"], ["Power", "1200 W"], ["Cord", "Swivel base"]], "kitchen boil water appliance", 14),
  mk(14, "home", "pan", "Non-Stick Frying Pan 28 cm", 23.50, 0, 4.3, 3015, 75,
    C(["Graphite", "#3B4048"], ["Red", "#C2412F"]),
    ["Durable non-stick coating needs little oil", "Works on gas, electric and induction hobs", "Heat-safe handle stays cool"],
    [["Diameter", "28 cm"], ["Hobs", "All, incl. induction"], ["Oven safe", "To 180 C"]], "kitchen cookware cooking", 66),
  mk(15, "books", "book", "The Little Book of Budgeting", 12.99, 0, 4.4, 982, 61,
    C(["Blue", "#2F5FA8"], ["Green", "#3C8061"]),
    ["Simple monthly money plans you can start today", "Worksheets for savings goals and debt", "224 pages, paperback"],
    [["Format", "Paperback"], ["Pages", "224"], ["Language", "English"]], "money finance savings guide", 100),
  mk(16, "books", "notebook", "Dotted Notebook A5, Hardcover, 2-Pack", 14.99, 0, 4.7, 2640, 110,
    C(["Forest", "#31665A"], ["Plum", "#7A3E6B"], ["Ink", "#2A3552"]),
    ["Thick 120 gsm paper that resists ink bleed", "Dotted pages for notes, sketches and planning", "Ribbon bookmark and back pocket"],
    [["Size", "A5"], ["Pages", "192 each"], ["Paper", "120 gsm"]], "stationery journal planner diary writing", 20)
];

P.push(
  mk(17, "books", "book", "Everyday Cooking for Beginners", 16.49, 21.99, 4.5, 1420, 33,
    C(["Orange", "#D9792B"], ["Teal", "#2A8590"]),
    ["120 easy recipes with short ingredient lists", "Step-by-step photos for every dish", "Hardcover with a lay-flat spine"],
    [["Format", "Hardcover"], ["Pages", "288"], ["Recipes", "120"]], "cookbook recipes food kitchen", 45),
  mk(18, "sports", "ball", "Official Size Soccer Ball", 21.99, 0, 4.5, 1980, 95,
    C(["Classic", "#E9ECEF"], ["Neon", "#C8E04B"]),
    ["Size 5 ball for matches and training", "Machine-stitched panels hold their shape", "Air-retaining bladder stays firm longer"],
    [["Size", "5"], ["Panels", "32"], ["Surface", "Grass and turf"]], "football soccer outdoor team", 33),
  mk(19, "sports", "dumbbell", "Adjustable Dumbbell Pair, 2 x 10 kg", 64.00, 85.00, 4.6, 740, 4,
    C(["Black", "#2B2E34"], ["Blue", "#2F63B5"]),
    ["Add or remove plates to train at any level", "Non-slip grip with a secure collar lock", "Includes a pair of 2.5 kg plates"],
    [["Weight", "2 x 10 kg"], ["Grip", "Knurled steel"], ["Use", "Home gym"]], "weights fitness gym strength training", 17),
  mk(20, "sports", "bottle", "Leakproof Sports Water Bottle 750 ml", 11.99, 0, 4.6, 8120, 210,
    C(["Aqua", "#2FA4C2"], ["Lime", "#8DBE3A"], ["Grape", "#7C58B8"]),
    ["Flip lid opens with one hand and locks shut", "BPA-free and easy to clean", "Fits standard bike and car holders"],
    [["Volume", "750 ml"], ["Material", "BPA-free plastic"], ["Lid", "Flip-top"]], "hydration gym cycling drink", 52),
  mk(21, "sports", "mat", "Non-Slip Yoga Mat, 6 mm", 22.00, 32.00, 4.4, 2310, 58,
    C(["Plum", "#7B4B94"], ["Ocean", "#2A7DA6"], ["Moss", "#5E8F4E"]),
    ["Textured surface grips in every pose", "6 mm cushioning protects knees and wrists", "Comes with a carry strap"],
    [["Thickness", "6 mm"], ["Length", "183 cm"], ["Material", "TPE foam"]], "yoga pilates exercise fitness", 28),
  mk(22, "beauty", "jar", "Daily Moisturizing Face Cream 50 ml", 15.50, 0, 4.3, 1870, 72,
    C(["Cream", "#E4D8C2"], ["Rose", "#E3A6A6"]),
    ["Light cream that absorbs in seconds", "Glycerin and vitamin E keep skin soft", "Fragrance-free"],
    [["Size", "50 ml"], ["Skin type", "All"], ["Scent", "None"]], "skincare lotion cream face", 41),
  mk(23, "beauty", "perfume", "Eau de Parfum, Citrus and Cedar, 50 ml", 38.00, 52.00, 4.2, 530, 3,
    C(["Amber", "#C98A32"], ["Mist", "#8EB3C7"]),
    ["Fresh citrus opening with a warm cedar base", "Long-lasting for up to 8 hours", "Refillable glass bottle"],
    [["Size", "50 ml"], ["Notes", "Citrus, cedar"], ["Type", "Eau de parfum"]], "fragrance scent cologne", 9),
  mk(24, "beauty", "dropper", "Argan Hair Oil with Dropper, 100 ml", 13.99, 0, 4.4, 990, 85,
    C(["Gold", "#C9962E"], ["Green", "#5E8F6B"]),
    ["Smooths frizz and adds shine", "Lightweight, non-greasy feel", "Dropper for easy, exact use"],
    [["Size", "100 ml"], ["Hair type", "All"], ["Main oil", "Argan"]], "haircare serum oil", 60),
  mk(25, "toys", "blocks", "Wooden Building Blocks, 100 Pieces", 26.99, 0, 4.7, 3050, 66,
    C(["Primary", "#E2573F"], ["Pastel", "#6DB5A8"]),
    ["Smooth, rounded blocks in 8 shapes", "Stored in a tidy cotton bag", "Great for ages 3 and up"],
    [["Pieces", "100"], ["Age", "3+"], ["Material", "Beech wood"]], "kids children educational play", 38),
  mk(26, "toys", "robot", "Remote-Control Robot Toy with Lights and Sound", 31.99, 44.99, 4.2, 770, 29,
    C(["Silver", "#9BA8B6"], ["Red", "#D44A3A"]),
    ["Walks, turns and dances on command", "Flashing eyes and fun sound effects", "Rechargeable with a USB cable"],
    [["Age", "5+"], ["Range", "10 m"], ["Battery", "Rechargeable"]], "kids children remote control gift", 11),
  mk(27, "toys", "box", "Family Board Game Night Set, 4 Games in 1", 19.99, 0, 4.5, 1210, 47,
    C(["Blue", "#2F5FA8"], ["Red", "#C2412F"]),
    ["Four classic games in a single box", "For 2 to 6 players, ages 6 and up", "Sturdy boards and pieces"],
    [["Players", "2 to 6"], ["Age", "6+"], ["Games", "4"]], "family party kids games", 80),
  mk(28, "grocery", "pouch", "Medium Roast Coffee Beans, 1 kg", 17.99, 22.99, 4.6, 4410, 130,
    C(["Brown", "#6B4A32"], ["Terracotta", "#B5603B"]),
    ["Smooth medium roast with notes of cocoa", "Roasted in small batches, sealed for freshness", "Resealable 1 kg bag"],
    [["Roast", "Medium"], ["Weight", "1 kg"], ["Form", "Whole beans"]], "coffee drink breakfast", 15),
  mk(29, "grocery", "tea", "Green Tea Bags, 100 Count", 8.99, 0, 4.5, 3320, 175,
    C(["Green", "#4F8F54"], ["Jade", "#3E8C80"]),
    ["Light, grassy taste with no bitterness", "100 individually sealed tea bags", "Great hot or iced"],
    [["Count", "100 bags"], ["Caffeine", "Low"], ["Type", "Green tea"]], "drink beverage herbal", 62),
  mk(30, "grocery", "bottle", "Extra Virgin Olive Oil 750 ml", 14.49, 0, 4.6, 2290, 88,
    C(["Olive", "#6E7C2F"], ["Gold", "#B8932F"]),
    ["Cold-pressed from first-harvest olives", "Fruity flavour for salads and dipping", "Dark glass bottle protects freshness"],
    [["Volume", "750 ml"], ["Grade", "Extra virgin"], ["Pressing", "Cold"]], "cooking oil kitchen pantry", 75),
  mk(31, "grocery", "jar", "Mixed Nuts and Dried Fruit Jar 500 g", 9.99, 12.99, 4.4, 1660, 54,
    C(["Amber", "#C2832F"], ["Berry", "#9A3E5A"]),
    ["Almonds, cashews, raisins and cranberries", "No added sugar or salt", "Resealable jar"],
    [["Weight", "500 g"], ["Added sugar", "None"], ["Pack", "Jar"]], "snack healthy dried fruit", 26),
  mk(32, "grocery", "pouch", "Long Grain Basmati Rice 5 kg", 13.99, 0, 4.7, 2750, 99,
    C(["Cream", "#D8C79B"], ["Gold", "#C9A23A"]),
    ["Aged grains cook up long, fluffy and fragrant", "Naturally gluten free", "5 kg family bag"],
    [["Weight", "5 kg"], ["Grain", "Long"], ["Origin", "Sample"]], "staple pantry cooking food", 85)
);
/* Real product photos, saved as img/products/<id>.jpg (sources and licences: img/products/CREDITS.md) */
P.forEach(p => { p.photo = `img/products/${p.id}.jpg`; });
/* The shop server (server.js: Node.js + Express + MySQL) keeps the products in MySQL, so what the
   owner adds or deletes is the same on every device.
   - Opened from the server itself (http://localhost:8080 or its ngrok link): it uses that server.
   - Opened on the live site (GitHub Pages): it uses SHOP_SERVER, the ngrok link to your laptop
     (NGROK_DOMAIN in .env; server.js prints it when it starts). When the laptop is off, the store
     shows the products it saw last. Empty = no server: added items stay in the owner's browser,
     and deletions use the published removed.js list. */
const SHOP_SERVER = "";
const API_URL = !location.protocol.startsWith("http") ? ""
  : location.hostname.endsWith("github.io") ? SHOP_SERVER : location.origin;
/* Items the owner added on the "Sell an item" page (see js/pages/sell.js). With a server: the last
   list it sent (bz:srvAdded), checked again as soon as the page loads (main.js). Without one: this browser only (bz:mine). */
try { (JSON.parse(localStorage.getItem(API_URL ? "bz:srvAdded" : "bz:mine")) || []).forEach(p => { if (p && p.id && p.photo) P.push(p); }); } catch (e) { /* blocked */ }
/* Store products the owner deleted. With a server: the last list it sent (bz:srvRemoved), checked
   again as soon as the page loads (main.js). Without one: the published list (js/core/removed.js),
   and the owner's browser keeps its own list (bz:removed) until it is published. See js/pages/sell.js */
const sameIds = (a, b) => a.length === b.length && a.every(id => b.includes(id));
const BASE_TITLES = Object.fromEntries(P.filter(p => !p.mine).map(p => [p.id, p.title]));
/* Store text in the shopper's language (js/i18n). Your own items stay as you typed them.
   The English name joins the keywords, so English searches still work in every language. */
if (LANG !== "en") {
  P.filter(p => !p.mine).forEach(p => {
    p.kw += " " + p.title.toLowerCase();
    p.title = t(p.title);
    p.bullets = p.bullets.map(b => t(b));
    p.specs = p.specs.map(([k, v]) => [t(k), t(v)]);
    p.colors.forEach(c => { c.name = t(c.name); });
  });
  CATS.forEach(c => { c.name = t(c.name); c.blurb = t(c.blurb); });
  Object.values(COUPONS).forEach(c => { c.label = t(c.label); });
}
let REMOVED = [...PUBLISHED_REMOVED];
try {
  const local = JSON.parse(localStorage.getItem(API_URL ? "bz:srvRemoved" : "bz:removed"));
  if (API_URL) REMOVED = Array.isArray(local) ? local.filter(Number.isFinite) : [];
  else if (Array.isArray(local)) {
    const ids = local.filter(Number.isFinite);
    if (sameIds(ids, PUBLISHED_REMOVED)) localStorage.removeItem("bz:removed"); // published: follow the shared list again
    else REMOVED = ids;
  }
} catch (e) { /* blocked */ }
for (let i = P.length - 1; i >= 0; i--) if (REMOVED.includes(P[i].id)) P.splice(i, 1);
const PM = new Map(P.map(p => [p.id, p]));
const HERO = [
  { id: "audio", h: t("Sound that goes where you go"), t: t("Headphones and speakers, with deals on the most loved models."), cta: t("Shop audio"), to: "#/c/electronics", art: [1, 0], bg: "var(--brand-2)", ink: "var(--on-brand)" },
  { id: "pantry", h: t("Fill the pantry, skip the delivery fee"), t: t("Free delivery on every order over $35. Stock up on coffee, tea, oil and rice."), cta: t("Shop grocery"), to: "#/c/grocery", art: [28, 0], bg: "var(--tag)", ink: "var(--on-tag)" },
  { id: "move", h: t("Move more this season"), t: t("Mats, weights, balls and bottles to get you started."), cta: t("Shop sports"), to: "#/c/sports", art: [21, 1], bg: "var(--accent)", ink: "var(--on-accent)" }
];
