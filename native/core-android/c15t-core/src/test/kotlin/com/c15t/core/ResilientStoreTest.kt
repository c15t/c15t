package com.c15t.core

import com.c15t.core.spi.KeyValueStore
import com.c15t.core.store.ResilientKeyValueStore
import java.security.KeyStoreException
import javax.crypto.AEADBadTagException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The step-down from an encrypted store to an unprotected one.
 *
 * This is the behaviour that decides whether a device with a dead keystore keeps
 * its user's consent across a relaunch, so it is tested against the storage
 * interfaces rather than against a real AndroidKeyStore.
 */
class ResilientStoreTest {
	@Test
	fun `a key failure on write falls back and the payload still lands`() {
		val fallback = InMemoryKeyValueStore()
		val store = ResilientKeyValueStore(BrokenKeyStore(), fallback)

		store.write(SNAPSHOT, "state")

		assertTrue(store.isDegraded, "a dead key must retire the encrypted store")
		assertEquals("state", fallback.read(SNAPSHOT), "the write that proved it must not be lost")
	}

	@Test
	fun `later reads and writes go to the fallback only`() {
		val fallback = InMemoryKeyValueStore()
		val primary = BrokenKeyStore()
		val store = ResilientKeyValueStore(primary, fallback)
		store.write(SNAPSHOT, "first")

		store.write(SNAPSHOT, "second")

		assertEquals("second", store.read(SNAPSHOT))
		assertEquals(1, primary.attempts, "the encrypted store is not retried on every call")
	}

	@Test
	fun `the step-down is reported once`() {
		var reports = 0
		val store = ResilientKeyValueStore(BrokenKeyStore(), InMemoryKeyValueStore(), onFallback = { reports += 1 })

		repeat(3) { store.write(SNAPSHOT, "state") }

		assertEquals(1, reports, "a fallback that logs on every write buries the one line that matters")
	}

	@Test
	fun `a key failure on read takes the stored value from the fallback`() {
		val fallback = InMemoryKeyValueStore(mapOf(SNAPSHOT to "from-fallback"))
		val store = ResilientKeyValueStore(BrokenKeyStore(), fallback)

		assertEquals("from-fallback", store.read(SNAPSHOT))
		assertTrue(store.isDegraded)
	}

	@Test
	fun `an unauthenticated blob is fail-closed, not key loss`() {
		val fallback = InMemoryKeyValueStore(mapOf(SNAPSHOT to "should-not-be-read"))
		val store = ResilientKeyValueStore(ThrowingStore(AEADBadTagException("tag mismatch")), fallback)

		assertNull(store.read(SNAPSHOT), "a tampered blob must read as nothing stored")
		assertFalse(store.isDegraded, "tampering must not be mistaken for a dead key")
		assertFalse(fallback.events.any { it.startsWith("write") }, "the fallback must not be consulted for a tampered blob")
	}

	@Test
	fun `a storage failure that is not key loss never reaches the caller`() {
		val fallback = InMemoryKeyValueStore()
		val store = ResilientKeyValueStore(ThrowingStore(IllegalStateException("disk full")), fallback)

		// A launch hook must not crash over storage, and nothing here may look like a
		// successful save: the write is simply dropped.
		store.write(SNAPSHOT, "state")
		assertNull(store.read(SNAPSHOT))
		assertFalse(store.isDegraded)
		assertTrue(fallback.keys.isEmpty())
	}

	private class BrokenKeyStore : KeyValueStore {
		var attempts = 0

		override fun read(key: String): String? {
			attempts += 1
			throw KeyStoreException("key destroyed")
		}

		override fun write(
			key: String,
			value: String?,
		) {
			attempts += 1
			throw KeyStoreException("key destroyed")
		}
	}

	private class ThrowingStore(private val error: Throwable) : KeyValueStore {
		override fun read(key: String): String? = throw error

		override fun write(
			key: String,
			value: String?,
		) {
			throw error
		}
	}

	private companion object {
		const val SNAPSHOT = "com.c15t.snapshot"
	}
}
