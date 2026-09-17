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
	/**
	 * Codec for the offline queue alone. It tolerates unknown keys, which is the opposite
	 * of [json]; see [C15tJson.queue] for why that asymmetry is on purpose.
	 */
	private val queueJson: Json = C15tJson.queue,
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
	 * Unparseable covers a truncated write, a payload from a newer build, a document
	 * from another codec, and anything carrying a key this build does not model --
	 * [RetiredWireFields] names the retired ones, and the storage codec refuses any
	 * other unknown key rather than dropping it on the next write. Either way a read
	 * failure is deny-all, and the device answers exactly as it would with an empty
	 * slot. The subject id lives under its own key, so this does not cost the device
	 * its identity.
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
		tryDecode(C15tStoreKeys.PENDING, PendingQueue.serializer(), queueJson)?.entries ?: emptyList()

	/**
	 * Replace the whole offline write queue, and report whether the bytes came back.
	 *
	 * The read-back is the only durability signal this seam offers. [KeyValueStore.write]
	 * returns `Unit`, and a host store is allowed to swallow a failed write rather than
	 * throw out of a launch hook -- [ResilientKeyValueStore] does exactly that once it has
	 * given up on its key. Without the read-back, a caller above cannot tell a queue that
	 * wrote from a queue that quietly did not, which is the difference between a save that
	 * owes delivery and a save that only believes it does.
	 *
	 * Comparison is on the plaintext that went in, not on the stored blob: an encrypted
	 * store returns ciphertext, and it is the round trip through decryption that is being
	 * proven.
	 */
	fun writePending(entries: List<QueuedSave>): Boolean {
		val raw = queueJson.encodeToString(PendingQueue.serializer(), PendingQueue(entries))
		backend.write(C15tStoreKeys.PENDING, raw)
		return backend.read(C15tStoreKeys.PENDING) == raw
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
		json: Json = this.json,
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
