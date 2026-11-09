# Katharshop

A practice online store made with plain HTML, CSS and JavaScript (no frameworks).
Search, filters, cart, coupons, checkout, orders, a wish list, selling your own items
with a photo, and sign-in with Google. In four languages: नेपाली (default), English, हिन्दी and 日本語.

> Demo only: no real payments, nothing is shipped, and accounts are saved only in your own browser.

## Live site

**https://amanchaudhary21.github.io/shopnest-store/**

Every push to the `main` branch publishes the `public/` folder again
(see `.github/workflows/deploy.yml`). It takes about a minute.

## Install it as an app

Katharshop is a Progressive Web App (PWA): `public/manifest.webmanifest` gives it a name and icons,
and `public/sw.js` saves its files so it also opens with no internet.

- **Windows (Edge or Chrome):** open the live site, then click the install icon in the address bar
  (or menu **Apps > Install Katharshop**). It gets its own window, Start menu entry and taskbar icon.
- **Android:** Chrome menu **Add to Home screen / Install app**.
- **iPhone:** Safari **Share > Add to Home Screen**.

## Publish it in the Microsoft Store

The Store version is made from the live site with Microsoft's free tool **PWABuilder**,
so every push to `main` also updates the Store app (no new upload needed for normal changes).

1. **Partner Center account:** sign up at <https://partner.microsoft.com/dashboard/registration>
   (individual developer account).
2. **Reserve the name:** Partner Center > Apps and games > **New product > MSIX or PWA app** >
   reserve a name, e.g. *Katharshop Demo Store*.
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
double-click `start.bat`. The store opens at <http://localhost:8080> by itself. Close the window to stop it.

