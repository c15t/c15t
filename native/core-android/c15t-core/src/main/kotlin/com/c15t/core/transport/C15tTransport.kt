package com.c15t.core.transport

import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.KernelUser
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelError
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.QueuedSave
import com.c15t.core.model.SavePayload

/** Context the core passes to `init`. */
data class InitContext(
	val overrides: KernelOverrides,
	val subject: ConsentSubject?,
	/** `true` when the device reports GPC or the developer forced it on. */
	val gpc: Boolean,
	/**
	 * The vendor scope `NativeConfig.vendors` declares, passed through unchanged.
	 *
	 * The core hands its declaration down rather than letting the transport read it off
	 * the [com.c15t.core.NativeConfig] it is already handed, so that both cores put the
	 * scope on the wire through one shape -- `core-swift`'s transport is constructed
	 * without any consent configuration at all, and a Kotlin transport that kept its own
	 * copy of one fact the kernel also holds is a second answer waiting to drift. It also
	 * means a test that drives a transport directly, or a host that swaps one in, still
	 * sees the declaration travel with the request it is supposed to shape.
	 */
	val vendors: List<Int>? = null,
)

/**
 * The three async commands the core delegates.
 *
 * Implementations must be thread safe. They must not throw for a non-2xx status:
 * report it as [TransportOutcome.HttpFailure] and let the core decide. The core
 * treats a thrown exception as a connectivity failure and keeps the previous
 * state, which is what makes a retry meaningful.
 */
interface C15tTransport {
	/** Fetch policy, location, translations, and any server-side subject id. */
	fun init(context: InitContext): TransportOutcome

	/** Deliver one queued consent write. [payload] must be sent byte for byte. */
	fun save(entry: QueuedSave): SaveOutcome

	/** Attach an external identity to the subject. */
	fun identify(
		subject: ConsentSubject,
		user: KernelUser,
	): TransportOutcome

	/** Detach the external identity. */
	fun logout(subject: ConsentSubject): TransportOutcome = TransportOutcome.Success(null, emptyMap())

	companion object {
		/**
		 * A transport that answers nothing. Commands become local-only, which is
		 * the right behaviour for an app that ships without a backend, and the
		 * fail-closed path a test drives.
		 */
		val NONE: C15tTransport = object : C15tTransport {
			override fun init(context: InitContext): TransportOutcome = TransportOutcome.NetworkFailure("no transport configured")

			override fun save(entry: QueuedSave): SaveOutcome = SaveOutcome.Unavailable("no transport configured")

			override fun identify(
				subject: ConsentSubject,
				user: KernelUser,
			): TransportOutcome = TransportOutcome.NetworkFailure("no transport configured")
		}
	}
}

/** A transport failure the core surfaces to the host. */
fun transportError(
	reason: String,
	detail: String?,
): KernelError = KernelError(
	code = reason,
	message = detail ?: "c15t transport: $reason",
)

/** Whether a save outcome means "remove from the queue". */
val SaveOutcome.delivered: Boolean
	get() = this is SaveOutcome.Delivered

/** The resolution reason a failed init should record, or `null` on success. */
fun TransportOutcome.failureReason(): String? = when (this) {
	is TransportOutcome.HttpFailure -> PolicyResolution.REASON_TRANSPORT
	is TransportOutcome.NetworkFailure -> PolicyResolution.REASON_TRANSPORT
	is TransportOutcome.Success -> null
}
