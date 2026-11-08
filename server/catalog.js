/* catalog.js - The department ids (electronics, fashion, ...), read from the store's own
   public/js/core/data.js, so there is only one list to edit. The API accepts new products
   only in these departments. */
const fs = require("fs"), path = require("path"), vm = require("vm");

const file = path.join(__dirname, "..", "public", "js", "core", "data.js");
// data.js is browser code: give it just enough of a "browser" to run
const sandbox = {
  LANG: "en", t: s => s, location: { hostname: "", protocol: "file:", origin: "null" },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} }
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(file, "utf8") + "\n;globalThis.__cats = CATS.map(c => c.id);", sandbox, { filename: file });

const CATEGORIES = sandbox.__cats;

module.exports = { CATEGORIES };
