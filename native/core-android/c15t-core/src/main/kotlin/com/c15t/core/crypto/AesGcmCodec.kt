package com.c15t.core.crypto

import com.c15t.core.spi.SymmetricKeyProvider
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

/**
 * AES/GCM framing for stored consent blobs.
 *
 * Lives in the pure-JVM module because the framing, the version byte, and the
 * fail-closed behaviour on a tampered blob are all logic worth testing without an
 * emulator. Only the key lives elsewhere: the host supplies a
 * [SymmetricKeyProvider], whose Android conformance points at an AndroidKeyStore
 * alias so the key material never enters Java heap.
 *
 * Blob layout: `magic(1) | version(1) | iv(12) | ciphertext+tag`. GCM
 * authenticates the header bytes, so a flipped version byte fails the tag rather
 * than changing how the payload is read.
 */
class AesGcmCodec(
	private val keyProvider: SymmetricKeyProvider,
) {
	/** Encrypt [plaintext] into a self-describing blob. */
	fun encrypt(plaintext: ByteArray): ByteArray {
		// The cipher picks the IV and hands it back. Handing AndroidKeyStore an
		// IV of our own is rejected outright -- a key created under the default
		// randomized-encryption policy answers `cipher.init` with
		// `InvalidAlgorithmParameterException: Caller-provided IV not permitted`,
		// which is not a key failure, so every encrypt fails the same way and no
		// blob is ever written. An ordinary JCE key takes either path, so letting
			// the provider choose is the only shape that works on both.
		val cipher = Cipher.getInstance(TRANSFORMATION)
		cipher.init(Cipher.ENCRYPT_MODE, keyProvider.key())
		cipher.updateAAD(AAD)
		val iv = requireNotNull(cipher.iv) { "the cipher offered no IV to frame the blob with" }
		require(iv.size == IV_LENGTH_BYTES) {
			"the cipher chose a ${iv.size}-byte IV and the blob frames $IV_LENGTH_BYTES"
		}
		val body = cipher.doFinal(plaintext)
		val out = ByteArray(HEADER_LENGTH + IV_LENGTH_BYTES + body.size)
		out[0] = MAGIC
		out[1] = VERSION
		System.arraycopy(iv, 0, out, HEADER_LENGTH, IV_LENGTH_BYTES)
		System.arraycopy(body, 0, out, HEADER_LENGTH + IV_LENGTH_BYTES, body.size)
		return out
	}

	/**
	 * Decrypt [blob], or `null` when it is not a blob this codec wrote, when its
	 * version is unknown, or when the authentication tag does not verify.
	 *
	 * A `null` result is the fail-closed signal: the caller serves the deny-all
	 * snapshot instead of trusting a half-read payload. A key the platform refuses
	 * to hand back is a different failure and propagates; see [KeyLoss].
	 */
	fun decrypt(blob: ByteArray?): ByteArray? {
		if (blob == null || blob.size <= HEADER_LENGTH + IV_LENGTH_BYTES) {
			return null
		}
		if (blob[0] != MAGIC || blob[1] != VERSION) {
			return null
		}
		return try {
			val iv = blob.copyOfRange(HEADER_LENGTH, HEADER_LENGTH + IV_LENGTH_BYTES)
			val body = blob.copyOfRange(HEADER_LENGTH + IV_LENGTH_BYTES, blob.size)
			val cipher = Cipher.getInstance(TRANSFORMATION)
			cipher.init(Cipher.DECRYPT_MODE, keyProvider.key(), GCMParameterSpec(TAG_LENGTH_BITS, iv))
			cipher.updateAAD(AAD)
			cipher.doFinal(body)
		} catch (error: Exception) {
			if (KeyLoss.isKeyUnavailable(error)) {
				// The key is unusable, which says nothing about this blob, so the
				// caller decides: the storage layer may still step down to a fallback.
				throw error
			}
			// BadPaddingException and friends: this blob holds no usable state.
			null
		}
	}

	private companion object {
		const val TRANSFORMATION = "AES/GCM/NoPadding"
		const val IV_LENGTH_BYTES = 12
		const val TAG_LENGTH_BITS = 128
		const val HEADER_LENGTH = 2
		const val MAGIC: Byte = 'C'.code.toByte()
		const val VERSION: Byte = 1
		val AAD = "c15t-core-android-v1".toByteArray()
	}
}
