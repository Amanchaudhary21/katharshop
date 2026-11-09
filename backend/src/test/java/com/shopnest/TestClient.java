package com.shopnest;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.List;
import java.util.Map;

/** Calls the test server over HTTP, the way the store's JavaScript does */
class TestClient {
	/** The server's answer. body: the JSON as Map/List, or the text when it is not JSON. */
	record Answer(int status, Object body, HttpHeaders headers) {
		@SuppressWarnings("unchecked")
		Map<String, Object> json() {
			return (Map<String, Object>) body;
		}

		@SuppressWarnings("unchecked")
		List<Object> list() {
			return (List<Object>) body;
		}

		String error() {
			return (String) json().get("error");
		}

		String header(String name) {
			return headers.firstValue(name).orElse(null);
		}
	}

	private final HttpClient http = HttpClient.newHttpClient();
	private final String base;

	TestClient(int port) {
		this.base = "http://127.0.0.1:" + port;
	}

	/** body: a Map (sent as JSON), a String (sent as it is) or null. headers: name, value, name, value ... */
	Answer call(String method, String path, Object body, String... headers) throws Exception {
		HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(base + path)).header("Content-Type", "application/json");
		for (int i = 0; i < headers.length; i += 2) request.header(headers[i], headers[i + 1]);
		String text = body == null ? null : body instanceof String s ? s : Json.write(body);
		request.method(method, text == null ? BodyPublishers.noBody() : BodyPublishers.ofString(text));
		HttpResponse<String> response = http.send(request.build(), BodyHandlers.ofString());
		boolean isJson = response.headers().firstValue("Content-Type").orElse("").contains("json") && !response.body().isEmpty();
		return new Answer(response.statusCode(), isJson ? Json.read(response.body()) : response.body(), response.headers());
	}

	Answer get(String path, String... headers) throws Exception {
		return call("GET", path, null, headers);
	}

	/** Signs in as the owner and gives the "Authorization" header for adding and deleting */
	String[] owner(String email, String password) throws Exception {
		Answer a = call("POST", "/api/owner/login", Map.of("email", email, "password", password));
		if (a.status() != 200) throw new AssertionError("owner sign-in failed: " + a.status() + " " + a.body());
		return new String[] { "Authorization", "Bearer " + a.json().get("token") };
	}
}
