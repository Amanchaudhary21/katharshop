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
│       │   ├── data.js      departments, coupons, delivery prices, where products come from
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
│   ├── db.js                MySQL (mysql2): makes the database and its tables
│   └── catalog.js           reads the department list from public/js/core/data.js
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
- `public/js/core/data.js`: find `const FREE_SHIP_MIN` and change `shopFee(4.99)` to `shopFee(2.99)`.
  Standard delivery now costs $2.99 (and the same, rounded, in rupees and yen).
- `public/js/core/data.js`: change the words of a department in `CATS`. It changes everywhere.
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

### Prices in each language's currency

| Language | Currency | Example |
| --- | --- | --- |
| नेपाली | Nepali rupee | रू १,९९९ |
| English | US dollar | $13.28 |
| हिन्दी | Indian rupee | ₹1,249 |
| 日本語 | Japanese yen | ￥2,102 |

Prices are saved in US dollars (also in MySQL), and the store converts them when it shows them,
so changing the language changes every price by itself. On the Sell page you type the price in your
language's currency; it is saved in dollars with 4 decimals, so it comes back exactly as you typed it.
Delivery fees and the free-delivery limit become round numbers in each currency (रू 5,300, ₹3,300, ￥5,500).
Orders keep the currency they were paid in.

The exchange rates are `CURRENCIES` at the top of `public/js/core/data.js` (how much 1 US dollar is).
Change a rate there and every price follows.

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

The shop starts empty: there are no sample products. Every product is one the owner added.
Every shopper's store shows a change within 30 seconds (straight away on their next visit).
A deleted product is gone for good.

1. Copy `.env.example` to `.env` (it is not uploaded to GitHub) and fill in your MySQL password
   and an owner password:

   ```properties
   DB_USER=root
   DB_PASSWORD=your-mysql-password
   OWNER_PASSWORD=choose-a-long-password
   ```

2. Start MySQL, then `npm start` (or `start.bat`). The `shopnest` database and its two tables
   (`products` and `owner_sessions`) are made on the first start. Everything runs at <http://localhost:8080>.
3. Sign in to the store as the owner, open **Sell an item**, and enter the owner password under
   **Shop server** to connect. Now **Save item to the shop** adds a product for every shopper,
   and **Delete item** removes one for every shopper.

To look at the data: `SELECT id, title, price, created FROM shopnest.products;` in MySQL Workbench or the
MySQL command line. `created` is in UTC (Japan time minus 9 hours).

## The same products on your phone and every other device (ngrok link)

Your laptop is the server: the products live in its MySQL database. A free **ngrok** link gives the
laptop a fixed `https://….ngrok-free.app` address on the internet, and the live site (GitHub Pages)
gets its products from there. So the laptop, your phone and every shopper see the same products.

1. Make a free account at <https://ngrok.com>. In the ngrok dashboard copy **Your Authtoken**, and under
   **Domains** your free domain (like `something.ngrok-free.app`).
2. Put both in `.env` (never in GitHub):

   ```properties
   NGROK_AUTHTOKEN=your-authtoken
   NGROK_DOMAIN=something.ngrok-free.app
   ```

3. Run `start.bat` (or `npm start`). The window says
   `Other devices reach this shop server at https://something.ngrok-free.app`.
4. Put that address in `public/js/core/data.js` at `const SHOP_SERVER = "";` and push to GitHub.
5. On the phone, open the live site as usual. To add or delete products there, open **Sell an item** and
   connect with the owner password once (set `OWNER_PASSWORD` in `.env`, so it stays the same).

While the laptop is off, the live site shows the products it saw last, and adding or deleting waits until
the laptop runs `start.bat` again. The store only checks for changes while it is on screen, because the
free ngrok plan has a monthly limit. After 10 wrong owner passwords, sign-in from that address waits 15 minutes.

Tables made by the old Java backend (`product`, `product_color`, ...) are no longer used.
Their products were copied into `products` on the first start; you can drop the old tables if you like.
