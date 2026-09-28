package com.c15t.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The storage layer's Android-free edge.
 *
 * Everything else in this module needs a device, so this covers the part where a
 * wrong answer is a silent data problem: a key that resolves to a path outside the
 * c15t directory, or to a file the SDK cannot read back.
 */
class StorePathsTest {
	@Test
	fun `the contract keys map to themselves`() {
		assertEquals("com.c15t.snapshot", StorePaths.fileName("com.c15t.snapshot"))
		assertEquals("com.c15t.subject", StorePaths.fileName("com.c15t.subject"))
		assertEquals("com.c15t.pending", StorePaths.fileName("com.c15t.pending"))
	}

	@Test
	fun `a key that could escape the directory is refused`() {
		assertNull(StorePaths.fileName("../evil"))
		assertNull(StorePaths.fileName("a/b"))
		assertNull(StorePaths.fileName("/absolute"))
		assertNull(StorePaths.fileName("com\\c15t"))
		assertNull(StorePaths.fileName(""))
		assertNull(StorePaths.fileName("   "))
		assertNull(StorePaths.fileName(".hidden"))
		assertNull(StorePaths.fileName("key with space"))
		assertNull(StorePaths.fileName("a".repeat(65)))
	}
}
