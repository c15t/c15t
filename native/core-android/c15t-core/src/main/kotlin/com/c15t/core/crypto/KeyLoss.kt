package com.c15t.core.crypto

import java.security.InvalidKeyException
import java.security.KeyStoreException
import java.security.UnrecoverableKeyException

/**
 * Tells "this blob is garbage" apart from "the key is gone".
 *
 * The two need opposite answers, so the distinction has to exist somewhere. A blob
 * that fails its GCM tag is tampering or a foreign key and must fail closed. A key
 * the platform refuses to hand back is infrastructure failure: continuing to deny
 * forever is worse than the contract's documented fallback, so the storage layer
 * needs to notice and step down.
 */
object KeyLoss {
	/** How far down a cause chain to look before giving up. */
	private const val MAX_DEPTH = 16

	/**
	 * Whether [error] means the protected key itself is unusable.
	 *
	 * `AndroidKeyStoreException` extends [KeyStoreException] and a destroyed key
	 * surfaces as [InvalidKeyException], so the walk covers both. A tag mismatch
	 * from a foreign-but-healthy key is an `AEADBadTagException` with none of these
	 * in its chain, which keeps tamper rejection out of the fallback path.
	 */
	fun isKeyUnavailable(error: Throwable?): Boolean {
		var current: Throwable? = error
		var depth = 0
		while (current != null && depth < MAX_DEPTH) {
			if (current is KeyStoreException || current is UnrecoverableKeyException || current is InvalidKeyException) {
				return true
			}
			if (current.cause === current) {
				return false
			}
			current = current.cause
			depth += 1
		}
		return false
	}
}
