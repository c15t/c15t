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
}
