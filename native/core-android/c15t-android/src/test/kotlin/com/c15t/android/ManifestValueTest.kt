package com.c15t.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The manifest read, over the types the parser actually produces.
 *
 * The manifest merger decides whether an `android:value` arrives as a `Boolean`, a
 * `Long`, or a `String`, and the app does not: the Expo config plugin writes a bare
 * `true`, a bare-app manifest edited by hand often quotes one, and a staged-build
 * switch typed as `1` is a switch that was meant on. A reader pinned to one of those
 * types answers "not declared" to the others, and the flag it drops is the one that
 * forces GPC on for a review build, where the whole point is the signal being sent.
 *
 * This runs over the raw bundle values because a `Bundle` on the JVM is the stub
 * `android.jar`, which returns defaults for everything; the interpretation rule is the
 * part worth pinning, so it lives where a test can reach it.
 */
class ManifestValueTest {
	/** The rule this replaces: `bundle.getString(key)?.toBooleanStrictOrNull()`. */
	private val stringOnlyBoolean = { raw: Any? -> raw?.toString()?.toBooleanStrictOrNull() }

	@Test
	fun `a flag survives every type the parser can hand back`() {
		assertEquals(true, C15tManifestValue.boolean(true))
		assertEquals(false, C15tManifestValue.boolean(false))
		assertEquals(true, C15tManifestValue.boolean("true"))
		assertEquals(true, C15tManifestValue.boolean("TRUE"))
		assertEquals(true, C15tManifestValue.boolean(" True "))
		assertEquals(false, C15tManifestValue.boolean("false"))
		assertEquals(true, C15tManifestValue.boolean(1L))
		assertEquals(false, C15tManifestValue.boolean(0L))
		assertEquals(true, C15tManifestValue.boolean(1))
		assertEquals(true, C15tManifestValue.boolean("1"))
		assertEquals(false, C15tManifestValue.boolean("0"))
	}

	@Test
	fun `the string-only read lost the spellings that reach a device`() {
		// Each of these is a real manifest, and each one silently did nothing before
		// the reader knew about more than one type.
		assertEquals(true, stringOnlyBoolean(true))
		assertNull(stringOnlyBoolean("TRUE"))
		assertNull(stringOnlyBoolean(" True "))
		assertNull(stringOnlyBoolean(1L))
		assertNull(stringOnlyBoolean(0L))
	}

	@Test
	fun `an absent or unreadable flag stays absent`() {
		// `false` would be an answer, and the core treats a missing GPC report as
		// "derive it" and a declared one as "this is the host's signal".
		assertNull(C15tManifestValue.boolean(null))
		assertNull(C15tManifestValue.boolean(""))
		assertNull(C15tManifestValue.boolean("   "))
		assertNull(C15tManifestValue.boolean("maybe"))
		assertNull(C15tManifestValue.boolean("yes"))
	}

	@Test
	fun `text keeps its value and drops a blank`() {
		assertEquals("https://consent.example.com", C15tManifestValue.string(" https://consent.example.com "))
		assertEquals("1234", C15tManifestValue.string(1234L))
		assertEquals("true", C15tManifestValue.string(true))
		assertNull(C15tManifestValue.string(null))
		assertNull(C15tManifestValue.string(""))
		assertNull(C15tManifestValue.string("   "))
	}
}
