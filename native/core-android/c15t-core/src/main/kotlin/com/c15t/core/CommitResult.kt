package com.c15t.core

import com.c15t.core.model.KernelError

/**
 * Outcome of [C15tKernel.save].
 *
 * The commit is local and synchronous: permissions are already updated and the
 * payload is already on disk when this returns. Delivery is a separate fact, which
 * is why [queued] and [delivered] are distinct: a commit made on a plane has
 * `queued = true, delivered = false` and still gates correctly.
 */
data class CommitResult(
	val ok: Boolean,
	/** Revision the commit published. */
	val revision: Long,
	/** Exactly the categories this action confirmed. */
	val confirmed: Map<String, Boolean>,
	/** The payload is persisted and waiting for, or undergoing, delivery. */
	val queued: Boolean,
	/** The backend accepted it before this call returned. */
	val delivered: Boolean,
	val error: KernelError? = null,
)

/** Outcome of [C15tKernel.flushPending]. */
data class FlushResult(
	/** Entries the backend accepted during this flush. */
	val delivered: Int,
	/** Entries still queued afterwards. */
	val remaining: Int,
	/** Set when the backend refused a payload, which a retry will not fix. */
	val error: KernelError? = null,
)

/**
 * Handle for a registered observer.
 *
 * Call [close] to stop receiving callbacks. For `onChange` observers the core only
 * holds a weak reference, so the caller must keep the lambda reachable; a
 * discarded handle is harmless once the observer is unreachable.
 */
fun interface Subscription {
	/** Stop observing. Safe to call more than once. */
	fun close()
}
