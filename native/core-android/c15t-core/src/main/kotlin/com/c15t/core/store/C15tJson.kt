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
	/** Encoder/decoder for the persisted envelope and queue. */
	val storage: Json = Json {
		// Every key always present, so the reserved `iab` slot survives a
		// round trip and a JavaScript reader never has to branch.
		encodeDefaults = true
		explicitNulls = true
		ignoreUnknownKeys = true
		prettyPrint = false
	}

	/** Reader for untrusted wire documents; unknown keys tolerated, nulls not. */
	val wire: Json = Json {
		explicitNulls = true
		ignoreUnknownKeys = true
	}
}
