package com.c15t.core.store

import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.QueuedSave
import com.c15t.core.spi.KeyValueStore
import kotlinx.serialization.DeserializationStrategy
import kotlinx.serialization.json.Json

/**
 * Storage keys shared by every c15t native core.
 *
 * The names match the iOS Keychain item keys in `native/CONTRACT.md` so a
 * cross-platform reader can address the same slots.
 */
object C15tStoreKeys {
	const val SNAPSHOT = "com.c15t.snapshot"
	const val SUBJECT = "com.c15t.subject"
	const val PENDING = "com.c15t.pending"
}

/**
 * Typed persistence over a host [KeyValueStore].
 *
 * Every read is fail-closed: anything this build cannot parse comes back as
 * `null`, and the caller serves the deny-all snapshot. That covers a payload
 * written by a newer build, a truncated write, and a tampered or decrypted-to-
 * garbage blob from the encryption layer.
 */
class C15tStore(
	private val backend: KeyValueStore,
	private val json: Json = C15tJson.storage,
	private val onReadFailure: (String, Throwable) -> Unit = { _, _ -> },
) {
	/** Read the stored subject, or `null` when absent or unparseable. */
	fun readSubject(): ConsentSubject? = tryDecode(C15tStoreKeys.SUBJECT, ConsentSubject.serializer())

	/** Persist [subject]. */
	fun writeSubject(subject: ConsentSubject) {
		backend.write(C15tStoreKeys.SUBJECT, json.encodeToString(ConsentSubject.serializer(), subject))
	}

	/**
	 * Read the stored envelope, or `null` when absent or unparseable.
	 *
	 * Unparseable includes a payload from before the overrides and privacy signals
	 * were corrected. The storage codec tolerates unknown keys so an additive field
	 * costs nobody their stored consent, which would otherwise let `overrides.test`
	 * and `privacySignals.msa` vanish quietly and leave a snapshot whose signals
	 * disagree with the decisions inside it. [RetiredWireFields] turns that into a
	 * read failure, and a read failure is deny-all.
	 */
	fun readEnvelope(): SnapshotEnvelope? = tryDecode(C15tStoreKeys.SNAPSHOT, SnapshotEnvelope.serializer()) { raw ->
		RetiredWireFields.assertReadable(json, raw)
	}

	/** Persist [envelope] so the next cold start answers synchronously. */
	fun writeEnvelope(envelope: SnapshotEnvelope) {
		backend.write(C15tStoreKeys.SNAPSHOT, json.encodeToString(SnapshotEnvelope.serializer(), envelope))
	}

	/** Read the offline write queue; an unparseable queue reads as empty. */
	fun readPending(): List<QueuedSave> =
		tryDecode(C15tStoreKeys.PENDING, PendingQueue.serializer())?.entries ?: emptyList()

	/** Replace the whole offline write queue. */
	fun writePending(entries: List<QueuedSave>) {
		backend.write(C15tStoreKeys.PENDING, json.encodeToString(PendingQueue.serializer(), PendingQueue(entries)))
	}

	/** Drop stored consent state, keeping the subject id so identity survives. */
	fun clearConsentState() {
		backend.write(C15tStoreKeys.SNAPSHOT, null)
		backend.write(C15tStoreKeys.PENDING, null)
		backend.flush()
	}

	/** Flush buffered writes to durable storage. */
	fun flush() = backend.flush()

	private fun <T : Any> tryDecode(
		key: String,
		deserializer: DeserializationStrategy<T>,
		inspect: (String) -> Unit = {},
	): T? {
		val raw = try {
			backend.read(key)
		} catch (error: Exception) {
			onReadFailure(key, error)
			return null
		}
		if (raw.isNullOrEmpty()) {
			return null
		}
		return try {
			inspect(raw)
			json.decodeFromString(deserializer, raw)
		} catch (error: Exception) {
			onReadFailure(key, error)
			null
		}
	}
}
