package com.katharshop;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

/** Unit tests for the small parts, without starting the server */
class SmallPartsTests {
	@Test
	void departmentsComeFromTheStoresDataJs() {
		assertEquals(List.of("electronics", "fashion", "home", "books", "sports", "beauty", "toys", "grocery"),
				Departments.readFrom(Path.of("../public")));
	}

	@Test
	void pricesAreRoundedTo4Decimals() {
		assertEquals(13.2753, ShopApi.round4(1999 / 150.58)); // रू 1,999 in dollars
		assertEquals(20.1235, ShopApi.round4(20.123456));
		assertEquals(19.5, ShopApi.round4(19.5));
	}

	@Test
	void ownerEmailsIgnoreCapitalLettersAndSpaces() {
		Settings s = new Settings(" AmanEcdy@gmail.com , ,second@example.com", "pass", "https://a.example, https://b.example", "../public");
		assertEquals(List.of("amanecdy@gmail.com", "second@example.com"), s.ownerEmails);
		assertEquals(List.of("https://a.example", "https://b.example"), s.corsOrigins);
		assertTrue(s.isOwnerEmail("  AMANECDY@gmail.com "));
		assertFalse(s.isOwnerEmail("someone@gmail.com"));
		assertFalse(s.isOwnerEmail(null));
	}

	@Test
	void withoutAnOwnerPasswordANewOneIsMadeAtEveryStart() {
		String a = new Settings("x@example.com", "", "", "../public").ownerPassword;
		String b = new Settings("x@example.com", "", "", "../public").ownerPassword;
		assertTrue(a.matches("[0-9a-f]{18}"), a);
		assertFalse(a.equals(b));
	}

	@Test
	void theNgrokLinkIsReadFromNgrosLog() {
		assertEquals("https://shop-name.ngrok-free.app", NgrokLink.publicUrl(
				"t=2026-11-09T11:00:00+0900 lvl=info msg=\"started tunnel\" obj=tunnels name=command_line addr=http://127.0.0.1:8080 url=https://shop-name.ngrok-free.app"));
		assertNull(NgrokLink.publicUrl("t=2026-11-09T11:00:00+0900 lvl=info msg=\"client session established\" obj=tunnels.session"));
	}
}
