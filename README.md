# ShopNest

A practice online store made with plain HTML, CSS and JavaScript (no frameworks).
Search, filters, cart, coupons, checkout, orders, a wish list, selling your own items
with a photo, and sign-in with Google. In four languages: नेपाली (default), English, हिन्दी and 日本語.

> Demo only: no real payments, nothing is shipped, and accounts are saved only in your own browser.

## Live site

**https://amanchaudhary21.github.io/shopnest-store/**

Every push to the `main` branch publishes the `public/` folder again
(see `.github/workflows/deploy.yml`). It takes about a minute.

## Install it as an app

ShopNest is a Progressive Web App (PWA): `public/manifest.webmanifest` gives it a name and icons,
and `public/sw.js` saves its files so it also opens with no internet.

- **Windows (Edge or Chrome):** open the live site, then click the install icon in the address bar
  (or menu **Apps > Install ShopNest**). It gets its own window, Start menu entry and taskbar icon.
- **Android:** Chrome menu **Add to Home screen / Install app**.
- **iPhone:** Safari **Share > Add to Home Screen**.

## Publish it in the Microsoft Store

The Store version is made from the live site with Microsoft's free tool **PWABuilder**,
so every push to `main` also updates the Store app (no new upload needed for normal changes).

1. **Partner Center account:** sign up at <https://partner.microsoft.com/dashboard/registration>
   (individual developer account).
2. **Reserve the name:** Partner Center > Apps and games > **New product > MSIX or PWA app** >
   reserve a name, e.g. *ShopNest Demo Store*.
3. Open the new app > **Product management > Product identity**. Copy **Package/Identity/Name**,
   **Package/Identity/Publisher** and **Package/Properties/PublisherDisplayName**.
4. Go to <https://www.pwabuilder.com>, enter `https://amanchaudhary21.github.io/shopnest-store/`,
   click **Package For Stores > Windows > Generate Package**, and paste the three values from step 3.
5. Unzip the download. Back in Partner Center, **Start your submission**:
   - **Packages:** upload the `.msixbundle` (and the `.classic.appxbundle` if one was made)
   - **Properties:** category *Shopping*; privacy policy URL
     `https://amanchaudhary21.github.io/shopnest-store/privacy.html`
   - **Age ratings:** answer the questionnaire
   - **Store listings:** description and at least one screenshot
     (say it is a demo store with no real purchases)
6. **Submit to the Store.** Certification usually takes a few days.

## How to run it

**Easiest:** double-click `public/index.html`. It opens in your browser. No internet needed
(with internet you also get the nicer Google fonts).

**With the server** (needed for "Sign in with Google" and for saving products in MySQL):

```bash
npm install     # only the first time: downloads Express and mysql2
npm start
```