You need [Java](https://adoptium.net) 21 or newer and MySQL
(see [Adding and deleting products for everyone](#adding-and-deleting-products-for-everyone-java-server--mysql)).
Maven (the Java build tool) is not needed: `backend/mvnw.cmd` downloads it, and the Java libraries,
the first time (a few minutes, only once).

### Which part is Java, which part is JavaScript

- **The server is Java** (`backend/`, with Spring Boot): it gives the store's files to the browser,
  checks the owner's password, and saves products in MySQL.
- **The store you click on is HTML, CSS and JavaScript** (`public/`), because a web browser can only run
  JavaScript. It is also what GitHub Pages publishes as the live site, where there is no Java server.

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
│       │   ├── art.js       shows the product photos
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
├── backend/                 the shop server, in Java (Spring Boot + MySQL)
│   ├── pom.xml              Maven's build file: Java version and libraries
│   ├── mvnw.cmd             runs Maven (downloads it the first time)
│   └── src/
│       ├── main/java/com/katharshop/
│       │   ├── KatharshopApplication.java starts the server
│       │   ├── ShopApi.java    the shop API at /api: owner sign-in, add and delete products
│       │   ├── ApiFilter.java  before every /api call: the live site may call it, no caching, 503 without MySQL
│       │   ├── MySqlStore.java MySQL (plain SQL): the tables and every query
│       │   ├── ShopStore.java  what a product store can do (MySqlStore; the tests use a pretend one)
│       │   ├── Product.java    one product, as it is kept in MySQL
│       │   ├── Departments.java reads the department list from public/js/core/data.js
│       │   ├── Settings.java   the settings from .env (owner email and password, CORS_ORIGINS)
│       │   ├── StartUp.java    at start: connect to MySQL, open the ngrok link and the browser
│       │   ├── NgrokLink.java  the ngrok link for your phone and the live site
│       │   ├── WebConfig.java  shows the files in public/ at http://localhost:8080
│       │   └── Json.java       JSON text <-> Java
│       ├── main/resources/application.properties   Spring Boot settings (port 8080, MySQL address)
│       └── test/java/com/katharshop/                 the server's tests (see "Tests" below)
├── test/
│   └── store.test.js        the store's JavaScript: prices, cart, search, pages (no browser needed)
├── .env.example             copy to .env: MySQL password and owner password (.env is not uploaded)
├── start.bat                double-click to start the server and open the store
├── package.json             only for `npm test` (the store's JavaScript tests)
└── README.md
```

The JS files must load in the order listed at the bottom of `public/index.html`.
Each file uses things made by the files above it.

## Tests

**The Java server** (in a terminal, in the `backend` folder):

```bash
mvnw test
```

- `ShopApiTests.java` starts the real server with a pretend database in memory (`FakeStore.java`), so it
  needs no MySQL. It checks the API's rules: owner sign-in, adding and deleting, bad input, the 15-minute
  wait after 10 wrong passwords, and that the store's own pages are shown.
- `MySqlTests.java` checks the server against your real MySQL, using its own `shopnest_test` database
  (made and dropped by the test, never your real `shopnest`). When MySQL is not running, it is skipped.
- `SmallPartsTests.java` checks the small parts: departments, price rounding, settings, the ngrok link.

**The store's JavaScript** (needs [Node.js](https://nodejs.org) 20.12 or newer; nothing to install):

```bash
npm test
```

`test/store.test.js` loads the store's own JavaScript in the order index.html gives into a pretend browser
and checks prices in every currency, the cart and totals, search and filters, the pages, sign-in and the
checkout forms. It also checks that every text is translated in all three languages.

## Easy things to try

Edit, save with Ctrl+S, then press F5 in the browser.

- `public/index.html`: find `<span>katharshop</span>` and type your own shop name.
- `public/js/core/data.js`: find `const FREE_SHIP_MIN` and change `shopFee(4.99)` to `shopFee(2.99)`.
  Standard delivery now costs रू 450 (2.99 dollars, rounded to whole rupees).
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
When you add new text, add it to all three files too; anything missing shows in English, and `npm test` lists it.
Text in `index.html` marked with `data-t` is translated the same way.
Products you add with "Sell an item" keep the words you typed.

### Prices: always Nepali rupees

Every price is in Nepali rupees, in every language. Only the digits follow the language:
रू १,९९९ in नेपाली, रू 1,999 in English, हिन्दी and 日本語.

On the Sell page you type the price in rupees. It is saved in US dollars with 4 decimals (also in MySQL),
so it comes back exactly as you typed it. Delivery: free from रू 5,300, otherwise रू 750 (express रू 2,000).
Orders placed before the shop used rupees only keep the currency they were paid in.

The rupee rate is `CURRENCIES.ne` at the top of `public/js/core/data.js` (how much 1 US dollar is).
Don't change it once the shop has products: every price would change with it.

### How many are left

Every product card shows how many are left in stock ("12 left in stock"). From 5 down it turns orange:
"Only 3 left in stock". The product page and the cart show the number too. The number is the stock the owner
typed on the Sell page; demo orders don't lower it (they are saved only in the shopper's browser).

## Signing in

Everyone must sign in with **Google** before they can shop. It needs a one-time setup (below)
and only works at http://localhost:8080 or the live site, not on a double-clicked `index.html`.

Each account has its own cart, wish list and orders. Click the round letter button in the
top-right corner of the store to sign out. "Reset demo data" in the footer clears only your data.

### Turning on "Sign in with Google" (one-time, free)

1. Start the store with `start.bat` (Google sign-in does not work from a double-clicked `index.html`).
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

## Adding and deleting products for everyone (Java server + MySQL)

The store in the browser talks to the Java server in `backend/` on your computer (**Spring Boot**).
Products are kept in **MySQL** (with plain SQL in `MySqlStore.java`).

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

2. Start MySQL, then `start.bat`. The `shopnest` database and its two tables
   (`products` and `owner_sessions`) are made on the first start. Everything runs at <http://localhost:8080>.
   The window says `Connected to MySQL` (or what went wrong).
3. Sign in to the store as the owner, open **Sell an item**, and enter the owner password under
   **Shop server** to connect. Now **Save item to the shop** adds a product for every shopper,
   and **Delete item** removes one for every shopper.

The database kept the shop's first name, `shopnest` (DB_NAME in `.env`), so nothing had to move when the shop
became Katharshop. To look at the data: `SELECT id, title, price, created FROM shopnest.products;` in MySQL Workbench or the
MySQL command line. `created` is in UTC (Japan time minus 9 hours).

## The same products on your phone and every other device (ngrok link)

Your laptop is the server: the products live in its MySQL database. A free **ngrok** link gives the
laptop a fixed `https://….ngrok-free.app` address on the internet, and the live site (GitHub Pages)
gets its products from there. So the laptop, your phone and every shopper see the same products.

1. Make a free account at <https://ngrok.com>. In the ngrok dashboard copy **Your Authtoken**, and under
   **Domains** your free domain (like `something.ngrok-free.app`).
2. Install the ngrok program once. In a terminal: `winget install ngrok.ngrok`
3. Put both in `.env` (never in GitHub):

   ```properties
   NGROK_AUTHTOKEN=your-authtoken
   NGROK_DOMAIN=something.ngrok-free.app
   ```

4. Run `start.bat`. The Java server starts ngrok for you, and the window says
   `Other devices reach this shop server at https://something.ngrok-free.app`.
5. Put that address in `public/js/core/data.js` at `const SHOP_SERVER = "";` and push to GitHub.
6. On the phone, open the live site as usual. To add or delete products there, open **Sell an item** and
   connect with the owner password once (set `OWNER_PASSWORD` in `.env`, so it stays the same).

While the laptop is off, the live site shows the products it saw last, and adding or deleting waits until
the laptop runs `start.bat` again. The store only checks for changes while it is on screen, because the
free ngrok plan has a monthly limit. After 10 wrong owner passwords, sign-in from that address waits 15 minutes.

Tables made by older versions (`product`, `product_color`, ... from the first Java backend, and `shop_meta`)
are no longer used. You can drop them if you like.
