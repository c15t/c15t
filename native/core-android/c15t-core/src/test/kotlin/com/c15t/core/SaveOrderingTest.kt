package com.c15t.core

import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelError
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.PendingSaveQueue
import com.c15t.core.transport.SaveOutcome
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * What a save promises, in what order, and what happens to the obligation when the
 * send that was supposed to discharge it fails.
 *
 * The shape under test is the one the contract calls honest: the queue write is what
 * buys the right to answer ok, so every refusal leaves the snapshot exactly where it
 * was, and every failure -- including the very first one, made by the save itself --
 * is accounted for against the entry rather than dropped on the floor.
 */
class SaveOrderingTest {
	@Test
	fun `the queue write lands before the snapshot moves`() {
		val timeline = mutableListOf<String>()
		val backend = InMemoryKeyValueStore(eventLog = timeline)
		val transport = RecordingTransport(timeline).respondSave(SaveOutcome.Delivered)
		val kernel = testKernel(store = C15tStore(backend), transport = transport)
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		val from = timeline.size

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.ok)
		val events = timeline.drop(from)
		val pendingWrite = events.indexOf("write:${C15tStoreKeys.PENDING}")
		val snapshotWrite = events.indexOf("write:${C15tStoreKeys.SNAPSHOT}")
		val network = events.indexOf("network:save")
		assertTrue(pendingWrite >= 0, "the obligation must reach disk, got: $events")
		assertTrue(snapshotWrite >= 0, "the snapshot must be persisted, got: $events")
		assertTrue(
			pendingWrite < snapshotWrite,
			"a snapshot may only move once something is obliged to deliver it, got: $events",
		)
		assertTrue(pendingWrite < network, "the request must follow the write, got: $events")
	}

	@Test
	fun `a save that cannot write the queue is refused and changes nothing`() {
		val backend = VanishingKeyValueStore(C15tStoreKeys.PENDING)
		val store = C15tStore(backend)
		val transport = RecordingTransport().respondSave(SaveOutcome.Delivered)
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		val before = kernel.snapshot()

		val result = kernel.save(CommitIntent.All)

		assertFalse(result.ok, "an obligation that never wrote cannot back an ok")
		assertFalse(result.queued)
		assertFalse(result.delivered)
		assertTrue(result.confirmed.isEmpty())
		assertEquals("queue-write-failed", result.error?.code)
		assertEquals(before.revision, result.revision, "a refusal publishes nothing")
		assertEquals(before.revision, kernel.snapshot().revision)
		assertNull(kernel.snapshot().explicitChoice, "the decision must not be applied")
		assertTrue(transport.saveRequests.isEmpty(), "nothing may be sent for a save that was refused")
		assertTrue(store.readPending().isEmpty())
		assertEquals("queue-write-failed", errors.map { it.code }.firstOrNull())
		// Bootstrap stores a snapshot of its own, so the claim is about this save: no
		// snapshot write may follow the refused commit.
		val from = backend.events.indexOf("write:${C15tStoreKeys.PENDING}")
		assertTrue(from >= 0, "the queue write was attempted, and lost")
		assertTrue(
			backend.events.withIndex().none { (at, event) ->
				at > from && event == "write:${C15tStoreKeys.SNAPSHOT}"
			},
			"a refusal must not rewrite the stored decision, got: ${backend.events.drop(from)}",
		)
	}

	@Test
	fun `a refusal writes no snapshot`() {
		val timeline = mutableListOf<String>()
		// The pending key fails while the snapshot key still works, so this test can only
		// pass by declining to store a snapshot -- a store that lost everything would hide
		// the difference between "refused" and "refused, then wrote over the old decision".
		val backend = VanishingKeyValueStore(C15tStoreKeys.PENDING)
		val store = C15tStore(backend)
		val kernel = testKernel(store = store)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		assertFalse(kernel.snapshot().isReady && kernel.snapshot().explicitChoice != null)
		assertFalse(store.readPending().any { true }, "and nothing is owed either")
	}

	@Test
	fun `delivered stays false while the send is still in flight`() {
		val inFlight = mutableListOf<() -> Unit>()
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Delivered)
		val kernel = testKernel(
			store = store,
			transport = transport,
			executor = TaskExecutor { inFlight += it },
		)
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		inFlight.toList().also { inFlight.clear() }.forEach { it() }

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.ok, "the obligation is durable, which is all an ok ever claims")
		assertTrue(result.queued)
		assertFalse(result.delivered, "the send has not happened yet, so it cannot be reported")
		assertEquals(1, store.readPending().size)

		inFlight.toList().also { inFlight.clear() }.forEach { it() }
		assertTrue(store.readPending().isEmpty(), "the send that did run discharged it")
	}

	@Test
	fun `delivered is true only when the executor ran the send inline`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Delivered)
		val kernel = testKernel(store = store, transport = transport)
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.delivered, "an inline send's answer is a fact this thread may report")
		assertTrue(store.readPending().isEmpty())
	}

	@Test
	fun `the first send failing spends an attempt against the entry`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Unavailable("offline"))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.ok, "an unreachable backend does not un-commit a decision")
		val entry = store.readPending().single()
		assertEquals(1, entry.attempts, "a refused first send is an attempt, not a free pass")
		assertEquals("transport-unavailable", errors.map { it.code }.single())
	}

	@Test
	fun `a body the backend refuses on its own terms is dropped and the reason named`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Rejected(400))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()

		assertTrue(kernel.save(CommitIntent.All).ok)

		assertTrue(store.readPending().isEmpty(), "frozen bytes earn the same 400 forever")
		val error = errors.single()
		assertEquals("save-rejected", error.code)
		assertContains(error.message, "HTTP 400")
		assertContains(error.message, "will not be retried")

		kernel.flushPending()
		assertEquals(1, transport.saveRequests.size, "a dropped body must not be replayed")
	}

	@Test
	fun `a rate limited send keeps the entry and spends one attempt`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Rejected(429))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		assertEquals(1, store.readPending().single().attempts)
		assertEquals(listOf("http-status"), errors.map { it.code }, "a 429 is not a verdict on the body")
	}

	@Test
	fun `an unsupported contract is a verdict on the body`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.UnsupportedContract("2", 1))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		assertTrue(store.readPending().isEmpty())
		assertEquals(listOf("save-rejected"), errors.map { it.code })
		assertContains(errors.single().message, "policy contract 2")
	}

	@Test
	fun `a body runs out at the attempt ceiling and says which ceiling`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Rejected(503))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		repeat(PendingSaveQueue.MAX_ATTEMPTS - 1) { kernel.flushPending() }

		assertTrue(store.readPending().isEmpty(), "the ceiling has to be reachable")
		val drop = errors.last()
		assertEquals("save-undeliverable", drop.code)
		assertContains(
			drop.message,
			"refused ${PendingSaveQueue.MAX_ATTEMPTS} times",
			message = "an entry that ran out of attempts is not an entry that went stale",
		)

		val sends = transport.saveRequests.size
		kernel.flushPending()
		assertEquals(sends, transport.saveRequests.size, "nothing is left to send")
	}

	@Test
	fun `an entry older than the retention window names that ceiling instead`() {
		val clock = FixedClock()
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport()
			.respondSave(SaveOutcome.Unavailable("offline"))
			.respondSave(SaveOutcome.Rejected(503))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, clock = clock, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()
		kernel.save(CommitIntent.All)
		clock.advance(PendingSaveQueue.MAX_AGE_MS + 1)

		kernel.flushPending()

		assertTrue(store.readPending().isEmpty())
		val drop = errors.last()
		assertEquals("save-undeliverable", drop.code)
		assertContains(drop.message, "retention window")
	}

	@Test
	fun `a save with no reachable sender says the obligation is waiting`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondSave(SaveOutcome.Unavailable("airplane mode"))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })
		// Script a policy so bootstrap() does not emit an init failure, which would land in
		// the same error list this test asserts on.
		transport.respondInit(initSuccess())
		kernel.bootstrap()

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.ok)
		assertFalse(result.delivered, "the commit never claimed delivery, and still does not")
		assertEquals(1, store.readPending().size)
		assertContains(errors.map { it.code }, "transport-unavailable")
	}

	@Test
	fun `a committed save still reports the action it took`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val kernel = testKernel(store = store)
		kernel.bootstrap()

		val result = kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to true)))

		assertTrue(result.ok)
		assertEquals(
			mapOf("measurement" to true),
			result.confirmed,
			"the receipts the caller handed over, exactly",
		)
		assertNotNull(kernel.snapshot().explicitChoice)
		assertEquals(ConsentAction.CUSTOM, kernel.snapshot().explicitChoice?.action)
	}
}
