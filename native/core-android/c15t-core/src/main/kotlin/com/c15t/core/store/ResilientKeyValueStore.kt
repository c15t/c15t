package com.c15t.core.store

import com.c15t.core.crypto.KeyLoss
import com.c15t.core.spi.KeyValueStore

/**
 * A [KeyValueStore] that abandons [primary] the first time its key stops working,
 * and carries on with [fallback].
 *
 * The Android conformance pairs an AndroidKeyStore-backed file store with a
 * `SharedPreferences` store, which is what the contract asks for. Doing that only at
 * construction time leaves the common field case uncovered: a key that dies after
 * install, after an OS upgrade or an OEM keystore bug, makes every later encrypt
 * throw. Without this wrapper the choice is a crash inside the first persist or a
 * write that quietly never lands, so consent stops surviving a relaunch. Stepping
 * down keeps the records and says so once.
 *
 * Nothing here weakens fail-closed reads. A blob that fails authentication is not a
 * key failure, so it still reads as "nothing stored" rather than triggering the
 * switch, and every storage error stays contained instead of reaching a launch hook.
 *
 * Stepping down also discards what [primary] holds. Those blobs are readable by no
 * one now, and leaving them behind means a later run could serve "nothing stored"
 * from files that will never decrypt again. Deleting needs no key, which is why the
 * cleanup works on a dead keystore. Consent records are what is lost here, and only
 * consent records: the subject id lives elsewhere, through
 * [SubjectPreservingStore], so a keystore reset never mints a second identity.
 */
class ResilientKeyValueStore(
	private val primary: KeyValueStore,
	private val fallback: KeyValueStore,
	private val onFallback: (Throwable) -> Unit = {},
) : KeyValueStore {
	@Volatile
	private var degraded = false

	/** `true` once [primary] has been given up on. */
	val isDegraded: Boolean
		get() = degraded

	override fun read(key: String): String? {
		if (degraded) {
			return fallback.read(key)
		}
		return try {
			primary.read(key)
		} catch (error: Exception) {
			if (!KeyLoss.isKeyUnavailable(error)) {
				null
			} else {
				degrade(error)
				// The value may already live in the fallback, so a key loss still reads.
				fallback.read(key)
			}
		}
	}

	override fun write(
		key: String,
		value: String?,
	) {
		if (degraded) {
			fallback.write(key, value)
			return
		}
		try {
			primary.write(key, value)
			return
		} catch (error: Exception) {
			if (!KeyLoss.isKeyUnavailable(error)) {
				return
			}
			degrade(error)
		}
		// The write that proved the key is gone is the one that matters most, so it
		// still has to land, on whatever storage is left.
		fallback.write(key, value)
	}

	override fun flush() {
		try {
			if (degraded) fallback.flush() else primary.flush()
		} catch (_: Exception) {
			// A flush that cannot reach disk has nothing left to report.
		}
	}

	private fun degrade(error: Throwable) {
		synchronized(this) {
			if (degraded) {
				return
			}
			degraded = true
		}
		discardUnreadable()
		// Once per step-down, which is the one log line the contract allows for this.
		onFallback(error)
	}

	/** Remove everything [primary] holds, on the assumption none of it can be read. */
	private fun discardUnreadable() {
		try {
			for (key in primary.keys()) {
				primary.write(key, null)
			}
		} catch (_: Exception) {
			// A store that cannot delete its own files has nothing left to give back.
		}
	}
}
