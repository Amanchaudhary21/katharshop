package com.katharshop;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** JSON text <-> Java (Map, List, String, Number, Boolean), with the Jackson library */
final class Json {
	private static final JsonMapper MAPPER = JsonMapper.builder().build();

	private Json() {
	}

	/** JSON text -> Java objects. Throws JacksonException when it is not JSON. */
	@SuppressWarnings("unchecked")
	static <T> T read(String text) throws JacksonException {
		return (T) MAPPER.readValue(text, Object.class);
	}

	@SuppressWarnings("unchecked")
	static <T> T read(byte[] bytes) throws JacksonException {
		return (T) MAPPER.readValue(bytes, Object.class);
	}

	/** Java objects -> JSON text */
	static String write(Object value) {
		return MAPPER.writeValueAsString(value);
	}
}
