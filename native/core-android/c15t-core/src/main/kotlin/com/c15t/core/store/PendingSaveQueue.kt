package com.c15t.core.store

import com.c15t.core.model.QueuedSave
import com.c15t.core.model.SavePayload
import java.util.UUID

/**
 * The offline consent-write queue.
 *
 * Rules from `native/CONTRACT.md`, all enforced here:
 * - the payload is persisted before the request, never after;
 * - one entry per explicit action, replayed unchanged, so a later init cannot
 * rewrite a queued payload;
 * - at most [limit] entries, oldest dropped first.
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
	 * Persist [payload] as a queued write and return the entry the caller must
	 * hand to the transport.
	 */
	fun enqueue(payload: SavePayload, queuedAt: Long): QueuedSave {
		val entry = QueuedSave(id = idGenerator(), queuedAt = queuedAt, payload = payload)
		val current = store.readPending()
		// Oldest dropped first, newest kept.
		val next = (current + entry).takeLast(maxOf(1, limit))
		store.writePending(next)
		return entry
	}

	/** Everything still waiting, oldest first. */
	fun pending(): List<QueuedSave> = store.readPending()

	/** Drop one delivered entry. Unknown ids are ignored. */
	fun complete(id: String) {
		val current = store.readPending()
		val next = current.filterNot { it.id == id }
		if (next.size != current.size) {
			store.writePending(next)
		}
	}

	/** Forget the queue, for a host that wipes consent state. */
	fun clear() = store.writePending(emptyList())

	companion object {
		/** Contract maximum: keep the newest 20 payloads. */
		const val DEFAULT_LIMIT = 20
	}
}
