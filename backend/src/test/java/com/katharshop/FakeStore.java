package com.katharshop;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.dao.DuplicateKeyException;

/** A pretend ShopStore in memory, so the API can be tested without MySQL (see ShopApiTests) */
class FakeStore implements ShopStore {
	final Map<Long, Product> products = new TreeMap<>(); // sorted by id, like ORDER BY id
	final Map<String, String> sessions = new HashMap<>();

	@Override
	public void setUp() {
	}

	@Override
	public synchronized String ownerEmailFor(String token) {
		return sessions.get(token);
	}

	@Override
	public synchronized void saveOwnerSession(String token, String email) {
		sessions.put(token, email);
	}

	@Override
	public synchronized List<Long> productIds() {
		return new ArrayList<>(products.keySet());
	}

	@Override
	public synchronized List<Product> products() {
		return new ArrayList<>(products.values());
	}

	@Override
	public synchronized Product product(long id) {
		return products.get(id);
	}

	@Override
	public synchronized long highestId() {
		return products.isEmpty() ? 0 : ((TreeMap<Long, Product>) products).lastKey();
	}

	@Override
	public synchronized void insert(Product product) {
		if (products.containsKey(product.id())) throw new DuplicateKeyException("id " + product.id() + " is taken");
		products.put(product.id(), product);
	}

	@Override
	public synchronized boolean delete(long id) {
		return products.remove(id) != null;
	}
}
