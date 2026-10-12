package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelUser
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.QueuedSave
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.InitContext
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The exclusivity rule in `native/CONTRACT.md`, "The pending save queue": only one delivery
 * pass may be in flight per core.
 *
 * A pass reads the queue once and then delivers entry by entry, so every entry it read stays
 * readable until its own send lands. A second pass that reads during that window resends
 * whatever is still in flight: the bytes are frozen and carry the same consent id, so the
 * backend dedupes, no stored state moves, and the only symptom is a second POST for a
 * decision the subject already saw delivered. That is why these tests watch the transport
 * rather than the snapshot -- the snapshot cannot see this defect at all.
 *
 * Each test holds a send open with a scripted transport, asks for a second pass from another
 * thread while that send is open, and then asserts on the order the harness itself recorded,
 * so the overlap is proven to have happened instead of merely hoped for. A flush that cannot
 * get the core must be answered by the pass already running, and it must still be answered:
 * [an entry queued after a running pass read is delivered by that pass] covers the half that
 * a guard alone gets wrong.
 */
class DeliveryPassExclusivityTest {
	@Test
	fun `a flush asked for during an open send does not resend the entry in flight`() {
		val harness = Harness(pool = singleThreadExecutor("c15t-test-io"))
		val kernel = harness.kernel()
		harness.boot(kernel)

		// The gate is armed first, so the save's own first send is the send that is open.
		harness.transport.holdSends()
		val saved = kernel.save(CommitIntent.All)
		assertTrue(saved.ok, "a held send says nothing about the commit")
		assertTrue(saved.queued)
		assertFalse(saved.delivered, "the send is off this thread, so the commit may not claim delivery")

		assertTrue(
			harness.transport.awaitSendOpen(ENTRY_ONE),
			"the save's first send has to reach the transport for this test to mean anything",
		)
		val flush = harness.flushWhileSendOpen(kernel)

		harness.transport.releaseSends()
		harness.awaitIdle()

		assertEquals(
			1,
			harness.transport.sendsFor(ENTRY_ONE),
			"one queued decision may reach the transport once per accepted attempt. The flush read " +
				"the queue while this entry's own send was still open, which is the resend the " +
				"contract forbids: only one pass in flight per core.",
		)
		assertTrue(harness.pendingStore().isEmpty(), "the one send still has to land")
		harness.assertAskedMidSend(ENTRY_ONE)
		assertEquals(0, flush.delivered, "a flush answered by the running send delivers nothing itself")
		assertEquals(1, flush.remaining, "the entry is still owed, and still counted by the pending depth")
		assertNull(flush.error, "nothing failed; another thread is sending it")
		harness.shutdown()
	}

