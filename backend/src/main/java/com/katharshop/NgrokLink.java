package com.katharshop;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;

/**
 * The ngrok link: a fixed https address on the internet that leads to this computer, so your phone
 * and the live site reach this server (and its MySQL products).
 * Needs the free ngrok program (install it once:  winget install ngrok.ngrok) and NGROK_AUTHTOKEN and
 * NGROK_DOMAIN in .env (free account at https://ngrok.com). Without NGROK_AUTHTOKEN, nothing happens.
 */
@Component
public class NgrokLink {
	private static final Pattern STARTED = Pattern.compile("started tunnel.*\\burl=(https://\\S+)");

	private final String authtoken, domain;
	private final Path dataJs;
	private Process process;
	private volatile boolean stopping = false;

	public NgrokLink(@Value("${NGROK_AUTHTOKEN:}") String authtoken, @Value("${NGROK_DOMAIN:}") String domain, Settings settings) {
		this.authtoken = authtoken.trim();
		this.domain = domain.trim().replaceFirst("^https?://", "").replaceFirst("/+$", "");
		this.dataJs = settings.publicDir.resolve("js/core/data.js");
	}

	/** Starts the ngrok program, which forwards the link to this server's port */
	public void open(int port) {
		if (authtoken.isEmpty()) return;
		List<String> command = new ArrayList<>(List.of("ngrok", "http", "127.0.0.1:" + port, "--log", "stdout"));
		if (!domain.isEmpty()) command.add("--url=" + domain);
		ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true);
		builder.environment().put("NGROK_AUTHTOKEN", authtoken);
		try {
			process = builder.start();
		} catch (IOException e) {
			System.err.println("\nThe ngrok program is not installed yet. Install it once with:  winget install ngrok.ngrok\n"
					+ "then close this window and start again. The store still works on this computer.\n");
			return;
		}
		Thread watcher = new Thread(() -> watch(process), "ngrok");
		watcher.setDaemon(true);
		watcher.start();
	}

	/** Reads what ngrok says: prints the link once it is open, or the problem if ngrok stops */
	private void watch(Process p) {
		List<String> last = new ArrayList<>();
		try (BufferedReader out = p.inputReader()) {
			for (String line; (line = out.readLine()) != null;) {
				String url = publicUrl(line);
				if (url != null) {
					System.out.println("Other devices reach this shop server at " + url);
					tipForTheLiveSite(url);
				}
				last.add(line);
				if (last.size() > 4) last.remove(0);
			}
		} catch (IOException e) {
			// the program was closed
		}
		if (!stopping) System.err.println("\nCould not open the ngrok link. ngrok said:\n  " + String.join("\n  ", last) + "\n"
				+ "Check NGROK_AUTHTOKEN and NGROK_DOMAIN in .env, and that no other computer is running the same link.\n"
				+ "The store still works on this computer.\n");
	}

	/** The link in ngrok's "started tunnel ... url=https://..." line, or null for other lines */
	static String publicUrl(String logLine) {
		Matcher m = STARTED.matcher(logLine);
		return m.find() ? m.group(1) : null;
	}

	/** The live site must know this address (SHOP_SERVER in public/js/core/data.js) */
	private void tipForTheLiveSite(String url) {
		try {
			Matcher m = Pattern.compile("const SHOP_SERVER = \"([^\"]*)\"").matcher(Files.readString(dataJs));
			if (m.find() && !m.group(1).equals(url)) System.out.println("Tip: put \"" + url
					+ "\" as SHOP_SERVER in public/js/core/data.js and push to GitHub, so the live site uses this server.");
		} catch (IOException e) {
			// only a tip
		}
	}

	@PreDestroy
	public void close() {
		stopping = true;
		if (process != null) process.destroy();
	}
}
