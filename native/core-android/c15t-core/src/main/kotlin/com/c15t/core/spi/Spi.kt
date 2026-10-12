package com.c15t.core.spi

/**
 * String-keyed persistence the host supplies.
 *
 * The core never opens a file, a database, or a `SharedPreferences` handle. On
 * iOS the conformance is a Keychain generic password item, on Android an
 * AndroidKeyStore-backed file with a `SharedPreferences` fallback. Keys follow
 * the shared mobile contract: `com.c15t.snapshot`, `com.c15t.subject`,
 * `com.c15t.pending`.
 */
interface KeyValueStore {
	/** Read a value, or `null` when the key has nothing stored. */
	fun read(key: String): String?

	/** Write [value]; passing `null` removes the key. */
	fun write(
		key: String,
		value: String?,
	)

	/**
	 * The keys this store currently holds.
	 *
	 * Optional, and `emptySet()` means "cannot enumerate", never "holds nothing": a
	 * caller must treat it as nothing to clean up. The one consumer is the resilience
	 * wrapper, which clears a protected store it has given up on so blobs the dead
	 * key can no longer read do not linger and resurface.
	 */
	fun keys(): Set<String> = emptySet()

	/** Push buffered writes to durable storage. Optional. */
	fun flush() = Unit
}

/** Time source, injected so tests and benchmarks control the clock. */
fun interface Clock {
	/** Epoch milliseconds. */
	fun nowMillis(): Long

	companion object {
		/** Wall-clock default. */
		val SYSTEM = Clock { System.currentTimeMillis() }
	}
}

/** Where the core runs background work such as init and network delivery. */
fun interface TaskExecutor {
	/** Run [task] off the calling thread. */
	fun execute(task: () -> Unit)

	companion object {
		/**
		 * Run tasks inline on the calling thread. Useful in tests and for a host
		 * that already owns a thread; it must not be used for real network I/O.
		 */
		val DIRECT = TaskExecutor { it() }
	}
}

/** A minimal HTTP request the host's client must carry. */
data class HttpRequest(
	val method: String,
	val url: String,
	val headers: Map<String, String> = emptyMap(),
	val body: String? = null,
) {
	companion object {
		const val GET = "GET"
		const val POST = "POST"
		const val PATCH = "PATCH"
	}
}

/** A minimal HTTP response, with the headers the core needs to inspect. */
data class HttpResponse(
	val status: Int,
	val headers: Map<String, String> = emptyMap(),
	val body: String? = null,
) {
	val ok: Boolean
		get() = status in 200..299

	/** Case-insensitive header lookup, matching what HTTP requires. */
	fun header(name: String): String? {
		for ((key, value) in headers) {
			if (key.equals(name, ignoreCase = true)) {
				return value
			}
		}
		return null
	}
}

/**
 * Transport the host provides for c15t-backend-bound traffic.
 *
 * Implementations must be thread safe and must never throw for a non-2xx
 * status: report the status and let the core decide. They may throw for a
 * transport failure such as no connectivity, which the core treats as a retry
 * condition rather than a policy answer.
 */
interface HttpClient {
	/** Send [request] and return the response. */
	fun send(request: HttpRequest): HttpResponse
}

/**
 * Supplies the symmetric key that protects stored consent.
 *
 * The Android conformance holds an AndroidKeyStore alias; the key material never
 * leaves the secure element and the core only ever sees a handle it can pass to
 * `javax.crypto`.
 */
interface SymmetricKeyProvider {
	/** Return, creating on first use, the key for this installation. */
	fun key(): javax.crypto.SecretKey

	/** Destroy the key, which makes stored data unreadable. Used by `logout`. */
	fun deleteKey() = Unit
}
