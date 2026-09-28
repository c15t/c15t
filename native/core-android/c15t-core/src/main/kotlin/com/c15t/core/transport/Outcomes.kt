package com.c15t.core.transport

import kotlinx.serialization.json.JsonElement

/** Result of a transport call that answers with a document. */
sealed class TransportOutcome {
	/**
	 * A 2xx response. [body] is `null` when it carried no readable JSON.
	 *
	 * [headers] must be keyed by lower-cased header name; [header] enforces the
	 * case-insensitive lookup HTTP requires.
	 */
	data class Success(val body: JsonElement?, val headers: Map<String, String>) : TransportOutcome() {
		/** Case-insensitive header read. */
		fun header(name: String): String? = headers[name.lowercase()]
	}

	/** A non-2xx response: the backend answered, but not with a policy. */
	data class HttpFailure(val status: Int) : TransportOutcome()

	/** No usable answer: no connectivity, DNS, TLS, or a crashed client. */
	data class NetworkFailure(val message: String) : TransportOutcome()
}

/** Result of delivering a consent write. */
sealed class SaveOutcome {
	/** The backend accepted the payload. */
	data object Delivered : SaveOutcome()

	/** The backend answered a non-2xx status; the payload stays queued. */
	data class Rejected(val status: Int) : SaveOutcome()

	/** Unreachable; the payload stays queued for the next launch or foreground. */
	data class Unavailable(val message: String) : SaveOutcome()

	/**
	 * The body declares a consent contract this build cannot speak, so nothing on either
	 * side will ever read it the same way twice.
	 *
	 * Distinct from [Rejected] because it never carried a status: a refusal to negotiate
	 * is not a refusal of the bytes, and the queue has to tell those apart. Only the
	 * second one is worth twenty slots on every future launch.
	 */
	data class UnsupportedContract(val declared: String?, val expected: Int) : SaveOutcome()

	/**
	 * Whether retrying this exact body can ever change the answer.
	 *
	 * The queue replays frozen bytes -- that is the whole point of it, so a replay carries
	 * the receipts the subject actually gave. Freezing cuts the other way too: a refusal
	 * that came from reading those bytes says the same thing on the eleventh try as on
	 * the first. `4xx` is that case, and so is a contract this build cannot speak.
	 *
	 * `408`, `425`, and `429` are excluded because they are about the request's timing,
	 * not its contents: the same body may be accepted a moment later. So are `5xx`, a
	 * timeout, and a dropped socket. `401` and `403` do count as permanent for a body,
	 * which is not the same claim as permanent for a device -- the queue holds bodies and
	 * nothing else, so a credential that comes back later cannot rescue bytes the producer
	 * already refused on its own terms.
	 *
	 * The Swift core's `C15tError.isPermanentlyRejected` answers the same question over a
	 * different type, and the two sets have to stay the same set: an entry must not expire
	 * on one platform and queue forever on the other.
	 */
	val isPermanentlyRejected: Boolean
		get() = when (this) {
			is Rejected -> status in 400..499 && status != 408 && status != 425 && status != 429
			is UnsupportedContract -> true
			is Delivered,
			is Unavailable,
			-> false
		}
}
