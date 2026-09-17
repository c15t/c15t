package com.c15t.reactnative

import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelError

/** Where the pump pushes an event. The module wires it to the JS emitter. */
fun interface C15tEventSink {
	/** Deliver [payload] for [event] to JavaScript. */
	fun emit(
		event: String,
		payload: String,
	)
}

/**
 * Turns core state changes into the three events the contract defines.
 *
 * A `snapshot` event carries the new revision and a dirty flag and nothing else, so
 * the whole snapshot is never copied across the bridge for a subscriber that already
 * holds it: JavaScript compares the revision and pulls with `getSnapshot()` when it
 * cares. That is also why a dropped event costs nothing.
 *
 * Emission is deduplicated by revision. The core publishes a new snapshot per
 * mutation, and a subscriber must see exactly one event per committed change, so the
 * comparison lives here rather than in JavaScript, where two callers would each have
 * to get it right.
 */
class C15tChangePump(private val sink: C15tEventSink) {
	private val lock = Any()

	private var lastRevision = UNSET_REVISION

	private var initializedAnnounced = false

	/** Report a published snapshot, emitting at most one `snapshot` event for it. */
	fun onSnapshot(snapshot: ConsentSnapshot) {
		val emitSnapshot: Boolean
		val emitInitialized: Boolean
		synchronized(lock) {
			if (snapshot.revision == lastRevision) {
				return
			}
			lastRevision = snapshot.revision
			emitSnapshot = true
			emitInitialized = !initializedAnnounced && !snapshot.policyPending
			if (emitInitialized) {
				initializedAnnounced = true
			}
		}
		if (emitSnapshot) {
			sink.emit(EVENT_SNAPSHOT, C15tPayload.snapshotEvent(snapshot.revision))
		}
		if (emitInitialized) {
			sink.emit(EVENT_INITIALIZED, C15tPayload.initializedEvent(snapshot.revision))
		}
	}

	/** Report an error the core emitted, in the `NativeSnapshotError` shape. */
	fun onError(error: KernelError) {
		sink.emit(EVENT_ERROR, C15tPayload.errorEvent(error))
	}

	companion object {
		/** Event names, matching `NATIVE_EVENT_NAMES` in `src/protocol`. */
		const val EVENT_SNAPSHOT = "snapshot"

		const val EVENT_ERROR = "error"
		const val EVENT_INITIALIZED = "initialized"

		/** A revision no snapshot can have, so the first one always emits. */
		private const val UNSET_REVISION = Long.MIN_VALUE
	}
}
