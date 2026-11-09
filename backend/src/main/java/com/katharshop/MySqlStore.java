package com.katharshop;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * The products and the owner's sign-ins in MySQL, with plain SQL (Spring's JdbcTemplate).
 * The database ("shopnest", DB_NAME in .env; it kept the shop's first name) is made the first time the server starts
 * (createDatabaseIfNotExist in application.properties), and the tables by setUp():
 *
 *   products         every product in the shop: the ones the owner adds on the Sell page.
 *                    The shop starts empty. Deleting a product removes its row.
 *                    "created" = the date and time it was added, in UTC (Japan time minus 9 hours).
 *   owner_sessions   owners who connected on the Sell page (token -> email)
 */
@Repository
public class MySqlStore implements ShopStore {
	private final JdbcTemplate db;

	public MySqlStore(JdbcTemplate db) {
		this.db = db;
	}

	@Override
	public void setUp() {
		db.execute("""
				CREATE TABLE IF NOT EXISTS products (
				  id BIGINT PRIMARY KEY,
				  cat VARCHAR(40) NOT NULL,
				  art VARCHAR(40) NOT NULL DEFAULT 'box',
				  title VARCHAR(200) NOT NULL,
				  price DECIMAL(12,4) NOT NULL,          -- US dollars, 4 decimals: rupee and yen prices convert back exactly
				  was DECIMAL(12,4) NOT NULL DEFAULT 0,
				  rating DECIMAL(3,1) NOT NULL DEFAULT 0,
				  n INT NOT NULL DEFAULT 0,
				  stock INT NOT NULL DEFAULT 0,
				  kw VARCHAR(500) NOT NULL DEFAULT '',
				  age INT NOT NULL DEFAULT 60,
				  colors JSON NOT NULL,
				  bullets JSON NOT NULL,
				  specs JSON NOT NULL,
				  photo MEDIUMTEXT NULL,
				  mine BOOLEAN NOT NULL DEFAULT FALSE,
				  created DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
				) CHARACTER SET utf8mb4""");
		// databases made before prices had 4 decimals
		List<Integer> scale = db.queryForList("SELECT NUMERIC_SCALE FROM information_schema.columns "
				+ "WHERE table_schema = DATABASE() AND table_name = 'products' AND column_name = 'price'", Integer.class);
		if (!scale.isEmpty() && scale.get(0) < 4)
			db.execute("ALTER TABLE products MODIFY price DECIMAL(12,4) NOT NULL, MODIFY was DECIMAL(12,4) NOT NULL DEFAULT 0");
		db.execute("""
				CREATE TABLE IF NOT EXISTS owner_sessions (
				  token CHAR(64) PRIMARY KEY,
				  email VARCHAR(200) NOT NULL,
				  created DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
				)""");
	}

	@Override
	public String ownerEmailFor(String token) {
		List<String> found = db.queryForList("SELECT email FROM owner_sessions WHERE token = ?", String.class, token);
		return found.isEmpty() ? null : found.get(0);
	}

	@Override
	public void saveOwnerSession(String token, String email) {
		db.update("INSERT INTO owner_sessions (token, email) VALUES (?, ?)", token, email);
	}

	@Override
	public List<Long> productIds() {
		return db.queryForList("SELECT id FROM products ORDER BY id", Long.class);
	}

	@Override
	public List<Product> products() {
		return db.query("SELECT * FROM products ORDER BY id", MySqlStore::product);
	}

	@Override
	public Product product(long id) {
		List<Product> found = db.query("SELECT * FROM products WHERE id = ?", MySqlStore::product, id);
		return found.isEmpty() ? null : found.get(0);
	}

	@Override
	public long highestId() {
		return db.queryForObject("SELECT COALESCE(MAX(id), 0) FROM products", Long.class);
	}

	@Override
	public void insert(Product p) {
		db.update("INSERT INTO products (id, cat, art, title, price, was, rating, n, stock, kw, age, colors, bullets, specs, photo, mine, created) "
				+ "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, TRUE, ?)",
				p.id(), p.cat(), p.art(), p.title(), BigDecimal.valueOf(p.price()), BigDecimal.valueOf(p.was()),
				BigDecimal.valueOf(p.rating()), p.n(), p.stock(), p.kw(), Json.write(p.colors()), Json.write(p.bullets()),
				Json.write(p.specs()), p.photo(), LocalDateTime.ofInstant(p.created(), ZoneOffset.UTC));
	}

	@Override
	public boolean delete(long id) {
		return db.update("DELETE FROM products WHERE id = ?", id) > 0;
	}

	/** One row of the products table -> a Product */
	private static Product product(ResultSet r, int rowNumber) throws SQLException {
		return new Product(r.getLong("id"), r.getString("cat"), r.getString("art"), r.getString("title"),
				r.getBigDecimal("price").doubleValue(), r.getBigDecimal("was").doubleValue(), r.getBigDecimal("rating").doubleValue(),
				r.getInt("n"), r.getInt("stock"), Json.read(r.getString("colors")), Json.read(r.getString("bullets")),
				Json.read(r.getString("specs")), r.getString("kw"), r.getString("photo"),
				r.getObject("created", LocalDateTime.class).toInstant(ZoneOffset.UTC));
	}
}
