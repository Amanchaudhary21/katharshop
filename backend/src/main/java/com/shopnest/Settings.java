package com.shopnest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The server's settings. They come from the .env file in the main folder (see .env.example),
 * or from Windows environment variables with the same names.
 */
@Component
public class Settings {
	/** Only these Google accounts may add and delete products (OWNER_EMAILS, with a comma between them) */
	public final List<String> ownerEmails;
	/** The password the owner types once on the Sell page ("Connect"). Empty OWNER_PASSWORD: a new one at every start. */
	public final String ownerPassword;
	/** Other web addresses that may call the API. The live site (GitHub Pages) reaches this server through the ngrok link. */
	public final List<String> corsOrigins;
	/** The store's own files: index.html, css/, js/ ... */
	public final Path publicDir;

	public Settings(@Value("${OWNER_EMAILS:amanecdy@gmail.com}") String ownerEmails,
			@Value("${OWNER_PASSWORD:}") String ownerPassword,
			@Value("${CORS_ORIGINS:https://amanchaudhary21.github.io}") String corsOrigins,
			@Value("${PUBLIC_DIR:}") String publicDir) {
		this.ownerEmails = list(ownerEmails).stream().map(s -> s.toLowerCase(Locale.ROOT)).toList();
		if (ownerPassword.isEmpty()) {
			byte[] bytes = new byte[9];
			new SecureRandom().nextBytes(bytes);
			ownerPassword = HexFormat.of().formatHex(bytes);
			System.out.println("No OWNER_PASSWORD in .env. Owner password for this run: " + ownerPassword);
		}
		this.ownerPassword = ownerPassword;
		this.corsOrigins = list(corsOrigins);
		this.publicDir = findPublicDir(publicDir);
	}

	/** Is this one of the owner's emails? Capital letters and spaces around it don't matter. */
	public boolean isOwnerEmail(String email) {
		return email != null && ownerEmails.contains(email.trim().toLowerCase(Locale.ROOT));
	}

	/** "a, b,,c" -> [a, b, c] */
	private static List<String> list(String text) {
		return Arrays.stream(text.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
	}

	/** The public folder: PUBLIC_DIR if set, otherwise next to the backend folder (the server runs inside backend/) */
	private static Path findPublicDir(String setting) {
		if (!setting.isEmpty()) return Path.of(setting).toAbsolutePath().normalize();
		for (String place : List.of("../public", "public")) {
			Path p = Path.of(place).toAbsolutePath().normalize();
			if (Files.isRegularFile(p.resolve("index.html"))) return p;
		}
		throw new IllegalStateException("Can't find the store's files (public/index.html). Start the server with start.bat.");
	}
}
