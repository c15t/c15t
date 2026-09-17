package com.c15t.core.store

import kotlinx.serialization.json.Json

/**
 * JSON configuration shared by the storage layer and the wire readers.
 *
 * `coerceInputValues` stays off on purpose. When the backend sends `null` for a
 * field the model declares non-null, the default coercion would silently invent
 * a value, and an invented permission is exactly what the contract forbids. Here
 * it throws, and every caller turns that throw into the deny-all snapshot.
 */
object C15tJson {
	/**
	 * Encoder/decoder for the persisted envelope and queue.
	 *
	 * Unknown keys are refused rather than skipped. A stored field this build cannot
	 * name is a field it will not write back, so skipping it would restore every other
	 * fact, answer as though nothing were wrong, and then quietly delete that field on
	 * the next publish: the newest thing the subject decided gone behind a snapshot
	 * whose numbers still look healthy. Refusing the payload is what
	 * `native/CONTRACT.md` calls an unreadable envelope, and the answer to one is
	 * nothing applied and a device that behaves like a fresh install.
	 */
	val storage: Json = Json {
		// Every key always present, so the reserved `iab` slot survives a
		// round trip and a JavaScript reader never has to branch.
		encodeDefaults = true
		explicitNulls = true
		ignoreUnknownKeys = false
		prettyPrint = false
	}

	/** Reader for untrusted wire documents; unknown keys tolerated, nulls not. */
	val wire: Json = Json {
		explicitNulls = true
		ignoreUnknownKeys = true
	}

	/**
	 * Codec for the offline write queue.
	 *
	 * The queue is the one persisted payload that tolerates a key it does not model, and
	 * deliberately so. Its entries are request bodies the core already built, so a name
	 * this build has never seen never reached the wire and costs nothing to replay.
	 * Dropping an entry would cost a subject the consent action they actually took,
	 * which is a worse outcome than carrying a stray field forward. Stored consent is not
	 * given the same latitude: see [storage].
	 */
	val queue: Json = Json {
		encodeDefaults = true
		explicitNulls = true
		ignoreUnknownKeys = true
		prettyPrint = false
	}
}
