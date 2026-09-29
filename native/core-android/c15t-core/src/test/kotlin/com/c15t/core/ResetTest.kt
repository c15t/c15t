package com.c15t.core

import com.c15t.core.model.ActiveUI
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PromptPurpose
import com.c15t.core.store.C15tStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.transport.SaveOutcome
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * `reset()` as `native/CONTRACT.md` states it under "Wiping consent (reset)": a device
 * that answered comes back looking like a device that never did.
 *
 * The tests that matter here tell the first-launch state apart from a recorded denial.
 * Both deny every optional category, so a test that stops at "everything reads false
 * again" also passes on a core that wiped consent by saving a rejection, which is the one
 * state a subject cannot get out of. The prompt is the tell: a cleared device owes a
 * choice, a device holding a recorded denial does not.
 */
class ResetTest {
	@Test
	fun `a wipe leaves the choice prompt owed again, which a recorded denial would not`() {
		val kernel = decidedKernel(CommitIntent.All)
		val accepted = kernel.snapshot()
		assertNotNull(accepted.explicitChoice, "the accept-all has to be a recorded receipt first")
		assertFalse(
			accepted.promptRequirement.acknowledge,
			"a subject who accepted owes nothing, and that is the state the wipe has to end",
		)

		kernel.reset()

		val after = kernel.snapshot()
		assertNull(
			after.explicitChoice,
			"a wipe that recorded a denial instead of clearing one leaves a choice on file",
		)
		assertFalse(after.effectivePermissions.marketing)
		assertTrue(
			after.promptRequirement.acknowledge,
			"the banner has to come back. A denial the subject never gave would keep it away for the choice window.",
		)
		assertEquals(PromptPurpose.INITIAL, after.promptRequirement.purpose)
		assertEquals(ActiveUI.BANNER, after.activeUI)
		assertFalse(after.policyPending, "the wipe re-ran init, and the scripted policy resolved")
		assertTrue(after.ready)
	}

	@Test
	fun `an accept-all and a recorded denial wipe to the same answer`() {
		val fromGrant = decidedKernel(CommitIntent.All)
		val fromDenial = decidedKernel(CommitIntent.Necessary)
		assertTrue(fromGrant.isAllowed(ConsentCategory.MARKETING))
		assertFalse(fromDenial.isAllowed(ConsentCategory.MARKETING))

		fromGrant.reset()
		fromDenial.reset()

		// One device accepted everything, the other refused it, and both then wiped. After
		// the wipe no field either answers with may say which was which, because the whole
		// claim is that nobody can tell a returning subject from a new one. Revision is the
		// one field left out: it counts every mutation the session made, including a save
		// one of these two never sent.
		assertEquals(
			fromDenial.snapshot().copy(revision = 0),
			fromGrant.snapshot().copy(revision = 0),
		)
	}

	@Test
	fun `the wipe is one committed mutation, published rather than installed`() {
		val kernel = decidedKernel(CommitIntent.All)
		val before = kernel.snapshot()

		val published = mutableListOf<ConsentSnapshot>()
		val observer: (ConsentSnapshot) -> Unit = { published += it }
		val subscription = kernel.onChange(observer)
		val decisions = mutableListOf<ConsentDecision>()
		val gate = kernel.gateDecision(ConsentCategory.MARKETING) { decisions += it }

		kernel.reset()
		subscription.close()
		gate.close()

		assertEquals(
			before.revision + 1,
			published.first().revision,
			"reset moves the revision by exactly one. Restarting the numbering would hand a subscriber a " +
				"snapshot older than the one it holds, and the pump announces nothing at an old revision.",
		)
		assertNull(published.first().explicitChoice, "the first publication is the cleared baseline")
		assertTrue(
			published.size > 1,
			"the init the wipe re-ran has to publish as well, or the prompt that comes back never reaches a host",
		)
		assertEquals(ConsentDecision.GRANTED, decisions.first(), "registering a gate is never silence")
		assertNotEquals(ConsentDecision.GRANTED, decisions.last())
	}

