package com.c15t.core

import com.c15t.core.model.ActiveUI
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.PrivacySignals
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The behaviours `native/CONTRACT.md` makes load-bearing for every native core.
 */
class KernelTest {
	private val json = Json { ignoreUnknownKeys = true }

	@Test
	fun `cold start with an empty store is not ready and denies every optional category`() {
		val backend = InMemoryKeyValueStore()
		val kernel = testKernel(store = C15tStore(backend))

		kernel.bootstrap()
		val snapshot = kernel.snapshot()

		assertFalse(snapshot.ready, "nothing was stored, so the core must not claim a ready state")
		assertTrue(snapshot.policyPending, "no init has resolved a policy yet")
		assertTrue(snapshot.effectivePermissions.necessary)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(kernel.isAllowed(category), "$category must stay denied while unready")
			assertFalse(snapshot.effectivePermissions[category])
		}
		assertEquals(ActiveUI.NONE, snapshot.activeUI)
		assertFalse(snapshot.promptRequirement.notice)
		assertFalse(snapshot.promptRequirement.acknowledge)
		assertNull(snapshot.resolution.policyId)
	}

	@Test
	fun `a failed init keeps the cold-start answer deny-all`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()))

		kernel.bootstrap()

		assertEquals(PolicyResolution.STATUS_FAILED, kernel.snapshot().resolution.status)
		assertEquals(PolicyResolution.REASON_TRANSPORT, kernel.snapshot().resolution.reason)
		assertTrue(kernel.snapshot().policyPending)
		assertFalse(kernel.snapshot().ready)
		assertFalse(kernel.isAllowed(ConsentCategory.MARKETING))
	}

	@Test
	fun `hydrate restores the stored snapshot with no network in the read path`() {
		val clock = FixedClock()
		val stored = C15tStore(InMemoryKeyValueStore())
		// Produce a realistic stored state first: init resolves, subject accepts.
		val transport = RecordingTransport().respondInit(initSuccess())
		val writer = testKernel(store = stored, clock = clock, transport = transport)
		writer.bootstrap()
		val accepted = writer.save(CommitIntent.All)
		assertTrue(accepted.delivered)
		assertTrue(writer.isAllowed(ConsentCategory.MARKETING))
		val storedEnvelope = assertNotNull(stored.readEnvelope())
		val subjectId = assertNotNull(storedEnvelope.snapshot.subject).id

		// A brand new core over the same bytes, with a transport that would fail.
		val coldBackend = InMemoryKeyValueStore()
		coldBackend.putSilently(C15tStoreKeys.SNAPSHOT, C15tJson.storage.encodeToString(storedEnvelope))
		coldBackend.putSilently(C15tStoreKeys.SUBJECT, """{"id":"$subjectId"}""")
		val coldTransport = RecordingTransport()
		val cold = testKernel(store = C15tStore(coldBackend), clock = clock, transport = coldTransport)

		cold.bootstrap()
		val snapshot = cold.snapshot()

		assertTrue(snapshot.ready, "hydration found a stored snapshot")
		assertFalse(snapshot.policyPending, "the stored policy resolution was definitive")
		assertEquals(subjectId, snapshot.subject?.id)
		assertEquals(ConsentModel.OPT_IN, snapshot.model)
		for (category in ConsentCategory.OPTIONAL) {
			assertTrue(cold.isAllowed(category), "$category was granted before the restart")
		}
		// The first synchronous answer came from the envelope, so no init may have
		// been consulted for it: the only request is the one bootstrap schedules
		// afterwards, and it never blocks the snapshot.
		assertEquals(1, coldTransport.initRequests.size)
		assertTrue(coldBackend.events.indexOf("read:${C15tStoreKeys.SNAPSHOT}") < coldBackend.events.indexOf("read:${C15tStoreKeys.PENDING}"))
	}

	@Test
	fun `isAllowed stays deny-all while policyPending even with a stored grant`() {
		val clock = FixedClock()
		val envelopeJson = json.encodeToString(
			SnapshotEnvelope.serializer(),
			SnapshotEnvelope(
				snapshot = ConsentSnapshot(
					revision = 4,
					policyPending = true,
					ready = true,
					// A permissive stored permission map must not leak while the
					// policy is still pending.
					effectivePermissions = ConsentState.ALLOW_ALL,
					subject = ConsentSubject(id = "subject-1"),
				),
			),
		)
		val backend = InMemoryKeyValueStore()
		backend.putSilently(C15tStoreKeys.SNAPSHOT, envelopeJson)
		val kernel = testKernel(store = C15tStore(backend), clock = clock)

		kernel.bootstrap()

		assertTrue(kernel.snapshot().policyPending)
		assertTrue(kernel.snapshot().ready)
		assertTrue(kernel.snapshot().effectivePermissions.necessary)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(kernel.isAllowed(category), "$category must be denied while pending")
		}
		assertNull(kernel.snapshot().nextDeadline)
	}

	@Test
	fun `opt-in grants only what an explicit accept covered`() {
		val clock = FixedClock()
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), clock = clock, transport = transport)
		kernel.bootstrap()
		assertTrue(kernel.snapshot().promptRequirement.acknowledge, "an undecided subject owes the choice prompt")
		assertEquals(ActiveUI.BANNER, kernel.snapshot().activeUI)

		val accepted = kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to true)))
		assertTrue(accepted.ok)

		assertTrue(kernel.isAllowed(ConsentCategory.MEASUREMENT))
		assertFalse(kernel.isAllowed(ConsentCategory.MARKETING), "opt-in denies what the action did not confirm")
		// A current receipt settles the prompt, so the first layer closes.
		assertFalse(kernel.snapshot().promptRequirement.acknowledge)
		assertFalse(kernel.snapshot().promptRequirement.notice)
		assertEquals(ActiveUI.NONE, kernel.snapshot().activeUI)
		assertEquals(ConsentModel.OPT_IN, kernel.snapshot().model)

		kernel.save(CommitIntent.All)
		for (category in ConsentCategory.OPTIONAL) {
			assertTrue(kernel.isAllowed(category))
		}

		kernel.save(CommitIntent.Necessary)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(kernel.isAllowed(category))
		}
	}

	@Test
	fun `GPC and a strict scope restrict an explicit grant`() {
		val transport = RecordingTransport().respondInit(
			initSuccess(
				body = initBody(
					scope = """["measurement","marketing"]""",
					scopeMode = "\"strict\"",
					gpcDenyCategories = """["marketing"]""",
				),
			)
		)
		val kernel = testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", detectedGpc = true),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = transport,
		)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		assertTrue(kernel.isAllowed(ConsentCategory.MEASUREMENT))
		assertFalse(kernel.isAllowed(ConsentCategory.MARKETING), "an active GPC signal denies it")
		assertFalse(kernel.isAllowed(ConsentCategory.FUNCTIONALITY), "outside a strict scope")
		assertEquals(listOf("gpc"), kernel.snapshot().restrictions["marketing"])
		assertEquals(listOf("strict-scope"), kernel.snapshot().restrictions["functionality"])
	}

	@Test
	fun `an expired choice stops granting under opt-in`() {
		val clock = FixedClock()
		val transport = RecordingTransport().respondInit(initSuccess(body = initBody(choiceMs = 1_000)))
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), clock = clock, transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)
		assertTrue(kernel.isAllowed(ConsentCategory.MARKETING))
		assertNotNull(kernel.snapshot().nextDeadline)

		clock.advance(1_001)
		kernel.refresh()

		assertFalse(kernel.isAllowed(ConsentCategory.MARKETING))
		assertTrue(kernel.snapshot().promptRequirement.acknowledge, "an expired choice must re-prompt")
	}

	@Test
	fun `a failed init after a good one keeps the cached grants`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)
		assertTrue(kernel.isAllowed(ConsentCategory.MARKETING))

		// Signal drops: the policy that is in force must survive it.
		transport.respondInit(TransportOutcome.NetworkFailure("no network"))
		kernel.refresh()

		assertFalse(kernel.snapshot().policyPending, "a policy already resolved once stays resolved")
		assertTrue(kernel.isAllowed(ConsentCategory.MARKETING))
		assertEquals("us-ca", kernel.snapshot().resolution.policyId)
		assertNotNull(kernel.snapshot().error, "the host still learns the init failed")
	}

	@Test
	fun `gate fires immediately and again on change`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()

		val seen = mutableListOf<Boolean>()
		val subscription = kernel.gate(ConsentCategory.MARKETING) { seen += it }

		assertEquals(listOf(false), seen)
		kernel.save(CommitIntent.All)
		assertEquals(listOf(false, true), seen)

		subscription.close()
		kernel.save(CommitIntent.Necessary)
		assertEquals(listOf(false, true), seen, "a closed gate must go quiet")
	}

	@Test
	fun `setOverrides re-evaluates and re-runs init with the new context`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val backend = InMemoryKeyValueStore()
		val kernel = testKernel(store = C15tStore(backend), clock = FixedClock(), transport = transport)
		kernel.bootstrap()

		kernel.setOverrides(KernelOverrides(country = "DE", gpc = true))

		assertEquals("DE", kernel.snapshot().overrides.country)
		assertEquals(true, kernel.snapshot().overrides.gpc)
		assertTrue(
			kernel.snapshot().privacySignals.gpc.active,
			"an override is the value the evaluator honors",
		)
		assertFalse(
			kernel.snapshot().privacySignals.gpc.detected,
			"the device never reported GPC; only the app did",
		)
		// The pinned context must reach the backend on the following init.
		val last = transport.initRequests.last()
		assertEquals("DE", last.overrides.country)
		assertTrue(
			last.gpc,
			"the merged signal the core honors is what goes to the backend, and an override is part of it",
		)
		assertEquals(true, last.overrides.gpc, "the override itself is forwarded unchanged")
	}
}
