package com.katharshop;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * One product, as it is kept in the MySQL "products" table.
 * Prices are in US dollars with 4 decimals; the store shows them in each language's currency.
 *
 * @param colors  [{name, hex}], for now always one: "Default"
 * @param bullets the "About this item" points
 * @param specs   [[name, value]], like [["Seller", "Aman"]]
 * @param photo   the photo as a data: address (data:image/jpeg;base64,...)
 * @param created when the owner added it
 */
public record Product(long id, String cat, String art, String title, double price, double was, double rating, int n,
		int stock, List<Map<String, String>> colors, List<String> bullets, List<List<String>> specs, String kw, String photo,
		Instant created) {

	/** the same product with another id */
	public Product withId(long newId) {
		return new Product(newId, cat, art, title, price, was, rating, n, stock, colors, bullets, specs, kw, photo, created);
	}
}
