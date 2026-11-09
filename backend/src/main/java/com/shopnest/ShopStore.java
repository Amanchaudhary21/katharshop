package com.shopnest;

import java.util.List;

/**
 * Where the products and the owner's sign-ins are kept.
 * MySqlStore keeps them in MySQL; the tests use a pretend store in memory (FakeStore).
 */
public interface ShopStore {
	/** Makes the tables if they are missing. Throws if the database can't be reached. */
	void setUp();

	/** The email of the owner who got this token from /api/owner/login, or null */
	String ownerEmailFor(String token);

	void saveOwnerSession(String token, String email);

	/** The ids of all products, smallest first */
	List<Long> productIds();

	/** All products, smallest id first */
	List<Product> products();

	/** One product, or null */
	Product product(long id);

	/** The highest product id, or 0 when the shop is empty */
	long highestId();

	/** Saves a new product. Throws DuplicateKeyException if its id is already taken. */
	void insert(Product product);

	/** Deletes a product. false = there was no such product. */
	boolean delete(long id);
}