	@Test
	fun `the wipe keeps the subject id, the overrides, and the configured scope`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				consentCategories = listOf(ConsentCategory.MEASUREMENT),
				overrides = KernelOverrides(country = "DE", language = "de"),
			),
			store = store,
			transport = RecordingTransport().respondInit(initSuccess()),
		)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)
		val subjectId = assertNotNull(kernel.snapshot().subject).id

		kernel.reset()

		val after = kernel.snapshot()
		assertEquals(subjectId, after.subject?.id, "the backend holds an audit history keyed to this id")
		assertEquals(subjectId, assertNotNull(store.readSubject()).id)
		assertEquals("DE", after.overrides.country, "a pinned country is configuration, not consent")
		assertEquals("de", after.overrides.language)
		assertEquals(
			listOf(ConsentCategory.NECESSARY.wireName, ConsentCategory.MEASUREMENT.wireName),
			after.consentCategories,
			"the host's category scope survives the wipe; the list itself is recomputed against the fallback rule, since the policy that narrowed it is gone",
		)
	}

	@Test
	fun `the wipe deletes the envelope and the queue and leaves the identity`() {
		val backend = InMemoryKeyValueStore()
		val store = C15tStore(backend)
		// The re-run init is held back so the wipe's own durable effect is observable. With
		// the inline executor it would have cached the policy it re-resolved by the time the
		// assertion ran, which is the envelope a first launch writes too.
		val deferred = mutableListOf<() -> Unit>()
		val transport = RecordingTransport()
			.respondInit(initSuccess())
			.respondSave(SaveOutcome.Unavailable("no route to host"))
		val kernel = testKernel(
			store = store,
			transport = transport,
			executor = TaskExecutor { deferred += it },
		)
		kernel.bootstrap()

		assertFalse(
			kernel.save(CommitIntent.All).delivered,
			"the write has to still be owed for this to prove anything",
		)
		assertTrue(store.readPending().isNotEmpty())
		assertNotNull(store.readEnvelope())
		val subjectId = assertNotNull(kernel.snapshot().subject).id

		kernel.reset()

		assertNull(store.readEnvelope(), "an envelope that survives the wipe is consent the next launch serves")
		assertFalse(
			C15tStoreKeys.SNAPSHOT in backend.keys,
			"a key deleted and a key holding nothing are different answers to a launcher",
		)
		assertFalse(
			C15tStoreKeys.PENDING in backend.keys,
			"an empty queue written as bytes is not the same answer as no queue, which is what a first launch has",
		)
		assertEquals(subjectId, assertNotNull(store.readSubject()).id)
		assertFalse(kernel.hasStoredSnapshot, "a handshake that reports cached consent from a wiped device lies")

		// Let the init the wipe re-ran land. It caches the policy it resolved, exactly as a
		// first launch's does, and the bytes it leaves must hold no decision.
		deferred.toList().also { deferred.clear() }.forEach { it() }
		val stored = assertNotNull(store.readEnvelope(), "a re-resolved policy is cached, as a first launch caches it")
		assertNull(stored.snapshot.explicitChoice, "what came back is policy, not consent")
		assertFalse(stored.snapshot.effectivePermissions.marketing)
		assertTrue(store.readPending().isEmpty(), "a save owed before the wipe is not owed after it")
	}

	@Test
	fun `a wiped device and a device that never decided relaunch identically`() {
		val clock = FixedClock()

		// A reviewer's device: decided everything, then wiped, then re-resolved its policy.
		val wipedBackend = InMemoryKeyValueStore()
		val wiped = testKernel(
			store = C15tStore(wipedBackend),
			clock = clock,
			transport = RecordingTransport().respondInit(initSuccess()),
		)
		wiped.bootstrap()
		wiped.save(CommitIntent.All)
		val subjectId = assertNotNull(wiped.snapshot().subject).id
		wiped.reset()

		// A new install that got as far as its first init and decided nothing.
		val freshBackend = InMemoryKeyValueStore()
		testKernel(
			store = C15tStore(freshBackend),
			clock = clock,
			transport = RecordingTransport().respondInit(initSuccess()),
		).bootstrap()

		// Both relaunch over their own bytes, with nothing left to answer an init. Revision
		// is the one field left out: it counts the mutations the wiped device made and the
		// new install never did.
		val relaunchedWiped = testKernel(
			store = C15tStore(wipedBackend),
			clock = clock,
			transport = RecordingTransport(),
		)
		val relaunchedFresh = testKernel(
			store = C15tStore(freshBackend),
			clock = clock,
			transport = RecordingTransport(),
		)
		relaunchedWiped.bootstrap()
		relaunchedFresh.bootstrap()

		val after = relaunchedWiped.snapshot()
		assertEquals(
			relaunchedFresh.snapshot().copy(revision = 0),
			after.copy(revision = 0),
			"a reviewer who wiped the app has to be looking at what a new install looks like",
		)
		assertNull(after.explicitChoice)
		assertFalse(after.effectivePermissions.marketing)
		assertEquals(subjectId, after.subject?.id, "a wipe costs the decision and not the identity")
	}

	@Test
	fun `a wipe with no policy to re-resolve still answers the cold-start state`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()))
		kernel.bootstrap()
		val revision = kernel.snapshot().revision

		val published = mutableListOf<ConsentSnapshot>()
		val subscription = kernel.onChange { published += it }
		kernel.reset()
		subscription.close()

		val after = kernel.snapshot()
		assertEquals(
			revision + 1,
			published.first().revision,
			"the wipe itself is one mutation. The init it re-ran counts separately, and here it failed.",
		)
		assertNull(published.first().explicitChoice)
		assertTrue(after.policyPending, "the re-run init failed, and a failed init leaves the device fail-closed")
		assertFalse(after.effectivePermissions.marketing)
		assertFalse(after.promptRequirement.acknowledge, "no policy resolved, so no surface is claimed")
		assertEquals(ActiveUI.NONE, after.activeUI)
	}

	@Test
	fun `a wipe installs the state a first launch boots with`() {
		val held = mutableListOf<() -> Unit>()
		val decided = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport().respondInit(initSuccess()),
			executor = TaskExecutor { held += it },
		)
		decided.bootstrap()
		decided.save(CommitIntent.All)
		// Let bootstrap's own flush and init land, so the kernel is in the state a running
		// app is in. What is left queued afterwards is the step the wipe schedules.
		drain(held)
		val before = decided.snapshot()

		val baseline = mutableListOf<ConsentSnapshot>()
		val subscription = decided.onChange { baseline += it }
		decided.reset()
		subscription.close()
		val wiped = baseline.first()

		// Held the same way, so the fresh device is read at the same point in its life:
		// booted, nothing on disk, and nothing yet come back from the network.
		val fresh = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport().respondInit(initSuccess()),
			executor = TaskExecutor { },
		)
		fresh.bootstrap()

		// The requirement in one line: the state a wipe leaves behind is the state a device
		// that has never been used boots into, one revision further along. The other tests
		// here check a field of that claim; this one is the claim.
		assertEquals(
			fresh.snapshot(),
			wiped.copy(revision = fresh.snapshot().revision),
			"a device that answered and then wiped has to answer what a new install answers",
		)
		assertEquals(before.revision + 1, wiped.revision, "the wipe is one mutation from the state it was handed")
	}

	/** A kernel that bootstrapped against a resolved opt-in rule and then decided [intent]. */
	private fun decidedKernel(intent: CommitIntent): C15tKernel {
		val kernel = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport().respondInit(initSuccess()),
		)
		kernel.bootstrap()
		assertTrue(kernel.isReady(), "the scripted init has to have resolved before a decision means anything")
		kernel.save(intent)
		return kernel
	}
}

/** Run and clear everything an executor is holding, including work those tasks queue. */
private fun drain(held: MutableList<() -> Unit>) {
	while (held.isNotEmpty()) {
		held.removeAt(0).invoke()
	}
}
