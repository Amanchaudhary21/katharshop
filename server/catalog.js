/* catalog.js - The 32 sample products and the department names, read from the store's own
   public/js/core/data.js, so there is only one list to edit.
   Used to fill the database the first time and by "Restore all". */
const fs = require("fs"), path = require("path"), vm = require("vm");

const file = path.join(__dirname, "..", "public", "js", "core", "data.js");
// data.js is browser code: give it just enough of a "browser" to run
const sandbox = {
  LANG: "en", t: s => s, PUBLISHED_REMOVED: [], location: { hostname: "" },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(file, "utf8") + "\n;globalThis.__out = { P, CATS };", sandbox, { filename: file });

const SAMPLES = sandbox.__out.P.filter(p => !p.mine).map(p => ({
  id: p.id, cat: p.cat, art: p.art, title: p.title, price: p.price, was: p.was || 0, rating: p.rating, n: p.n,
  stock: p.stock, kw: p.kw || "", age: p.age || 60,
  colors: p.colors.map(c => ({ name: c.name, hex: c.hex })), bullets: [...p.bullets], specs: p.specs.map(s => [...s])
}));
const SAMPLE_IDS = SAMPLES.map(p => p.id);
const CATEGORIES = sandbox.__out.CATS.map(c => c.id);

module.exports = { SAMPLES, SAMPLE_IDS, CATEGORIES };
