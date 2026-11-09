package com.shopnest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.core.JacksonException;

/**
 * The shop's API. The store's JavaScript (public/js) calls these addresses:
 *
 *   POST   /api/owner/login      owner email + owner password -> token (the "Connect" box on the Sell page)
 *   GET    /api/products/state   {"added": [ids]}  the ids of all products; every shopper checks this every 30 s
 *   GET    /api/products/added   all products, with photos
 *   POST   /api/products         owner: add a product (saved in MySQL with the date it was added)
 *   DELETE /api/products/{id}    owner: delete a product (its row is removed from MySQL)
 *
 * Every answer is JSON. A problem is answered like {"error": "Enter a price above 0."}.
 * (ApiFilter runs first: it lets the live site call the API, and answers 503 without MySQL.)
 */
@RestController
@RequestMapping("/api")
public class ShopApi {
	static final int MAX_BODY = 2 * 1024 * 1024;  // 2 MB
	static final int MAX_PHOTO = 1_500_000;       // a data: address; the Sell page shrinks photos to 600 px (about 100 KB)
	private static final SecureRandom RANDOM = new SecureRandom();
	private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

	private final ShopStore store;
	private final Settings settings;
	private final List<String> departments;

	public ShopApi(ShopStore store, Settings settings) {
		this.store = store;
		this.settings = settings;
		this.departments = Departments.readFrom(settings.publicDir);
	}

	/* ---------- owner sign-in ---------- */

	/* Slow down password guessing (the server can be reached from the internet through ngrok):
	   after 10 wrong passwords from one address, that address waits 15 minutes */
	private static final int LOCK_AFTER = 10;
	private static final long LOCK_MS = 15 * 60 * 1000;
	private record Misses(int count, long first) {
	}
	private final Map<String, Misses> misses = new HashMap<>(); // address -> wrong passwords

	@PostMapping("/owner/login")
	public Map<String, String> login(HttpServletRequest request) throws IOException {
		String ip = request.getRemoteAddr();
		long now = System.currentTimeMillis();
		if (tooManyMisses(ip, now)) throw new ApiError(429, "Too many wrong passwords. Wait 15 minutes, then try again.");
		Map<String, Object> b = body(request);
		Object email = b.get("email"), password = b.get("password");
		if (!(email instanceof String mail) || !settings.isOwnerEmail(mail)
				|| !sameText(password == null ? "" : String.valueOf(password), settings.ownerPassword)) {
			addMiss(ip, now);
			throw new ApiError(401, "Wrong owner email or password.");
		}
		clearMisses(ip);
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		String token = HexFormat.of().formatHex(bytes);
		store.saveOwnerSession(token, mail.trim().toLowerCase(Locale.ROOT));
		return Map.of("token", token);
	}

	private synchronized boolean tooManyMisses(String ip, long now) {
		if (misses.size() > 1000) misses.values().removeIf(m -> now - m.first() > LOCK_MS);
		Misses m = misses.get(ip);
		if (m != null && now - m.first() > LOCK_MS) {
			misses.remove(ip);
			m = null;
		}
		return m != null && m.count() >= LOCK_AFTER;
	}

	private synchronized void addMiss(String ip, long now) {
		misses.merge(ip, new Misses(1, now), (old, one) -> new Misses(old.count() + 1, old.first()));
	}

	private synchronized void clearMisses(String ip) {
		misses.remove(ip);
	}

