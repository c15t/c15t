package com.c15t.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The declared vendor scope, from manifest text to vendor ids.
 *
 * This is the Android spelling of the web provider's `iab.vendors`, and a host types
 * it into an `AndroidManifest.xml` by hand or receives it from the Expo plugin. The
 * rules worth pinning are the ones the iOS plist reader follows too: spaces around an
 * id are decoration, an entry that is not a positive whole number is dropped rather
 * than trusted, repeats collapse, and a list that survives none of that is not a
 * declaration at all.
 *
 * A wrong answer here is a disclosure bug rather than a cosmetic one. A `null` that
 * should have been a list shows every vendor the backend served to a subject whose
 * app named three partners; a list that should have been a `null` empties a drawer
 * the subject is being asked to consent to. Both cores read this the same way on
 * purpose, so the cases below mirror `C15tBridgeLifecycleTests` on iOS id for id.
 *
 * The raw value, not a `Bundle`, is the unit under test: a `Bundle` on the JVM is the
 * stub `android.jar`, and [C15tManifestValue.string] already owns the
 * whatever-type-the-parser-chose half of the read.
 */
class DeclaredVendorsTest {
	@Test
	fun `a comma list parses in declared order with the spaces trimmed`() {
		assertEquals(
			listOf(755, 42, 8),
			C15tAndroid.declaredVendors("755, 42,8, 42"),
		)
	}

	@Test
	fun `an entry that is not a positive whole number is dropped rather than trusted`() {
		// "vendor-42" and "0" are the typos this exists for: trusting either would name a
		// disclosure the framework never assigned, or none at all.
		assertEquals(
			listOf(42, 8),
			C15tAndroid.declaredVendors("42, vendor-42, 0, -3, 7.5, 8"),
		)
	}

	@Test
	fun `a single id is a declaration and not a parse error`() {
		assertEquals(listOf(42), C15tAndroid.declaredVendors("42"))
	}

	@Test
	fun `a bare number reaches the same list as its text spelling`() {
		// An unquoted manifest `1` arrives as a Long, not a String, which is why every
		// key here goes through C15tManifestValue rather than getString.
		assertEquals(listOf(42), C15tAndroid.declaredVendors(42L))
	}

	@Test
	fun `an id the served list does not carry stays in the declaration`() {
		// Pruning a served document never adds an entry to satisfy a scope, so an
		// out-of-range or publisher-custom id is simply an id nobody is ever shown.
		assertEquals(listOf(999_999, 42), C15tAndroid.declaredVendors("999999,42"))
	}

	@Test
	fun `nothing usable stays absent, which is every served vendor`() {
		// Absent and "an empty list" answer the same question the same way at the core,
		// but they arrive here differently, and each is its own way a host can mean "I
		// did not declare a scope".
		assertNull(C15tAndroid.declaredVendors(null))
		assertNull(C15tAndroid.declaredVendors(""))
		assertNull(C15tAndroid.declaredVendors("   "))
		assertNull(C15tAndroid.declaredVendors(" , , "))
		assertNull(C15tAndroid.declaredVendors("vendor, google"))
	}
}
