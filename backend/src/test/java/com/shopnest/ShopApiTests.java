package com.shopnest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import com.shopnest.TestClient.Answer;

/**
 * Unit tests for the shop API's rules: the real server, but with a pretend database in memory
 * (FakeStore), so they run on any computer.  Run:  mvnw test
 * MySqlTests checks the same server with the real MySQL.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"OWNER_PASSWORD=unit-owner-pass", "OWNER_EMAILS=owner@example.com",
		"CORS_ORIGINS=https://amanchaudhary21.github.io", "NGROK_AUTHTOKEN=", "OPEN_BROWSER=false" })
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ShopApiTests {
	static final String PHOTO = "data:image/jpeg;base64,AAAA";

	@TestConfiguration
	static class UseFakeStore {
		@Bean
		@Primary
		FakeStore fakeStore() {
			return new FakeStore();
		}
	}

	@Autowired
	FakeStore fake;
	@Autowired
	StartUp startUp;
	@Value("${local.server.port}")
	int port;
	TestClient client;

	@BeforeEach
	void emptyShop() {
		client = new TestClient(port);
		fake.products.clear();
	}

	String[] asOwner() throws Exception {
		return client.owner("Owner@Example.com ", "unit-owner-pass");
	}

	static Map<String, Object> vase(Object... changes) {
		Map<String, Object> v = new HashMap<>(Map.of("cat", "home", "title", "Clay Vase", "price", 19.5, "stock", 4, "photo", PHOTO));
		for (int i = 0; i < changes.length; i += 2) v.put((String) changes[i], changes[i + 1]); // a null value takes the field out
		v.values().removeIf(x -> x == null);
		return v;
	}

	@Test
	void theApiAcceptsExactlyTheStoresDepartments() {
		assertEquals(List.of("electronics", "fashion", "home", "books", "sports", "beauty", "toys", "grocery"),
				Departments.readFrom(java.nio.file.Path.of("../public")));
	}

	@Test
	void withoutMySqlTheApiSaysSoAndTheStoreStillOpens() throws Exception {
		startUp.setDatabaseReady(false);
		try {
			Answer a = client.get("/api/products/state");
			assertEquals(503, a.status());
			assertTrue(a.error().contains("database is not connected"));
			Answer page = client.get("/");
			assertEquals(200, page.status());
			assertTrue(((String) page.body()).contains("<title>ShopNest</title>"));
		} finally {
			startUp.setDatabaseReady(true);
		}
	}

	@Test
	void theOwnerEmailInAnyCaseWithTheRightPasswordGivesAToken() throws Exception {
		Answer ok = client.call("POST", "/api/owner/login", Map.of("email", "  OWNER@example.com", "password", "unit-owner-pass"));
		assertEquals(200, ok.status());
		String token = (String) ok.json().get("token");
		assertTrue(token.matches("[0-9a-f]{64}"), token);
		assertEquals("owner@example.com", fake.sessions.get(token));
		assertEquals(401, client.call("POST", "/api/owner/login", Map.of("email", "owner@example.com", "password", "nope")).status());
		assertEquals(401, client.call("POST", "/api/owner/login", Map.of("email", "someone@example.com", "password", "unit-owner-pass")).status());
		assertEquals(401, client.call("POST", "/api/owner/login", Map.of()).status());
	}

	@Test
	void addingOrDeletingNeedsATokenTheServerGaveOutSentAsBearer() throws Exception {
		String token = asOwner()[1].substring(7);
		assertEquals(401, client.call("POST", "/api/products", vase()).status());
		assertEquals(401, client.call("POST", "/api/products", vase(), "Authorization", token).status()); // no "Bearer "
		assertEquals(401, client.call("POST", "/api/products", vase(), "Authorization", "Bearer " + "0".repeat(64)).status());
		assertEquals(401, client.call("DELETE", "/api/products/1001", null, "Authorization", "Bearer made-up").status());
		assertTrue(fake.products.isEmpty());
	}

	@Test
	void aNewProductIsTidied() throws Exception {
		List<Object> points = new ArrayList<>(List.of(" Made by hand ", "", "   ", 42));
		for (int i = 0; i < 12; i++) points.add("Point " + i);
		Answer r = client.call("POST", "/api/products",
				vase("title", "  Clay Vase  ", "price", 12.626338, "was", 20.123456, "bullets", points), asOwner());
		assertEquals(201, r.status());
		Map<String, Object> p = r.json();
		assertEquals("Clay Vase", p.get("title"));
		assertEquals(12.6263, p.get("price"));
		assertEquals(20.1235, p.get("was"));
		List<?> bullets = (List<?>) p.get("bullets");
		assertEquals(10, bullets.size());
		assertEquals("Made by hand", bullets.get(0));
		assertEquals(List.of(List.of("Seller", "ShopNest")), p.get("specs")); // no seller name sent
		assertEquals(1, p.get("age"));
		assertEquals("box", p.get("art"));
		assertEquals(List.of(Map.of("name", "Default", "hex", "#8A9BA8")), p.get("colors"));
		assertTrue(((String) p.get("created")).matches("\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\d\\.\\d{3}Z"));
	}

	@Test
	void noPointsMeansAddedByTheOwnerAndALongSellerNameIsCut() throws Exception {
		Map<String, Object> p = client.call("POST", "/api/products", vase("bullets", List.of(), "seller", "  " + "S".repeat(80) + " "), asOwner()).json();
		assertEquals(List.of("Added by the shop owner"), p.get("bullets"));
		assertEquals("S".repeat(60), ((List<?>) ((List<?>) p.get("specs")).get(0)).get(1));
	}

	@Test
	void ownerProductsGetIdsFrom1001EachAfterTheHighest() throws Exception {
		String[] owner = asOwner();
		Object a = client.call("POST", "/api/products", vase(), owner).json().get("id");
		Object b = client.call("POST", "/api/products", vase(), owner).json().get("id");
		assertEquals(List.of(1001, 1002), List.of(a, b));
		assertEquals(Map.of("added", List.of(1001, 1002)), client.get("/api/products/state").json());
		assertEquals(Map.of("deleted", 1001), client.call("DELETE", "/api/products/1001", null, owner).json());
		assertEquals(1003, client.call("POST", "/api/products", vase(), owner).json().get("id"));
		assertEquals(List.of(1002, 1003), client.get("/api/products/added").list().stream().map(x -> ((Map<?, ?>) x).get("id")).toList());
	}

	@Test
	void badProductsAreRefusedWithAReason() throws Exception {
		String[] owner = asOwner();
		Object[][] bad = {
				{ vase("title", "ab"), "3 to 90" }, { vase("title", "x".repeat(91)), "3 to 90" }, { vase("title", 123), "3 to 90" },
				{ vase("cat", "cars"), "department" }, { vase("cat", null), "department" },
				{ vase("price", 0), "above 0" }, { vase("price", -5), "above 0" }, { vase("price", "abc"), "above 0" },
				{ vase("price", 1_000_001), "above 0" },
				{ vase("was", 10), "old price" }, { vase("was", 19.5), "old price" },
				{ vase("stock", 1.5), "stock" }, { vase("stock", -1), "stock" }, { vase("stock", null), "stock" },
				{ vase("photo", "https://example.com/a.jpg"), "photo" }, { vase("photo", "data:text/html,hi"), "photo" },
				{ vase("photo", "data:image/jpeg;base64," + "A".repeat(1_500_000)), "photo" },
				{ vase("bullets", List.of("x".repeat(601))), "600" } };
		for (Object[] test : bad) {
			Answer r = client.call("POST", "/api/products", test[0], owner);
			String what = Json.write(test[0]);
			assertEquals(400, r.status(), what.substring(0, Math.min(80, what.length())));
			assertTrue(r.error().contains((String) test[1]), r.error());
		}
		assertTrue(fake.products.isEmpty());
	}

	@Test
	void brokenJsonTooBigBadIdAndUnknownAddressesGetClearErrors() throws Exception {
		String[] owner = asOwner();
		Answer broken = client.call("POST", "/api/products", "{not json", owner);
		assertEquals(400, broken.status());
		assertEquals("Bad JSON.", broken.error());
		assertEquals(413, client.call("POST", "/api/products", vase("photo", "data:image/jpeg;base64," + "A".repeat(2_200_000)), owner).status());
		assertEquals(400, client.call("DELETE", "/api/products/abc", null, owner).status());
		assertEquals("No product 4242", client.call("DELETE", "/api/products/4242", null, owner).error());
		Answer unknown = client.get("/api/no/such/address");
		assertEquals(404, unknown.status());
		assertEquals("Not found", unknown.error());
		assertEquals(404, client.call("POST", "/api/products/restore", null, owner).status()); // the old restore address is gone
	}

	@Test
	void apiAnswersAreNeverCachedAndTheLiveSiteMayCallTheApi() throws Exception {
		Answer fromLiveSite = client.get("/api/products/state", "Origin", "https://amanchaudhary21.github.io");
		assertEquals("no-store", fromLiveSite.header("Cache-Control"));
		assertEquals("https://amanchaudhary21.github.io", fromLiveSite.header("Access-Control-Allow-Origin"));
		assertNull(client.get("/api/products/state", "Origin", "https://evil.example").header("Access-Control-Allow-Origin"));
		Answer ask = client.call("OPTIONS", "/api/products", null, "Origin", "https://amanchaudhary21.github.io", "Access-Control-Request-Method", "POST");
		assertEquals(204, ask.status());
		assertTrue(ask.header("Access-Control-Allow-Headers").contains("ngrok-skip-browser-warning"));
	}

	@Test
	void theStoresOwnFilesAreShownAndNeverCached() throws Exception {
		Answer home = client.get("/");
		assertEquals(200, home.status());
		assertEquals("no-store", home.header("Cache-Control"));
		assertTrue(home.header("Content-Type").startsWith("text/html"));
		assertTrue(client.get("/js/core/data.js").header("Content-Type").contains("javascript"));
		assertEquals("application/manifest+json", client.get("/manifest.webmanifest").header("Content-Type"));
		assertEquals("image/png", client.get("/img/app/icon-192.png").header("Content-Type"));
		assertEquals(404, client.get("/no-such-file.html").status());
	}

	/** Each address has its own count; ngrok passes on the visitor's real address in X-Forwarded-For */
	@Test
	@Order(100)
	void after10WrongPasswordsFromOneAddressSignInWaits15Minutes() throws Exception {
		for (int i = 0; i < 10; i++) assertEquals(401, client.call("POST", "/api/owner/login",
				Map.of("email", "owner@example.com", "password", "guess" + i), "X-Forwarded-For", "203.0.113.7").status());
		Answer locked = client.call("POST", "/api/owner/login", Map.of("email", "owner@example.com", "password", "unit-owner-pass"),
				"X-Forwarded-For", "203.0.113.7");
		assertEquals(429, locked.status());
		assertTrue(locked.error().contains("Wait 15 minutes"));
		assertEquals(200, client.call("POST", "/api/owner/login", Map.of("email", "owner@example.com", "password", "unit-owner-pass"),
				"X-Forwarded-For", "198.51.100.9").status());
	}
}
