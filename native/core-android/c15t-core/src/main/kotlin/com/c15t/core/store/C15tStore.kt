package com.c15t.core.store

import com.c15t.core.SubjectIdGenerator
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
 * A stored subject id that this build cannot use, reported by the read that refused it.
 *
 * It travels as a value rather than as a log line because the caller has a decision to
 * make with it: the records written under this id are keyed to a subject the producer
 * will not answer a query for, so they go with it. [legacyUuidShape] is what lets the
 * host tell an install written by a prerelease build apart from a store somebody
 * corrupted, which are two different things to explain to a user.
 */
data class UnusableSubjectId(
	val id: String,
	val legacyUuidShape: Boolean,
)

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
	/**
	 * Set by the read that refused a stored id, cleared when [takeUnusableSubject] hands it
	 * over. Guarded by the instance rather than by a process flag because a host that runs
	 * two stores gets two honest reads, and neither one should silence the other.
	 */
	private var unusableSubject: UnusableSubjectId? = null

	/**
	 * Read the stored subject, or `null` when absent, unparseable, or unusable.
	 *
	 * Unusable is the read-side half of the format rule, and it is the reason a prerelease
	 * install sits at `INPUT_VALIDATION_FAILED` forever: an id the producer refuses can
	 * never carry a save, so it is not an identity this build can answer with. Adopting it
	 * again keeps the core reporting a committed save that cannot land and a subject whose
	 * consent no query returns. Such an id reads as absent and is left in
	 * [takeUnusableSubject] for whoever is going to say so out loud.
	 *
	 * The stored value is not rewritten here. Dropping the identity is a decision with a
	 * snapshot and a queue attached to it, and a store that quietly repaired an id would
	 * make that decision invisible.
	 */
	fun readSubject(): ConsentSubject? {
		val stored = tryDecode(C15tStoreKeys.SUBJECT, ConsentSubject.serializer()) ?: return null
		if (SubjectIdGenerator.isValid(stored.id)) {
			return stored
		}
		unusableSubject = UnusableSubjectId(
			id = stored.id,
			legacyUuidShape = SubjectIdGenerator.isLegacyUuidShape(stored.id),
		)
		return null
	}

	/**
	 * Take the id the most recent [readSubject] refused, and clear it.
	 *
	 * Consuming it is what makes "announce this once per launch" fall out of the read
	 * instead of a counter somebody has to remember to reset: a second read of the same
	 * identity has nothing left to report.
	 */
	fun takeUnusableSubject(): UnusableSubjectId? = unusableSubject.also { unusableSubject = null }

	/**
	 * The refused id standing unannounced, without consuming it.
	 *
	 * [readEnvelope] consults this so the rule does not depend on which of the two reads
	 * a caller happens to do first: an envelope whose identity has already been refused is
	 * unreadable either way.
	 */
	val hasUnusableSubject: Boolean
		get() = unusableSubject != null

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
	 * slot. An unreadable envelope costs the records and not the identity, because the
	 * subject id lives under its own key.
	 *
	 * The other direction is the one that needs saying: the records are attributed to that
	 * subject, so an identity [readSubject] refused makes this envelope unreadable too.
	 * Restoring it under a replacement id would credit a decision to a subject that never
	 * made it, and the next launch would keep that credit under a name the old records
	 * were never filed under.
	 */
	fun readEnvelope(): SnapshotEnvelope? {
		if (hasUnusableSubject) {
			return null
		}
		return tryDecode(C15tStoreKeys.SNAPSHOT, SnapshotEnvelope.serializer()) { raw ->
			RetiredWireFields.assertReadable(json, raw)
		}
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