	@Test
	fun `two flushes that overlap one running pass deliver each entry once`() {
		val harness = Harness()
		val kernel = harness.kernel()
		harness.transport.outcome = SaveOutcome.Unavailable("airplane mode")
		harness.boot(kernel)
		kernel.save(CommitIntent.All)
		kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to false)))
		assertEquals(2, harness.pendingDepth(), "both decisions are owed")
		val beforeOne = harness.transport.sendsFor(ENTRY_ONE)
		val beforeTwo = harness.transport.sendsFor(ENTRY_TWO)

		// The backend answers now, and two flushes arrive at once. The first starts a pass
		// that reads both entries and gets held inside the first send; the second asks while
		// that pass is running, so its read would find the second entry still on disk.
		harness.transport.outcome = SaveOutcome.Delivered
		harness.transport.holdSends()
		val passResult = AtomicReference<FlushResult?>()
		val pass = Thread {
			harness.timeline.record("flush:pass-start")
			passResult.set(kernel.flushPending())
		}.apply {
			name = "c15t-flush-a"
			isDaemon = true
			start()
		}
		assertTrue(
			harness.transport.awaitSendOpen(ENTRY_ONE, after = beforeOne),
			"the running pass has to be inside the first entry's send",
		)
		val second = harness.flushWhileSendOpen(kernel)

		harness.transport.releaseSends()
		pass.join(TimeUnit.MILLISECONDS.toMillis(WAIT_MS))
		harness.awaitIdle()

		assertEquals(
			1,
			harness.transport.sendsFor(ENTRY_ONE) - beforeOne,
			"the entry the running pass is sending must not be sent again by the second flush",
		)
		assertEquals(
			1,
			harness.transport.sendsFor(ENTRY_TWO) - beforeTwo,
			"the entry the running pass has not reached yet belongs to that pass",
		)
		assertTrue(harness.pendingStore().isEmpty(), "the one pass still has to land both entries")
		harness.assertAskedMidSend(ENTRY_ONE)
		assertEquals(0, second.delivered, "the second flush delivers nothing of its own")
		assertEquals(2, second.remaining, "both entries stay owed to the pass already running")
		val delivered = passResult.get()
		if (delivered != null) {
			assertEquals(2, delivered.delivered, "the one pass answers both entries")
		}
		harness.shutdown()
	}

	@Test
	fun `an entry queued after a running pass read is delivered by that pass`() {
		// A host may hand the core a concurrent TaskExecutor -- that is what the seam is for.
		// The second save's own first send then runs on its own thread while the first entry's
		// send is still open. It must not become a pass of its own, and it must not be dropped
		// either: a request answered by a running pass has to be seen by that pass, which
		// means reading the queue again after a read that predates this entry.
		val harness = Harness(pool = cachedExecutor("c15t-host-pool"))
		val kernel = harness.kernel()
		harness.boot(kernel)

		harness.transport.holdSends()
		assertTrue(kernel.save(CommitIntent.All).queued)
		assertTrue(harness.transport.awaitSendOpen(ENTRY_ONE), "the first save's send has to be open")

		assertTrue(kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to false))).queued)
		// Give a concurrent executor the chance to run this save's first send, so a zero below
		// means it was answered by the running pass rather than simply not scheduled yet. If it
		// is scheduled later, the exactly-once assertions after the release still hold.
		Thread.sleep(SETTLE_MS)
		assertEquals(0, harness.transport.sendsFor(ENTRY_TWO), "an entry queued mid-pass must not get a pass of its own")
		assertEquals(2, harness.pendingDepth())

		harness.transport.releaseSends()
		harness.awaitIdle()

		assertEquals(1, harness.transport.sendsFor(ENTRY_ONE))
		assertEquals(1, harness.transport.sendsFor(ENTRY_TWO), "no further flush was asked for, so the running pass took it")
		assertTrue(harness.pendingStore().isEmpty(), "both bodies land without another flush being asked for")
		harness.assertOldestFirst(ENTRY_ONE, ENTRY_TWO)
		harness.shutdown()
	}

	@Test
	fun `a send answered by a running pass is delivered by it and says nothing`() {
		val errors = CopyOnWriteArrayList<KernelError>()
		val harness = Harness(pool = cachedExecutor("c15t-host-pool"), logger = errors::add)
		val kernel = harness.kernel()
		harness.boot(kernel)

		harness.transport.holdSends()
		kernel.save(CommitIntent.All)
		assertTrue(harness.transport.awaitSendOpen(ENTRY_ONE))
		kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to false)))
		Thread.sleep(SETTLE_MS)
		harness.transport.releaseSends()
		harness.awaitIdle()

		// The second entry is answered, not dropped: one send each, both landed, and nothing left
		// owing. An attempt is spent by a send, so no row behind here means no attempt charged.
		assertEquals(
			listOf(1, 1),
			listOf(harness.transport.sendsFor(ENTRY_ONE), harness.transport.sendsFor(ENTRY_TWO)),
			"one send per queued decision, including the one whose own send was answered elsewhere",
		)
		assertTrue(harness.pendingStore().isEmpty(), "the entry that lost its send is still delivered")
		assertTrue(errors.isEmpty(), "nothing failed here, so nothing should be announced: $errors")
		harness.shutdown()
	}

	@Test
	fun `a first send that reaches its entry late sends nothing`() {
		// A pass reads the queue once and a save's first send carries one entry in hand, so
		// either can show up at a body the other already landed. A host executor that has not got
		// round to the task yet is enough to make that happen, and a manual executor makes it
		// certain: by the time these sends run, a pass has delivered both entries and released
		// the core, so nothing here is racing -- the sends are simply late.
		val errors = CopyOnWriteArrayList<KernelError>()
		val tasks = ManualExecutor()
		val harness = Harness(manual = tasks, logger = errors::add)
		val kernel = harness.kernel()
		kernel.bootstrap()
		while (tasks.runNext()) {
			// bootstrap's own flush and init, so the launch work is behind the test.
		}
		assertTrue(kernel.snapshot().ready, "bootstrap's init was one of the tasks run above")

		assertTrue(kernel.save(CommitIntent.All).queued)
		assertTrue(kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to false))).queued)

		val pass = kernel.flushPending()
		assertEquals(2, pass.delivered, "one pass owes both bodies")
		assertTrue(harness.pendingStore().isEmpty())
		assertEquals(1, harness.transport.sendsFor(ENTRY_ONE))
		assertEquals(1, harness.transport.sendsFor(ENTRY_TWO))

		while (tasks.runNext()) {
			// The two first sends, arriving after the entries stopped being owed.
		}

		assertEquals(
			1,
			harness.transport.sendsFor(ENTRY_ONE),
			"a send that is late to a body another pass already landed owes the backend nothing. " +
				"The frozen bytes carry the same consent id, so this is invisible except as a " +
				"second POST for a decision the subject already saw delivered.",
		)
		assertEquals(1, harness.transport.sendsFor(ENTRY_TWO))
		assertTrue(errors.isEmpty(), "nothing failed here, so nothing should be announced: $errors")
	}

	// -- harness --------------------------------------------------------------

	private fun singleThreadExecutor(name: String): ExecutorService =
		Executors.newSingleThreadExecutor { runnable -> thread(name, runnable) }

	private fun cachedExecutor(name: String): ExecutorService =
		Executors.newCachedThreadPool { runnable -> thread(name, runnable) }

	private fun thread(name: String, runnable: Runnable): Thread = Thread(runnable, name).apply { isDaemon = true }

	/**
	 * A kernel on in-memory doubles whose sends can be held open, with one timeline that the
	 * transport, the flush requests, and the assertions all read.
	 */
	private class Harness(
		pool: ExecutorService? = null,
		manual: ManualExecutor? = null,
		private val logger: (KernelError) -> Unit = {},
	) {
		private val pool: ExecutorService? = pool
		val timeline = Timeline()
		val transport = GatedTransport(timeline)
		private val backend = InMemoryKeyValueStore()
		private val store = C15tStore(SharedKeyValueStore(backend))

		/** Inline execution when no executor is given, which is what makes the saves answer. */
		private val executor: TaskExecutor? = when {
			manual != null -> TaskExecutor { task -> manual.submit(task) }

			pool != null -> TaskExecutor { task -> pool.execute(task) }

			else -> null
		}

		fun kernel(): C15tKernel = testKernel(
			store = store,
			transport = transport,
			executor = executor?.let { pool -> TaskExecutor { task -> pool.execute(task) } },
			logger = logger,
		)

		/**
		 * Bootstrap, then wait for what bootstrap dispatches to settle.
		 *
		 * A save that races init's publication is refused `concurrent-change`, which is the
		 * contract's guarded swap working as designed. A test that saves into that window is
		 * testing the wrong thing, so it waits for the first moment the snapshot stops moving.
		 */
		fun boot(kernel: C15tKernel) {
			kernel.bootstrap()
			await("the launch init to resolve") { kernel.snapshot().ready }
		}

		fun pendingDepth(): Int = pendingStore().size

		fun pendingStore() = store.readPending()

		/**
		 * Ask for a second delivery pass from a thread that is not the one holding a send open,
		 * and put the request on the transport's timeline.
		 *
		 * The open-send check on entry is what makes the overlap a fact rather than a hope.
		 * Without it, a scheduling hiccup would let the flush run once the send had landed, and
		 * the test would go green having proved nothing.
		 */
		fun flushWhileSendOpen(kernel: C15tKernel): FlushResult {
			assertEquals(1, transport.openSendCount, "a send must still be open when the flush is asked for")
			timeline.record("flush:request depth=${pendingDepth()}")
			val result = kernel.flushPending()
			timeline.record("flush:return delivered=${result.delivered}")
			return result
		}

		/**
		 * Prove the overlap the contract's test depends on: at the instant this thread asked for
		 * a pass, [entryId] had a send that had entered the transport on another thread and had
		 * not answered. Every event here was written by the harness, not inferred from a sleep,
		 * and the counts are what a scheduler hiccup cannot quietly move around.
		 */
		fun assertAskedMidSend(entryId: String) {
			val events = timeline.all()
			val request = events.indexOfFirst { it.startsWith("flush:request") }
			assertTrue(request >= 0, "the flush request was not recorded, got: $events")
			val before = events.subList(0, request)
			val enters = before.filter { it.startsWith("send:enter:$entryId") }
			val exits = before.count { it.startsWith("send:exit:$entryId") }
			assertTrue(enters.isNotEmpty(), "no send for $entryId had started, so there was nothing to overlap: $events")
			assertTrue(
				enters.size > exits,
				"$entryId had answered before the pass was asked for, so this test would have proven " +
					"nothing. Timeline: $events",
			)
			val sendThread = enters.last().substringAfterLast('@')
			val flushThread = events[request].substringAfterLast('@')
			assertTrue(sendThread != flushThread, "the pass has to come from another thread than the open send, got: $events")
			assertTrue(
				events.subList(request + 1, events.size).any { it.startsWith("send:exit:$entryId") },
				"the open send has to answer after the pass was asked for, got: $events",
			)
		}

		/** The queue's own order, oldest first, on the wire. */
		fun assertOldestFirst(vararg ids: String) {
			val events = timeline.all()
			val starts = ids.map { id -> events.indexOfFirst { it.startsWith("send:enter:$id") } }
			assertTrue(starts.all { it >= 0 }, "every entry has to reach the transport, got: $events")
			assertEquals(starts.sorted(), starts, "a pass replays oldest first, got: $events")
		}

		/**
		 * Wait until every send the test released has answered.
		 *
		 * This deliberately does not wait for the queue to empty. A core that runs two passes
		 * over one entry answers both sends and leaves the entry owed anyway, so "the queue
		 * drained" would be the wrong thing to wait on: the send counts are the finding.
		 */
		fun awaitIdle() {
			await("every released send to answer") { transport.openSendCount == 0 }
		}

		private inline fun await(what: String, condition: () -> Boolean) {
			val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(WAIT_MS)
			while (System.nanoTime() < deadline) {
				if (condition()) {
					return
				}
				Thread.sleep(5)
			}
			assertTrue(condition(), "timed out waiting for $what (${pendingDepth()} entries still queued)")
		}

		fun shutdown() {
			pool?.shutdownNow()
		}
	}

	/**
	 * An executor that runs nothing until a test says so. This is the only way to put a save's
	 * first send *behind* a pass that has already delivered the same body, which is the overlap
	 * a timed harness can only hope to catch.
	 */
	private class ManualExecutor {
		private val queue = ArrayDeque<() -> Unit>()

		fun submit(task: () -> Unit) {
			synchronized(queue) { queue.addLast(task) }
		}

		/** Run the oldest task handed over. `false` once there are none left. */
		fun runNext(): Boolean {
			val task = synchronized(queue) { queue.removeFirstOrNull() } ?: return false
			task()
			return true
		}
	}

	/** Append-only log with the writing thread's name, safe from the pool and the test thread. */
	private class Timeline {
		private val entries = mutableListOf<String>()

		fun record(event: String) {
			synchronized(entries) { entries += "$event@${Thread.currentThread().name}" }
		}

		fun all(): List<String> = synchronized(entries) { entries.toList() }
	}

	/**
	 * A transport that holds every save inside the backend until a test lets it go, which is
	 * how these tests keep a send "in flight" for exactly as long as they need it.
	 */
	private class GatedTransport(private val timeline: Timeline) : C15tTransport {
		/** What a send answers once the gate is open. */
		@Volatile
		var outcome: SaveOutcome = SaveOutcome.Delivered

		/** Scripted once so bootstrap's init stays out of the way. */
		@Volatile
		var initOutcome: TransportOutcome = initSuccess()

		private val entered = ConcurrentHashMap<String, AtomicInteger>()
		private val openSends = AtomicInteger(0)

		@Volatile
		private var gate = CountDownLatch(0)

		val openSendCount: Int
			get() = openSends.get()

		/** Hold every send inside [save] until [releaseSends]. */
		fun holdSends() {
			gate = CountDownLatch(1)
		}

		fun releaseSends() {
			gate.countDown()
		}

		fun sendsFor(id: String): Int = entered[id]?.get() ?: 0

		/**
		 * Wait for a send of [id] beyond the [after] the test already counted. While the gate is
		 * held, a send that has entered cannot have answered, so this is the open send.
		 */
		fun awaitSendOpen(id: String, after: Int = 0): Boolean {
			val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(WAIT_MS)
			while (System.nanoTime() < deadline) {
				if (sendsFor(id) > after) {
					return true
				}
				Thread.sleep(5)
			}
			return false
		}

		override fun init(context: InitContext): TransportOutcome = initOutcome

		override fun save(entry: QueuedSave): SaveOutcome {
			openSends.incrementAndGet()
			entered.computeIfAbsent(entry.id) { AtomicInteger() }.incrementAndGet()
			timeline.record("send:enter:${entry.id}")
			try {
				val opened = gate.await(GATE_MS, TimeUnit.MILLISECONDS)
				// A gate nobody opened means the test lost track of a send. Answer as an
				// unreachable backend so the kernel stays consistent, and let the send counts
				// report what actually happened instead of hanging the suite.
				return if (opened) outcome else SaveOutcome.Unavailable("the test never opened the send gate")
			} finally {
				openSends.decrementAndGet()
				timeline.record("send:exit:${entry.id}")
			}
		}

		override fun identify(
			subject: ConsentSubject,
			user: KernelUser,
		): TransportOutcome = TransportOutcome.Success(null, emptyMap())
	}

	/**
	 * The in-memory store behind one monitor. These tests put the queue's reads and writes on
	 * the host's threads, and [InMemoryKeyValueStore] is a `LinkedHashMap` underneath, so
	 * without this a failure could come from the fixture rather than the kernel. Thread safety
	 * of a real store, and of the queue's read-modify-write, is not what is under test here.
	 */
	private class SharedKeyValueStore(
		private val delegate: InMemoryKeyValueStore,
	) : KeyValueStore {
		override fun read(key: String): String? = synchronized(delegate) { delegate.read(key) }

		override fun write(
			key: String,
			value: String?,
		) = synchronized(delegate) { delegate.write(key, value) }

		override fun keys(): Set<String> = synchronized(delegate) { delegate.keys }

		override fun flush() = synchronized(delegate) { delegate.flush() }
	}

	private companion object {
		/** The queue ids [testKernel] mints, in enqueue order. */
		const val ENTRY_ONE = "00000001-0000-4000-8000-000000000000"
		const val ENTRY_TWO = "00000002-0000-4000-8000-000000000000"

		/** Long enough that a slow CI is not a failure, short enough to never hang the suite. */
		const val WAIT_MS = 10_000L

		/**
		 * How long a held send waits for its test. Shorter than [WAIT_MS] on purpose: a send the
		 * test forgot to release must answer as an unreachable backend before a wait gives up, so
		 * the failure names the double send rather than a timeout.
		 */
		const val GATE_MS = 3_000L

		/** How long a declined send is given to show up before a test calls it answered. */
		const val SETTLE_MS = 150L
	}
}
