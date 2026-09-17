package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.store.C15tStore
import com.c15t.core.transport.TransportOutcome
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * The decision surface a host app's own Kotlin code reads, per
 * `native/CONTRACT.md` section "Native SDK gating".
 *
 * `isAllowed` answers `false` for a refusal and for an unresolved policy alike, and
 * those need opposite handling. These tests pin the three-state answer, and the rule a
 * late starter depends on: registering a gate is never silence.
 */
class ConsentDecisionTest {
	@Test
	fun `necessary is granted even while the policy is still pending`() {
		val kernel = pendingKernel()

		kernel.bootstrap()

		assertFalse(kernel.isReady(), "nothing resolved, so the core must not claim an answer")
		assertTrue(kernel.snapshot().policyPending)
		assertEquals(ConsentDecision.GRANTED, kernel.decision(ConsentCategory.NECESSARY))
		for (category in ConsentCategory.OPTIONAL) {
			assertEquals(
				ConsentDecision.PENDING,
				kernel.decision(category),
				"$category has not been answered, which is not the same as refused",
			)
		}
	}

	@Test
	fun `an unresolved policy answers PENDING whichever flag is unset`() {
		// The two flags answer one question, and neither alone clears it. Both of
		// these carry permissions that say `true`, which is exactly the value a gate
		// must not read as a grant.
		val hydratedWithoutPolicy = ConsentSnapshot(
			ready = true,
			policyPending = true,
			effectivePermissions = ConsentState.ALLOW_ALL,
		)
		val policyWithoutHydration = ConsentSnapshot(
			ready = false,
			policyPending = false,
			effectivePermissions = ConsentState.ALLOW_ALL,
		)

		for (snapshot in listOf(hydratedWithoutPolicy, policyWithoutHydration)) {
			assertFalse(snapshot.isReady)
			assertEquals(ConsentDecision.GRANTED, snapshot.decision(ConsentCategory.NECESSARY))
			for (category in ConsentCategory.OPTIONAL) {
				assertEquals(ConsentDecision.PENDING, snapshot.decision(category), "$category is unanswered")
			}
		}
	}

	@Test
	fun `a resolved policy answers GRANTED and DENIED from the permissions`() {
		val kernel = resolvedKernel()
		kernel.save(CommitIntent.Necessary)

		assertTrue(kernel.isReady(), "a matched policy folded in resolves the state")
		assertEquals(ConsentDecision.DENIED, kernel.decision(ConsentCategory.MARKETING))

		kernel.save(CommitIntent.All)

		assertEquals(ConsentDecision.GRANTED, kernel.decision(ConsentCategory.MARKETING))
		assertEquals(ConsentDecision.GRANTED, kernel.decision(ConsentCategory.NECESSARY))

		kernel.save(CommitIntent.Necessary)

		assertEquals(ConsentDecision.DENIED, kernel.decision(ConsentCategory.MARKETING))
	}

	@Test
	fun `a gate registered after the decision is reached is told that decision`() {
		val kernel = resolvedKernel()
		kernel.save(CommitIntent.All)

		val seen = mutableListOf<ConsentDecision>()
		val subscription = kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		assertEquals(
			listOf(ConsentDecision.GRANTED),
			seen,
			"an SDK that initializes two seconds into the launch must not have to know what it missed",
		)

		subscription.close()
		kernel.save(CommitIntent.Necessary)

		assertEquals(listOf(ConsentDecision.GRANTED), seen, "a cancelled handle must go quiet")
	}

	@Test
	fun `a gate registered while pending fires again when the answer is granted`() {
		val transport = RecordingTransport()
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		// The init at bootstrap cannot be reached, so the state stays unanswered.
		kernel.bootstrap()

		val seen = mutableListOf<ConsentDecision>()
		kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		assertEquals(listOf(ConsentDecision.PENDING), seen)

		// An opt-out policy grants by default, so the resolution on its own is the
		// answer: no subject action needed to move this gate.
		transport.respondInit(initSuccess(body = initBody(model = "\"opt-out\"")))
		kernel.refresh()

		assertEquals(listOf(ConsentDecision.PENDING, ConsentDecision.GRANTED), seen)
	}

	@Test
	fun `a gate registered while pending fires again when the answer is denied`() {
		val transport = RecordingTransport()
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()

		val seen = mutableListOf<ConsentDecision>()
		kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		assertEquals(listOf(ConsentDecision.PENDING), seen)

		// Opt-in with nothing decided yet: a real refusal, and the gate stops being
		// able to claim it is still waiting.
		transport.respondInit(initSuccess())
		kernel.refresh()

		assertEquals(listOf(ConsentDecision.PENDING, ConsentDecision.DENIED), seen)
	}

	@Test
	fun `a denial never degrades back to pending when the network drops`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.Necessary)

		val seen = mutableListOf<ConsentDecision>()
		kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		transport.respondInit(TransportOutcome.NetworkFailure("airplane mode"))
		kernel.refresh()

		assertFalse(kernel.snapshot().policyPending, "a policy resolved once stays resolved")
		assertTrue(kernel.isReady())
		assertEquals(
			ConsentDecision.DENIED,
			kernel.decision(ConsentCategory.MARKETING),
			"a connectivity event is not a re-prompt, and must not reopen a refusal",
		)
		assertEquals(
			listOf(ConsentDecision.DENIED, ConsentDecision.DENIED),
			seen,
			"the republished snapshot repeats the answer; a placeholder never comes back once decided",
		)
	}

	@Test
	fun `the boolean gate keeps its own answer and moves with gateDecision`() {
		val kernel = resolvedKernel()
		kernel.save(CommitIntent.Necessary)

		// The React Native bridge forwards this untyped trailing-lambda form, so the
		// boolean gate has to stay reachable without a type hint next to it.
		val allowed = mutableListOf<Boolean>()
		kernel.gate(ConsentCategory.MARKETING) { allowed += it }
		val seen = mutableListOf<ConsentDecision>()
		kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		assertEquals(listOf(false), allowed)
		assertEquals(listOf(ConsentDecision.DENIED), seen)

		kernel.save(CommitIntent.All)

		assertEquals(listOf(false, true), allowed)
		assertEquals(listOf(ConsentDecision.DENIED, ConsentDecision.GRANTED), seen)
	}

	@Test
	fun `the process-wide facade answers PENDING rather than DENIED before bootstrap`() {
		C15t.reset()

		val seen = mutableListOf<ConsentDecision>()
		val subscription = C15t.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		assertEquals(ConsentDecision.GRANTED, C15t.decision(ConsentCategory.NECESSARY))
		assertEquals(
			ConsentDecision.PENDING,
			C15t.decision(ConsentCategory.MARKETING),
			"an ad SDK that starts ahead of c15t has not been refused, so it must keep listening",
		)
		assertFalse(C15t.isReady())
		assertEquals(
			listOf(ConsentDecision.PENDING),
			seen,
			"with no kernel installed there is nothing to observe, and one answer is still given",
		)
		subscription.close()
	}

	/** A core whose init cannot be reached, which is the unanswered device. */
	private fun pendingKernel(): C15tKernel = testKernel(store = C15tStore(InMemoryKeyValueStore()))

	/** A core whose first init resolved an opt-in policy, with nothing chosen yet. */
	private fun resolvedKernel(model: String = "\"opt-in\""): C15tKernel {
		val kernel = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport().respondInit(initSuccess(body = initBody(model = model))),
		)
		kernel.bootstrap()
		assertTrue(kernel.isReady(), "the fixture itself must start resolved")
		return kernel
	}
}
