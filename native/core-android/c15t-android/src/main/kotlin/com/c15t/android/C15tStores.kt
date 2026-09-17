package com.c15t.android

import android.content.Context
import android.content.SharedPreferences
import com.c15t.core.store.ResilientKeyValueStore
import android.util.Log
import com.c15t.core.crypto.AesGcmCodec
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.store.C15tStore
import com.c15t.core.store.SubjectPreservingStore
import java.io.File
import java.io.IOException

/**
 * Storage for the consent envelope, the write queue, and the subject id.
 *
 * The primary path keeps one encrypted blob per contract key under the app's
 * `noBackupFilesDir`, so consent never lands in a cloud backup or a `adb backup`
 * of shared preferences. When the keystore is unusable the contract's answer is a
 * `SharedPreferences` fallback with a single log line, and this factory is where
 * that decision is made.
 *
 * The subject id is the one thing deliberately not on that path. It is a random UUID, so
 * encrypting it protects nothing, and storing it beside the records meant a lost keystore
 * key also lost the installation's identity. It gets its own preference file, which no key
 * can invalidate, so a keystore reset costs the records and not the audit trail;
 * [SubjectPreservingStore] does the routing and carries over the id from installs that
 * stored it encrypted.
 */
object C15tStores {
	private const val TAG = "c15t"
	private const val PREFS_NAME = "c15t.consent.fallback"

	/** Separate from the fallback file, which is where record data goes. */
	private const val SUBJECT_PREFS_NAME = "c15t.subject"

	@Volatile
	private var warnedAboutFallback = false

	/**
	 * Build the store for [context], choosing encrypted or fallback storage.
	 *
	 * Never throws: a host that cannot get an encrypted store still gets a working,
	 * if less protected, core, which is the trade the contract makes.
	 */
	fun create(context: Context): C15tStore {
		val appContext = context.applicationContext
		val fallback = PreferencesStore(appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE))
		val identity = PreferencesStore(appContext.getSharedPreferences(SUBJECT_PREFS_NAME, Context.MODE_PRIVATE))
		val records = try {
			ResilientKeyValueStore(
				primary = EncryptedFileStore(
					File(appContext.noBackupFilesDir, StorePaths.DIRECTORY),
					AesGcmCodec(KeystoreKeyProvider(appContext)),
				),
				fallback = fallback,
				onFallback = ::warnOnce,
			)
		} catch (error: Throwable) {
			warnOnce(error)
			fallback
		}
		return C15tStore(
			backend = SubjectPreservingStore(records = records, identity = identity),
			onReadFailure = { key, error ->
				// A blob this build cannot read is fail-closed inside C15tStore; say so
				// once per key so the field report is not silent.
				Log.w(TAG, "c15t could not read stored state for $key; serving deny-all", error)
			},
		)
	}

	private fun warnOnce(error: Throwable) {
		if (warnedAboutFallback) {
			return
		}
		synchronized(this) {
			if (warnedAboutFallback) {
				return
			}
			warnedAboutFallback = true
			Log.w(TAG, "AndroidKeyStore unavailable, storing consent unencrypted in SharedPreferences", error)
		}
	}
}

/** One AES/GCM blob per key, one file per blob. */
internal class EncryptedFileStore(
	private val directory: File,
	private val codec: AesGcmCodec,
) : KeyValueStore {
	init {
		if (!directory.isDirectory && !directory.mkdirs()) {
			throw IllegalStateException("cannot create ${directory.absolutePath}")
		}
	}

	override fun read(key: String): String? {
		val name = StorePaths.fileName(key) ?: return null
		val file = File(directory, name)
		if (!file.isFile) {
			return null
		}
		// A null here means tampering, a rotated key, or a truncated write. C15tStore
		// turns it into "nothing stored", which the core answers with deny-all.
		return codec.decrypt(readBlob(file))?.let { String(it, Charsets.UTF_8) }
	}

	override fun write(
		key: String,
		value: String?,
	) {
		val name = StorePaths.fileName(key) ?: return
		val file = File(directory, name)
		if (value == null) {
			file.delete()
			return
		}
		writeAtomically(file, codec.encrypt(value.toByteArray(Charsets.UTF_8)))
	}

	override fun keys(): Set<String> {
		// File names are the contract keys. Anything StorePaths would not have written,
		// including the rename temporaries, is not ours to name back.
		val names = directory.list() ?: return emptySet()
		return names.filterTo(mutableSetOf()) { StorePaths.fileName(it) == it }
	}

	override fun flush() {
		// Each write already lands through a rename, so there is nothing buffered.
	}

	// Only disk problems get swallowed here. A crypto or keystore failure has to
	// reach ResilientKeyValueStore, which is what decides to step down.
	private fun readBlob(file: File): ByteArray = try {
		file.readBytes()
	} catch (error: IOException) {
		Log.w(TAG, "unreadable c15t store file", error)
		ByteArray(0)
	}

	private fun writeAtomically(
		file: File,
		blob: ByteArray,
	) {
		val temp = File(file.parentFile, "${file.name}.tmp")
		try {
			temp.outputStream().use { stream ->
				stream.write(blob)
				stream.fd.sync()
			}
			if (!temp.renameTo(file)) {
				file.delete()
				blob.writeTo(file)
			}
		} catch (error: IOException) {
			Log.e(TAG, "failed to persist c15t state", error)
			temp.delete()
		}
	}

	private fun ByteArray.writeTo(file: File) {
		try {
			file.outputStream().use { it.write(this) }
		} catch (error: IOException) {
			Log.e(TAG, "failed to persist c15t state", error)
		}
	}

	private companion object {
		const val TAG = "c15t"
	}
}

/**
 * The contract's fallback when the keystore fails.
 *
 * Values are plain JSON in a private preference file: less protection, but the
 * core stays functional and the one-time warning is on the record.
 */
internal class PreferencesStore(private val prefs: SharedPreferences) : KeyValueStore {
	override fun read(key: String): String? = try {
		prefs.getString(key, null)
	} catch (error: Throwable) {
		// A corrupted preferences file must not crash a launch hook.
		Log.w(TAG, "unreadable c15t preference", error)
		null
	}

	override fun write(
		key: String,
		value: String?,
	) {
		try {
			prefs.edit().apply {
				if (value == null) {
					remove(key)
				} else {
					putString(key, value)
				}
			}.apply()
		} catch (error: Throwable) {
			Log.e(TAG, "failed to persist c15t preference", error)
		}
	}

	override fun flush() {
		prefs.edit().apply()
	}

	private companion object {
		const val TAG = "c15t"
	}
}
