package com.katharshop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.katharshop.TestClient.Answer;

/**
 * Checks the shop server against the real MySQL server.  Run:  mvnw test
 * Uses a separate database "shopnest_test" (made and dropped by the test), never your real "shopnest".
 * The MySQL login comes from .env. When MySQL is not running, these tests are skipped.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"DB_NAME=shopnest_test", "OWNER_PASSWORD=test-owner-pass", "OWNER_EMAILS=amanecdy@gmail.com",
		"NGROK_AUTHTOKEN=", "OPEN_BROWSER=false" })
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class MySqlTests {
	static final String PHOTO = "data:image/jpeg;base64,AAAA";

	@Autowired
	JdbcTemplate db;
	@Autowired
	MySqlStore store;
	@Autowired
	StartUp startUp;
	@Value("${local.server.port}")
	int port;
	TestClient client;

	@BeforeAll
	void startClean() {
		assumeTrue(startUp.databaseReady(), "MySQL is not running, so the MySQL tests are skipped");
		String name = db.queryForObject("SELECT DATABASE()", String.class);
		assertTrue(name.endsWith("_test"), "tests must use a *_test database, not " + name);
		db.execute("DROP TABLE IF EXISTS products, owner_sessions");
		store.setUp();
	}

	@AfterAll
	void dropTestDatabase() {
		if (startUp.databaseReady()) db.execute("DROP DATABASE shopnest_test");
	}

	@BeforeEach
	void newClient() {
		client = new TestClient(port);
	}

	String[] asOwner() throws Exception {
		return client.owner(" AmanEcdy@gmail.com", "test-owner-pass");
	}

	static Map<String, Object> vase(Object... changes) {
		Map<String, Object> v = new HashMap<>(Map.of("cat", "home", "title", "  Handmade Clay Vase ", "price", 19.5, "was", 25,
				"stock", 4, "bullets", List.of("Made by hand", " "), "photo", PHOTO, "seller", "Aman"));
		for (int i = 0; i < changes.length; i += 2) v.put((String) changes[i], changes[i + 1]);
		return v;
	}

	@Test
	void theShopStartsEmpty() throws Exception {
		assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM products", Integer.class));
		assertEquals(Map.of("added", List.of()), client.get("/api/products/state").json());
		assertEquals(List.of(), client.get("/api/products/added").list());
	}

	@Test
	void onlyTheOwnerWithTheRightPasswordCanConnectAndTheTokenIsSaved() throws Exception {
		assertEquals(401, client.call("POST", "/api/owner/login", Map.of("email", "amanecdy@gmail.com", "password", "wrong")).status());
		assertEquals(401, client.call("POST", "/api/owner/login", Map.of("email", "someone@gmail.com", "password", "test-owner-pass")).status());
		String token = asOwner()[1].substring(7);
		assertEquals("amanecdy@gmail.com", db.queryForObject("SELECT email FROM owner_sessions WHERE token = ?", String.class, token));
	}

	@Test
	void shoppersCannotAddOrDelete() throws Exception {
		assertEquals(401, client.call("POST", "/api/products", vase()).status());
		assertEquals(401, client.call("DELETE", "/api/products/1001", null, "Authorization", "Bearer made-up").status());
	}

	@Test
	void anAddedProductIsSavedWithItsDateEveryShopperSeesItAndDeleteRemovesTheRow() throws Exception {
		String[] owner = asOwner();
		Answer r = client.call("POST", "/api/products", vase(), owner);
		assertEquals(201, r.status());
		Map<String, Object> p = r.json();
		long id = ((Number) p.get("id")).longValue();
		assertTrue(id > 1000);
		assertEquals("Handmade Clay Vase", p.get("title"));
		assertEquals(List.of("Made by hand"), p.get("bullets"));
		assertEquals(List.of(List.of("Seller", "Aman")), p.get("specs"));
		assertEquals(1, p.get("age"));

		Map<String, Object> row = db.queryForMap("SELECT title, price, created FROM products WHERE id = ?", id);
		assertEquals("Handmade Clay Vase", row.get("title"));
		assertEquals(0, new BigDecimal("19.5").compareTo((BigDecimal) row.get("price")));
		LocalDateTime created = db.queryForObject("SELECT created FROM products WHERE id = ?", LocalDateTime.class, id);
		assertTrue(Duration.between(created, LocalDateTime.now(ZoneOffset.UTC)).abs().toSeconds() < 60, "created is in UTC: " + created);

		assertTrue(((List<?>) client.get("/api/products/state").json().get("added")).contains((int) id));
		Map<?, ?> seen = (Map<?, ?>) client.get("/api/products/added").list().stream().filter(x -> ((Number) ((Map<?, ?>) x).get("id")).longValue() == id).findFirst().orElseThrow();
		assertEquals(PHOTO, seen.get("photo"));

		assertEquals(200, client.call("DELETE", "/api/products/" + id, null, owner).status());
		assertEquals(0, db.queryForObject("SELECT COUNT(*) FROM products WHERE id = ?", Integer.class, id));
		assertEquals(404, client.call("DELETE", "/api/products/" + id, null, owner).status());
	}

	@Test
	void everyShopperGetsAllProductsNewestIdLast() throws Exception {
		String[] owner = asOwner();
		Map<String, Object> a = client.call("POST", "/api/products", vase("title", "Blue Teapot"), owner).json();
		Map<String, Object> b = client.call("POST", "/api/products", vase("title", "Kids Football", "cat", "sports", "was", 0), owner).json();
		long idA = ((Number) a.get("id")).longValue(), idB = ((Number) b.get("id")).longValue();
		assertEquals(idA + 1, idB);
		assertEquals(List.of(List.of("Blue Teapot", "home"), List.of("Kids Football", "sports")), client.get("/api/products/added").list().stream()
				.map(x -> List.of(((Map<?, ?>) x).get("title"), ((Map<?, ?>) x).get("cat"))).toList());
		client.call("DELETE", "/api/products/" + idA, null, owner);
		client.call("DELETE", "/api/products/" + idB, null, owner);
	}

	@Test
	void pricesKeep4DecimalsSoAPriceTypedInRupeesConvertsBackExactly() throws Exception {
		// रू 1,999 at 150.58 rupees to the dollar = 13.27533... dollars -> saved as 13.2753 -> shown as रू 1,999 again
		Map<String, Object> p = client.call("POST", "/api/products", vase("price", 1999 / 150.58, "was", 0), asOwner()).json();
		assertEquals(13.2753, p.get("price"));
		assertEquals(1999, Math.round(13.2753 * 150.58));
		long id = ((Number) p.get("id")).longValue();
		assertEquals(0, new BigDecimal("13.2753").compareTo(db.queryForObject("SELECT price FROM products WHERE id = ?", BigDecimal.class, id)));
		client.call("DELETE", "/api/products/" + id, null, asOwner());
	}

	@Test
	void textInAnyLanguageQuotesAndEmojiComeBackFromMySqlUnchanged() throws Exception {
		List<String> points = List.of("手作りの花瓶", "हातले बनाएको", "He said \"wow\" \\ ok", "🌿 for plants");
		Map<String, Object> p = client.call("POST", "/api/products", vase("title", "花瓶 – Vase \"Nepal\"", "bullets", points, "seller", "アマン"), asOwner()).json();
		long id = ((Number) p.get("id")).longValue();
		Map<?, ?> back = (Map<?, ?>) client.get("/api/products/added").list().stream().filter(x -> ((Number) ((Map<?, ?>) x).get("id")).longValue() == id).findFirst().orElseThrow();
		assertEquals("花瓶 – Vase \"Nepal\"", back.get("title"));
		assertEquals(points, back.get("bullets"));
		assertEquals(List.of(List.of("Seller", "アマン")), back.get("specs"));
		client.call("DELETE", "/api/products/" + id, null, asOwner());
	}
}
