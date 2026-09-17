package com.c15t.core

import com.c15t.core.model.KernelOverrides
import com.c15t.core.store.C15tStore
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The two surfaces a binding layer needs that the pure kernel API does not cover:
 * the hydration answer for its handshake, and a way to clear one override.
 */
class BindingApiTest {
	@Test
	fun `hasStoredSnapshot reports hydration, not what was written afterwards`() {
		val backend = InMemoryKeyValueStore()
		val first = testKernel(store = C15tStore(backend))
		assertFalse(first.hasStoredSnapshot, "nothing is installed yet")

		first.bootstrap()

		assertFalse(first.hasStoredSnapshot, "a first launch found no envelope")
		assertFalse(C15t.hasStoredSnapshot, "the process-wide facade has no kernel installed")

		val relaunched = testKernel(store = C15tStore(backend))
		relaunched.bootstrap()

		assertTrue(relaunched.hasStoredSnapshot, "the first launch persisted an envelope to hydrate")
	}

	@Test
	fun `setOverrides merges by default so one field can be pinned alone`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()))
		kernel.bootstrap()
		kernel.setOverrides(KernelOverrides(country = "DE", region = "BE", language = "de"))

		kernel.setOverrides(KernelOverrides(language = "fr"))

		val overrides = kernel.snapshot().overrides
		assertEquals("DE", overrides.country)
		assertEquals("BE", overrides.region)
		assertEquals("fr", overrides.language)
	}

	@Test
	fun `setOverrides with merge false replaces the record so a cleared field clears`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()))
		kernel.bootstrap()
		kernel.setOverrides(KernelOverrides(country = "DE", region = "BE", language = "de", gpc = true))

		// The shape a binding produces from `{ "region": null }`: everything else kept,
		// the one field the app nulled actually gone.
		kernel.setOverrides(KernelOverrides(country = "DE", language = "de"), merge = false)

		val overrides = kernel.snapshot().overrides
		assertEquals("DE", overrides.country)
		assertNull(overrides.region)
		assertNull(overrides.gpc)
	}
}
