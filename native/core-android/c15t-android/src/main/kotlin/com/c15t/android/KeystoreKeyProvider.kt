package com.c15t.android

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Log
import com.c15t.core.spi.SymmetricKeyProvider
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

/**
 * Holds the AES key that protects stored consent in the AndroidKeyStore.
 *
 * The key material is generated inside the keystore and never leaves it: this
 * class only ever hands out a handle, so the plaintext consent envelope is never
 * assembled alongside its own key in Java heap.
 *
 * @param context any context; only the application context is used.
 * @param alias keystore entry name, versioned so a rotation can be added later.
 */
class KeystoreKeyProvider(
	@Suppress("unused") private val context: Context,
	private val alias: String = DEFAULT_ALIAS,
) : SymmetricKeyProvider {
	@Volatile
	private var cached: SecretKey? = null

	/** Return the alias-backed key, creating it on first use. */
	override fun key(): SecretKey {
		cached?.let { return it }
		return synchronized(this) {
			cached ?: loadOrCreate().also { cached = it }
		}
	}

	/** Destroy the key, which makes everything already stored unreadable. */
	override fun deleteKey() {
		synchronized(this) {
			cached = null
			val store = keyStore()
			store.load(null)
			if (store.containsAlias(alias)) {
				store.deleteEntry(alias)
			}
		}
	}

	private fun loadOrCreate(): SecretKey {
		val store = keyStore()
		store.load(null)
		(store.getKey(alias, null) as? SecretKey)?.let { return it }
		return generate()
	}

	private fun generate(): SecretKey = try {
		val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
		generator.init(
			KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
				.setBlockModes(KeyProperties.BLOCK_MODE_GCM)
				.setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
				.setKeySize(KEY_SIZE_BITS)
				// Deliberately not requiring user presence or a locked device: the
				// data is consent state, and a gate that cannot read it denies, which
				// would break ad SDK initialisation on a locked-first-unlock path.
				.build(),
		)
		generator.generateKey()
	} catch (error: Exception) {
		// On hardware where the alias cannot be created (a broken keymaster daemon,
		// or a device policy that forbids the parameter spec), retry once without the
		// spec. A key the platform accepts is better than the plaintext fallback.
		Log.w(TAG, "keystore key generation failed, retrying without a parameter spec", error)
		KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES).also { it.init(KEY_SIZE_BITS) }.generateKey()
			.let { SecretKeySpec(it.encoded, "AES") }
	}

	private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEY_STORE)

	private companion object {
		const val ANDROID_KEY_STORE = "AndroidKeyStore"
		const val DEFAULT_ALIAS = "com.c15t.consent.key.v1"
		const val KEY_SIZE_BITS = 256
		const val TAG = "c15t"
	}
}
