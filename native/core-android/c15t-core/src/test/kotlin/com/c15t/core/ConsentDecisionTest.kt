package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.KernelUser
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
			listOf(ConsentDecision.DENIED),
			seen,
			"the republished snapshot repeats an answer the listener already had, so it says nothing",
		)
	}

	@Test
	fun `the decision gate delivers one answer until that answer moves`() {
		val transport = RecordingTransport()
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		// No init answer is scripted, so marketing stays unanswered for the whole run.
		kernel.bootstrap()

		val seen = mutableListOf<ConsentDecision>()
		kernel.gateDecision(ConsentCategory.MARKETING) { decision -> seen += decision }

		var publications = 0
		// The core holds snapshot observers weakly, so the lambda needs an owner for
		// as long as the run lasts.
		val observer: (ConsentSnapshot) -> Unit = { publications += 1 }
		val watcher = kernel.onChange(observer)

		// Two committed mutations that say nothing about marketing: an identity that
		// arrives, and a prompt the subject closes. The identity drags an unreachable
		// init behind it, so the device publishes several times while the answer holds.
		kernel.identify(KernelUser(externalId = "user-1"))
		kernel.dismissNotice()

		assertTrue(publications >= 2, "the fixture has to publish, and it published $publications times")
		assertEquals(
			listOf(ConsentDecision.PENDING),
			seen,
			"a device that publishes five snapshots while the answer stays pending delivers one pending",
		)

		// The dedupe is on the decision, not on "has anything been published".
		transport.respondInit(initSuccess(body = initBody(model = "\"opt-out\"")))
		kernel.refresh()

		assertEquals(listOf(ConsentDecision.PENDING, ConsentDecision.GRANTED), seen)

		// Away and back fires again, which is correct, and a host that must act exactly
		// once still guards its own action.
		kernel.save(CommitIntent.Necessary)
		kernel.save(CommitIntent.All)

		assertEquals(
			listOf(
				ConsentDecision.PENDING,
				ConsentDecision.GRANTED,
				ConsentDecision.DENIED,
				ConsentDecision.GRANTED,
			),
			seen,
		)
		watcher.close()
	}

	@Test
	fun `an unreadable resolution returns a granted category to pending and a good one gives it back`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		assertEquals(ConsentDecision.GRANTED, kernel.decision(ConsentCategory.MARKETING))

		// Contract rule 5, and the one exception to the latching above: this is not a
		// dropped connection, it is a resolution the core cannot parse, so there is no
		// answer left to serve -- not even the refusal a host would stop listening on.
		transport.respondInit(initSuccess(body = """{"policyResolution":"not-even-an-object"}"""))
		kernel.refresh()

		assertTrue(kernel.snapshot().policyPending, "rule 5 raises the pending flag it had already lowered")
		assertFalse(kernel.isAllowed(ConsentCategory.MARKETING), "every optional category is denied, ...")
		assertEquals(
			ConsentDecision.PENDING,
			kernel.decision(ConsentCategory.MARKETING),
			"... including one it had granted, and as a question, not a refusal",
		)
		assertEquals(
			ConsentDecision.GRANTED,
			kernel.decision(ConsentCategory.NECESSARY),
			"necessary is not something anyone gets taken away",
		)

		transport.respondInit(initSuccess())
		kernel.refresh()

		assertFalse(kernel.snapshot().policyPending, "the flag is the same flag, so the next resolution clears it")
		assertEquals(
			ConsentDecision.GRANTED,
			kernel.decision(ConsentCategory.MARKETING),
			"the receipt survived, so the grant returns by itself with no restart",
		)
	}

	@Test
	fun `the boolean facade gate answers before it returns with no kernel installed`() {
		C15t.reset()

		val order = mutableListOf<String>()
		val allowed = mutableListOf<Boolean>()
		val optional = C15t.gate(ConsentCategory.MARKETING) {
			allowed += it
			order += "callback"
		}
		order += "returned"

		assertEquals(listOf("callback", "returned"), order, "registration must never be silence")
		assertEquals(
			listOf(false),
			allowed,
			"the answer is the one isAllowed gives for an optional category before bootstrap",
		)

		val necessary = mutableListOf<Boolean>()
		val granted = C15t.gate(ConsentCategory.NECESSARY) { necessary += it }

		assertEquals(listOf(true), necessary, "necessary is granted here too, not defaulted to false")

		optional.close()
		granted.close()

		assertEquals(listOf(false), allowed, "the handle had nothing left to cancel")
		assertEquals(listOf(true), necessary, "and closing it afterwards changes nothing")
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