or double-click `start.bat` (it runs `npm install` itself the first time). The store opens at
<http://localhost:8080>. You need [Node.js](https://nodejs.org) 20.12 or newer and MySQL
(see [Adding and deleting products for everyone](#adding-and-deleting-products-for-everyone-nodejs-server--mysql)).

## Project structure

```
15shopnest-store/
├── public/                  everything the browser loads
│   ├── index.html           the page: header, menu, footer; loads the CSS and JS
│   ├── css/
│   │   └── style.css        colors (light and dark), buttons, cards, cart, sign-in page
│   └── js/
│       ├── core/            shared pieces, loaded first
│       │   ├── i18n.js      languages: the language menu and t("English text")
│       │   ├── data.js      products, categories, coupons, delivery prices
│       │   ├── auth.js      sign-in screen: Google only
│       │   ├── art.js       draws the product pictures (or shows your photo)
│       │   └── core.js      helpers, saved cart and wish list, price maths, page switcher
│       ├── i18n/            one translation file per language: ne.js, hi.js, ja.js
│       ├── pages/           one file per page
│       │   ├── home.js      home page, product lists, search results, filters
│       │   ├── product.js   single product page and reviews
│       │   ├── cart.js      cart, coupon box, wish list
│       │   ├── checkout.js  checkout form, order confirmation, Orders page
│       │   ├── sell.js      "Sell an item": add your own product with a photo
│       │   └── account.js   Account menu (avatar) and "Your profile" page
│       └── main.js          starts the store: menus, search box, theme button, clicks
├── .github/workflows/
│   └── deploy.yml           publishes public/ to GitHub Pages on every push
├── server.js                the server (Node.js + Express): shows public/ and runs the API at /api
├── server/
│   ├── api.js               the shop API: owner sign-in, add, delete and restore products
│   ├── db.js                MySQL (mysql2): makes the database and tables, adds the sample products
│   └── catalog.js           reads the 32 sample products from public/js/core/data.js
├── test/
│   └── api.test.js          `npm test`: checks the API (uses a throwaway shopnest_test database)
├── .env.example             copy to .env: MySQL password and owner password (.env is not uploaded)
├── start.bat                double-click to start the server and open the store
├── package.json             `npm start` runs server.js, `npm test` runs the tests
└── README.md
```

The JS files must load in the order listed at the bottom of `public/index.html`.
Each file uses things made by the files above it.

## Easy things to try

Edit, save with Ctrl+S, then press F5 in the browser.

- `public/index.html`: find `<span>shopnest</span>` and type your own shop name.
- `public/js/core/data.js`: find `const FREE_SHIP_MIN` and change `SHIP_STD = 4.99` to `SHIP_STD = 2.99`.
  Standard delivery now costs $2.99.
- `public/js/core/data.js`: change the words of any product title. It changes everywhere.
- `public/css/style.css`: the colors are the variables at the very top (`--brand`, `--accent` ...).
  The first block is the light theme; the dark theme blocks come right after it.

If something looks broken after an edit, undo with Ctrl+Z and save again.
A small typing mistake in a JS file can stop the whole page.

## Languages

Pick नेपाली, English, हिन्दी or 日本語 with the globe menu in the header or on the sign-in card.
The choice is remembered in this browser. Nepali is the default.

The text is written in English in the code, wrapped like `t("Add to cart")`. Each file in
`public/js/i18n/` maps the English text to its language, so to change a translation, edit it there.
When you add new text, add it to all three files too; anything missing simply shows in English.
Text in `index.html` marked with `data-t` is translated the same way.
Products you add with "Sell an item" keep the words you typed.

## Signing in

Everyone must sign in with **Google** before they can shop. It needs a one-time setup (below)
and only works at http://localhost:8080 or the live site, not on a double-clicked `index.html`.

Each account has its own cart, wish list and orders. Click the round letter button in the
top-right corner of the store to sign out. "Reset demo data" in the footer clears only your data.

### Turning on "Sign in with Google" (one-time, free)

1. Start the store with `npm start` or `start.bat` (Google sign-in does not work from a double-clicked `index.html`).
2. Go to <https://console.cloud.google.com>, make a project, then open **APIs & Services → Credentials**.
3. Click **Create credentials → OAuth client ID**, type **Web application**.
   Under **Authorized JavaScript origins** add `http://localhost`, `http://localhost:8080`
   and, for the live site, `https://amanchaudhary21.github.io`.
4. Copy the Client ID (it ends with `.apps.googleusercontent.com`).
5. Open `public/js/core/auth.js`, find `const GOOGLE_CLIENT_ID = "";` and paste it between the quotes.
6. Save and reload. The Google button now shows on the sign-in page.

Accounts are saved per address, so accounts made on the double-clicked `index.html`
and on `http://localhost:8080` are separate.

## Selling and deleting your items

Click the **+** button in the header to sell an item: choose a photo, add a name and price, and save.
Your items have a red **Delete item** button on their card and a **Delete this item** button on
their product page. Only you see these buttons.

## Adding and deleting products for everyone (Node.js server + MySQL)

The whole project is JavaScript: the store in the browser, and `server.js` on your computer
(Node.js with the **Express** library). Products are kept in **MySQL** (library **mysql2**).

The owner (admin) is amanecdy@gmail.com; anyone who signs in with another Google account is a shopper.

- When the owner **adds** a product on the Sell page, it is saved in the MySQL `products` table
  (with its photo and the date and time it was added, column `created`).
- When the owner **deletes** a product, its row is removed from the database.

Every shopper's store shows the change within 30 seconds (straight away on their next visit).
**Restore all** puts the 32 sample products back; products the owner added are gone for good once deleted.

1. Copy `.env.example` to `.env` (it is not uploaded to GitHub) and fill in your MySQL password
   and an owner password:

   ```properties
   DB_USER=root
   DB_PASSWORD=your-mysql-password
   OWNER_PASSWORD=choose-a-long-password
   ```

2. Start MySQL, then `npm start` (or `start.bat`). The `shopnest` database and its tables are made on
   the first start, with the 32 sample products. Everything runs at <http://localhost:8080>.
3. Sign in to the store as the owner, open **Sell an item**, and enter the owner password under
   **Deleted store products** to connect. Now **Save item to the shop** adds a product for every shopper,
   **Delete item** removes one for every shopper, and **Restore all** brings back the sample products.

To look at the data: `SELECT id, title, price, created FROM shopnest.products;` in MySQL Workbench or the MySQL command line.

The store uses the server only when it is opened at `localhost`. To use it on the live site,
put the server online, put its address in `API_URL` at `public/js/core/data.js`,
and add the site's address to `CORS_ORIGINS` in `.env`.

Tables made by the old Java backend (`product`, `product_color`, ...) are no longer used.
Their products were copied into `products` on the first start; you can drop the old tables if you like.
