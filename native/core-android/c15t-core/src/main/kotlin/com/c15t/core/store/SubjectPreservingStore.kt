package com.c15t.core.store

import com.c15t.core.spi.KeyValueStore

/**
 * Keeps the subject id out of the storage that encryption protects.
 *
 * The subject id is a random `sub_` id that c15t generates itself: it is not
 * sensitive and it is not a hardware identifier, so encrypting it buys nothing while
 * costing everything. As long as it sat in the same slot as the consent records, a
 * lost AndroidKeyStore key took the identity with it, and the next launch resolved a
 * fresh id. Every consent record the backend holds against the old id was then
 * orphaned, so audit continuity broke exactly when the device was already in
 * trouble. Here the id goes to [identity], which no key protects and therefore no
 * key reset can destroy, while [records] keeps carrying the encrypted consent state.
 *
 * It also migrates. Before this layout, the id lived inside [records]; installs that
 * upgraded from those keep the id they have rather than adopting a new one, because
 * [recoverSubjectIfNeeded] runs on the first read and before the first write, which in
 * practice is the hydration read in `bootstrap` and so precedes any encrypted write.
 *
 * @param records Consent state: the envelope, the queue. Encrypted where the platform
 * allows, and the part the contract accepts losing when a key is gone.
 * @param identity The subject id's own storage, deliberately outside the encrypted
 * path. Passing [records] for both is allowed and means "no separate identity store":
 * the wrapper then stays out of the way entirely, which reproduces the old behaviour.
 * It must not try to migrate in that case, because moving the id from a store to
 * itself would delete it.
*/
class SubjectPreservingStore(
	private val records: KeyValueStore,
	private val identity: KeyValueStore,
) : KeyValueStore {
	@Volatile
	private var recovered = false

	/** One store for both roles has nothing to move, so there is nothing to migrate. */
	private val migrates = identity !== records

	override fun read(key: String): String? {
		recoverSubjectIfNeeded()
		return if (key == C15tStoreKeys.SUBJECT) identity.read(key) else records.read(key)
	}

	override fun write(
		key: String,
		value: String?,
	) {
		recoverSubjectIfNeeded()
		if (key == C15tStoreKeys.SUBJECT) {
			identity.write(key, value)
		} else {
			records.write(key, value)
		}
	}

	override fun keys(): Set<String> = records.keys() + identity.keys()

	override fun flush() {
		records.flush()
		identity.flush()
	}

	/**
	 * Move a pre-existing subject id into [identity], once per instance.
	 *
	 * Idempotent by construction rather than only by the flag: an instance that finds
	 * [identity] already holding the id just makes sure the encrypted copy is gone, so
	 * running the recovery again, on this process or the next, cannot change the id or
	 * leave two copies behind.
	 */
	private fun recoverSubjectIfNeeded() {
		if (recovered || !migrates) {
			return
		}
		synchronized(this) {
			if (recovered) {
				return
			}
			recovered = true
			recoverSubject()
		}
	}

	private fun recoverSubject() {
		val current = readQuietly(identity)
		if (current != null) {
			// Already migrated, or a fresh install that wrote its id here. The
			// encrypted copy, if an upgrade left one, is a second answer to the same
			// question and has to go.
			dropEncryptedCopy()
			return
		}
		val legacy = readQuietly(records) ?: return
		try {
			identity.write(C15tStoreKeys.SUBJECT, legacy)
		} catch (_: Exception) {
			// Identity storage that will not take the id must not be answered by
			// deleting the only copy that still exists.
			return
		}
		dropEncryptedCopy()
	}

	private fun dropEncryptedCopy() {
		try {
			records.write(C15tStoreKeys.SUBJECT, null)
		} catch (_: Exception) {
			// Harmless: the encrypted copy loses to the plain one on every read.
		}
	}

	private fun readQuietly(store: KeyValueStore): String? = try {
		store.read(C15tStoreKeys.SUBJECT)
	} catch (_: Exception) {
		// A subject that cannot be read is treated as absent, which is what every
		// other read in this package does with an unreadable payload.
		null
	}
}
