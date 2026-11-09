package com.shopnest;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The department ids (electronics, fashion, ...), read from the store's own list CATS in
 * public/js/core/data.js, so there is only one list to edit. The API accepts new products
 * only in these departments.
 */
public final class Departments {
	private static final Pattern LIST = Pattern.compile("const CATS = \\[(.*?)\\];", Pattern.DOTALL);
	private static final Pattern ID = Pattern.compile("\\{\\s*id:\\s*\"([^\"]+)\"");

	private Departments() {
	}

	public static List<String> readFrom(Path publicDir) {
		Path file = publicDir.resolve("js/core/data.js");
		String js;
		try {
			js = Files.readString(file);
		} catch (IOException e) {
			throw new UncheckedIOException("Can't read the departments from " + file, e);
		}
		Matcher list = LIST.matcher(js);
		if (!list.find()) throw new IllegalStateException("No department list (const CATS = [...]) in " + file);
		List<String> ids = ID.matcher(list.group(1)).results().map(m -> m.group(1)).toList();
		if (ids.isEmpty()) throw new IllegalStateException("The department list in " + file + " is empty");
		return ids;
	}
}