	/** Compares the hashes, which takes the same time either way, so the password can't be guessed from timing */
	private static boolean sameText(String a, String b) {
		try {
			MessageDigest sha = MessageDigest.getInstance("SHA-256");
			byte[] x = sha.digest(a.getBytes(StandardCharsets.UTF_8)), y = sha.digest(b.getBytes(StandardCharsets.UTF_8));
			return MessageDigest.isEqual(x, y);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

	/** Adding and deleting: only with a token from /api/owner/login, sent as "Authorization: Bearer <token>" */
	private void requireOwner(String authorization) {
		String token = authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7) : "";
		if (!token.isEmpty()) {
			String email = store.ownerEmailFor(token);
			if (email != null && settings.isOwnerEmail(email)) return;
		}
		throw new ApiError(401, "Connect to the shop server as the owner first.");
	}

	/* ---------- products ---------- */

	@GetMapping("/products/state")
	public Map<String, Object> state() {
		return Map.of("added", store.productIds());
	}

	@GetMapping("/products/added")
	public List<Map<String, Object>> added() {
		return store.products().stream().map(ShopApi::toJson).toList();
	}

	/** "Save item to the shop" on the Sell page */
	@PostMapping("/products")
	public ResponseEntity<Map<String, Object>> add(@RequestHeader(value = "Authorization", required = false) String authorization,
			HttpServletRequest request) throws IOException {
		requireOwner(authorization);
		Map<String, Object> b = body(request);
		String title = b.get("title") instanceof String s ? s.strip() : "";
		String photo = b.get("photo") instanceof String s ? s : "";
		double price = number(b.get("price")), was = number(b.get("was")), stock = number(b.get("stock"));
		if (Double.isNaN(was)) was = 0;
		List<String> bullets = b.get("bullets") instanceof List<?> list
				? list.stream().filter(x -> x instanceof String s && !s.isBlank()).map(x -> ((String) x).strip()).limit(10).toList()
				: List.of();
		if (title.length() < 3 || title.length() > 90) throw new ApiError(400, "The name must be 3 to 90 letters.");
		if (!departments.contains(b.get("cat"))) throw new ApiError(400, "Unknown department.");
		if (!(price > 0) || price > 1_000_000) throw new ApiError(400, "Enter a price above 0.");
		if (was != 0 && !(was > price && was <= 1_000_000)) throw new ApiError(400, "The old price must be higher than the price.");
		if (!(stock >= 0 && stock <= 1_000_000 && stock == Math.floor(stock))) throw new ApiError(400, "Enter a stock of 0 or more.");
		if (!photo.startsWith("data:image/") || photo.length() > MAX_PHOTO) throw new ApiError(400, "Add a photo (JPG or PNG, up to about 1 MB).");
		if (bullets.stream().anyMatch(x -> x.length() > 600)) throw new ApiError(400, "Each point can have up to 600 letters.");
		String seller = b.get("seller") instanceof String s && !s.isBlank() ? s.strip() : "ShopNest";
		if (seller.length() > 60) seller = seller.substring(0, 60);

		Product product = new Product(0, (String) b.get("cat"), "box", title, round4(price), round4(was), 0, 0, (int) stock,
				List.of(Map.of("name", "Default", "hex", "#8A9BA8")), bullets.isEmpty() ? List.of("Added by the shop owner") : bullets,
				List.of(List.of("Seller", seller)), "", photo, Instant.now().truncatedTo(ChronoUnit.MILLIS));
		long id;
		for (int tries = 0; ; tries++) { // a new id after the highest one (owner products start at 1001)
			id = Math.max(1000, store.highestId()) + 1;
			try {
				store.insert(product.withId(id));
				break;
			} catch (DuplicateKeyException e) { // someone else saved one at the same moment: try the next id
				if (tries > 3) throw e;
			}
		}
		return ResponseEntity.status(201).body(toJson(store.product(id)));
	}

	@DeleteMapping("/products/{id}")
	public Map<String, Object> delete(@RequestHeader(value = "Authorization", required = false) String authorization,
			@PathVariable String id) {
		requireOwner(authorization);
		long number;
		try {
			number = Long.parseLong(id);
		} catch (NumberFormatException e) {
			throw new ApiError(400, "Bad product id.");
		}
		if (!store.delete(number)) throw new ApiError(404, "No product " + number);
		return Map.of("deleted", number);
	}

	/** Any other /api address */
	@RequestMapping("/**")
	public void notFound() {
		throw new ApiError(404, "Not found");
	}

	/** A product as the store's JavaScript wants it (see fromServer() in public/js/core/core.js) */
	static Map<String, Object> toJson(Product p) {
		Map<String, Object> j = new LinkedHashMap<>();
		j.put("id", p.id());
		j.put("cat", p.cat());
		j.put("art", p.art());
		j.put("title", p.title());
		j.put("price", p.price());
		j.put("was", p.was());
		j.put("rating", p.rating());
		j.put("n", p.n());
		j.put("stock", p.stock());
		j.put("colors", p.colors());
		j.put("bullets", p.bullets());
		j.put("specs", p.specs());
		j.put("kw", p.kw());
		j.put("age", 1 + Math.max(0, Duration.between(p.created(), Instant.now()).toDays())); // days since it was added
		j.put("photo", p.photo());
		j.put("created", ISO.format(p.created()));
		return j;
	}

	/* ---------- small helpers ---------- */

	/** The request's JSON, like {"title": "Clay vase", ...}. Nothing sent: empty. Over 2 MB: 413. Not JSON: 400. */
	private static Map<String, Object> body(HttpServletRequest request) throws IOException {
		byte[] bytes = request.getInputStream().readNBytes(MAX_BODY + 1);
		if (bytes.length > MAX_BODY) throw new ApiError(413, "That is too big. Try a smaller photo.");
		if (bytes.length == 0) return Map.of();
		Object json;
		try {
			json = Json.read(bytes);
		} catch (JacksonException e) {
			throw new ApiError(400, "Bad JSON.");
		}
		@SuppressWarnings("unchecked")
		Map<String, Object> map = json instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
		return map;
	}

	/** A JSON value as a number: 19.5 or "19.5" -> 19.5. Anything else (text, nothing) -> NaN ("not a number"). */
	private static double number(Object value) {
		if (value instanceof Number n) return n.doubleValue();
		if (value instanceof String s && !s.isBlank()) {
			try {
				return Double.parseDouble(s.strip());
			} catch (NumberFormatException e) {
				return Double.NaN;
			}
		}
		return Double.NaN;
	}

	/** Prices are US dollars with 4 decimals, so rupee and yen prices typed on the Sell page convert back exactly */
	static double round4(double n) {
		return Math.round(n * 10000) / 10000.0;
	}

	/** A problem with the request: answered with this status and message */
	static class ApiError extends RuntimeException {
		final int status;

		ApiError(int status, String message) {
			super(message);
			this.status = status;
		}
	}

	@ExceptionHandler(ApiError.class)
	ResponseEntity<Map<String, String>> problem(ApiError e) {
		return ResponseEntity.status(e.status).body(Map.of("error", e.getMessage()));
	}

	@ExceptionHandler(Exception.class)
	ResponseEntity<Map<String, String>> crash(Exception e) {
		e.printStackTrace();
		return ResponseEntity.status(500).body(Map.of("error", "The server had a problem. See its window for details."));
	}

	/** The same {"error": ...} answer, for ApiFilter (it runs before the API) */
	static void sendError(HttpServletResponse response, int status, String message) throws IOException {
		response.setStatus(status);
		response.setContentType("application/json;charset=UTF-8");
		response.getWriter().write(Json.write(Map.of("error", message)));
	}
}
