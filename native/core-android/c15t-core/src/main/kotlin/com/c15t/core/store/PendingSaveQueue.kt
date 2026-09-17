package com.c15t.core.store

import com.c15t.core.model.QueuedSave
import com.c15t.core.model.SavePayload
import java.util.UUID

/**
 * What the queue decided to do with an entry after a delivery attempt failed.
 *
 * The distinction that matters is between "still owed" and "no longer owed", so every
 * case other than [Retrying] is one the caller has to announce. A queue that releases a
 * decision quietly is the state where a subject's consent exists in the app's memory of
 * itself and in nobody else's records.
 */
sealed class FailedAttempt {
	/** Still queued, with one attempt spent. */
	data object Retrying : FailedAttempt()

	/** Was not in the queue: another path delivered it, or a reset cleared it. */
	data object AlreadyGone : FailedAttempt()

	/** Released at the attempt ceiling. */
	data class DroppedAfterAttempts(val attempts: Int) : FailedAttempt()

	/** Released because it waited longer than the queue's retention window. */
	data class DroppedAsTooOld(val queuedAt: Long) : FailedAttempt()

	/** Whether this leaves the queue holding one fewer obligation. */
	val dropsEntry: Boolean
		get() = this is DroppedAfterAttempts || this is DroppedAsTooOld
}

/**
 * The offline consent-write queue.
 *
 * Rules from `native/CONTRACT.md`, all enforced here:
 * - the payload is persisted before the request, never after;
 * - one entry per explicit action, replayed unchanged, so a later init cannot
 * rewrite a queued payload;
 * - at most [limit] entries, oldest dropped first;
 * - age and attempt ceilings are released when a delivery fails, never on a read.
 *
 * Entries are removed only after the backend accepts them, which makes a crash
 * mid-flush replay that one write again rather than lose it.
 */
class PendingSaveQueue(
	private val store: C15tStore,
	private val limit: Int = DEFAULT_LIMIT,
	/**
	 * Row ids for [QueuedSave]. A UUID stays right here: an entry keys a local row
	 * and never goes on the wire, so it is not held to the `sub_` format the backend
	 * requires of a subject id.
	 */
	private val idGenerator: () -> String = { UUID.randomUUID().toString() },
) {
	/**
	 * Persist [payload] as a queued write, and return the entry the caller must hand to
	 * the transport -- or `null` when the write did not land.
	 *
	 * `null` means "do not send, and do not claim the decision". Sending bytes that are
	 * not durable would break the exactly-once story the queue exists for, and answering
	 * a caller that the commit stood when nothing has to deliver it is worse than a
	 * refusal they can act on. [C15tStore.writePending] is what proves the write.
	 */
	fun enqueue(payload: SavePayload, queuedAt: Long): QueuedSave? {
		val entry = QueuedSave(id = idGenerator(), queuedAt = queuedAt, payload = payload)
		val current = store.readPending()
		// Oldest dropped first, newest kept.
		val next = (current + entry).takeLast(maxOf(1, limit))
		return entry.takeIf { store.writePending(next) }
	}

	/** Everything still waiting, oldest first. */
	fun pending(): List<QueuedSave> = store.readPending()

	/**
	 * Drop one delivered entry, reporting whether the queue is clear of it.
	 *
	 * `true` includes "the id was already gone", which is the honest answer for a caller
	 * deciding whether it may stop owing this body: an absent entry is not owed anything.
	 * `false` means the removal did not persist, so the caller must keep the obligation
	 * rather than report a delivery no storage remembers.
	 */
	fun complete(id: String): Boolean {
		val current = store.readPending()
		val next = current.filterNot { it.id == id }
		if (next.size == current.size) {
			return true
		}
		return store.writePending(next)
	}

	/**
	 * Account for a delivery attempt that did not land.
	 *
	 * Every failed send spends an attempt, whether it came from the save that queued the
	 * body or from a later replay. Without that, the attempt ceiling is only ever reached
	 * by replays, so a body the transport refuses on the first try stays queued across
	 * every launch, which is the state where a consent decision looks delivered to
	 * everyone and is remembered by nothing.
	 *
	 * The ceilings are enforced here, at the moment a delivery fails, rather than on read,
	 * so a live read never drops something its caller is about to send.
	 *
	 * @param now Epoch milliseconds, injected so the retention window is testable rather
	 * than dependent on a second clock the queue would have to be told about.
	 * @returns What the queue did with the entry, including which ceiling released it. The
	 * reason is part of the answer, not a detail: an entry that ran out of attempts and an
	 * entry that went stale are two different things to debug, and the caller gets one
	 * error event to say it in.
	 */
	fun recordFailedAttempt(
		id: String,
		now: Long,
	): FailedAttempt {
		val cutoff = now - MAX_AGE_MS
		val current = store.readPending()
		val index = current.indexOfFirst { it.id == id }
		if (index < 0) {
			return FailedAttempt.AlreadyGone
		}
		val entry = current[index].let { it.copy(attempts = it.attempts + 1) }
		val outcome = when {
			entry.attempts >= MAX_ATTEMPTS -> FailedAttempt.DroppedAfterAttempts(entry.attempts)
			entry.queuedAt < cutoff -> FailedAttempt.DroppedAsTooOld(entry.queuedAt)
			else -> FailedAttempt.Retrying
		}
		val next = if (outcome.dropsEntry) {
			current.filterIndexed { at, _ -> at != index }
		} else {
			current.toMutableList().also { it[index] = entry }
		}
		// A write that did not land leaves the entry where it was, at the count it had.
		// The next failure decides again, so the ceilings are slower to reach, never
		// looser than they look: the answer here describes this decision, not the
		// durability of the bookkeeping behind it.
		store.writePending(next)
		return outcome
	}

	/** Forget the queue, for a host that wipes consent state. */
	fun clear() {
		store.writePending(emptyList())
	}

	companion object {
		/** Contract maximum: keep the newest 20 payloads. */
		const val DEFAULT_LIMIT = 20

		/**
		 * An entry that has waited longer than this is not worth delivering: the subject's
		 * decision is stale enough that a newer action, or a newer policy, supersedes it.
		 * The Swift core's `PendingSaveQueue.maxAgeMs` holds the same window.
		 */
		const val MAX_AGE_MS = 7L * 24 * 60 * 60 * 1_000

		/**
		 * Past this many tries the entry is released. A backend that has refused a body
		 * nine times will not accept it on the tenth. The Swift core's
		 * `PendingSaveQueue.maxAttempts` holds the same ceiling.
		 */
		const val MAX_ATTEMPTS = 10
	}
}
