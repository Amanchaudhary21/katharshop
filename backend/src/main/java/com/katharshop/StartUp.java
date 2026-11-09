package com.katharshop;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * When the server has started: connect to MySQL (and make the tables if they are missing),
 * say where the store runs, open the ngrok link, and open the store in the browser.
 */
@Component
public class StartUp {
	private final ShopStore store;
	private final NgrokLink ngrok;
	private final Environment env;
	private final String dbName;
	private final boolean openBrowser;
	private volatile boolean databaseReady = false;

	public StartUp(ShopStore store, NgrokLink ngrok, Environment env, @Value("${DB_NAME:shopnest}") String dbName,
			@Value("${OPEN_BROWSER:false}") boolean openBrowser) {
		this.store = store;
		this.ngrok = ngrok;
		this.env = env;
		this.dbName = dbName;
		this.openBrowser = openBrowser;
	}

	@EventListener(ApplicationReadyEvent.class)
	public void start() {
		connectDatabase();
		int port = env.getProperty("local.server.port", Integer.class, 8080);
		String url = "http://localhost:" + port;
		System.out.println("Katharshop is running at " + url + "  (close this window to stop)");
		ngrok.open(port);
		if (openBrowser) openInBrowser(url);
	}

	/** false until MySQL is connected; the API answers 503 until then (ApiFilter) */
	public boolean databaseReady() {
		return databaseReady;
	}

	/** for the tests */
	void setDatabaseReady(boolean ready) {
		databaseReady = ready;
	}

	private void connectDatabase() {
		try {
			if (!dbName.matches("[A-Za-z0-9_]+")) throw new IllegalArgumentException("DB_NAME may only use letters, numbers and _");
			store.setUp();
			databaseReady = true;
			System.out.println("Connected to MySQL (database \"" + dbName + "\").");
		} catch (RuntimeException e) {
			Throwable cause = e;
			while (cause.getCause() != null) cause = cause.getCause();
			System.err.println("\nCould not connect to MySQL: " + cause.getMessage() + "\n"
					+ "The store still opens, but adding and deleting products for everyone is off.\n"
					+ "Check that MySQL is running and that DB_USER / DB_PASSWORD in .env are right, then restart.\n");
		}
	}

	/** start.bat sets OPEN_BROWSER=1, so the store opens as soon as the server is ready */
	private static void openInBrowser(String url) {
		try {
			if (System.getProperty("os.name").startsWith("Windows")) new ProcessBuilder("cmd", "/c", "start", "", url).start();
			else new ProcessBuilder("open", url).start();
		} catch (Exception e) {
			System.out.println("Open " + url + " in your browser.");
		}
	}
}
