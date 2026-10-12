package com.c15t.android

import com.c15t.core.crypto.AesGcmCodec
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.SymmetricKeyProvider
import com.c15t.core.store.ResilientKeyValueStore
import java.io.File
import java.nio.file.Files
import java.security.KeyStoreException
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The encrypted store and its step-down, on a plain JVM.
 *
 * AndroidKeyStore itself needs a device, so this drives the same file store with a
 * software key and swaps the key out from under it, which is the failure that
 * matters: a key that dies mid-install must not take the consent records with it.
 */
class EncryptedFileStoreTest {
	@Test
	fun `values round trip through encrypted files`() {
		val directory = newDirectory()
		val key = RotatingKey(generateKey())
		val store = encryptedStore(directory, key)

		store.write(KEY, "stored-state")

		assertEquals("stored-state", store.read(KEY))
		assertTrue("a healthy key must stay on the encrypted path", store.isDegraded.not())
		val file = File(directory, "com.c15t.snapshot")
		assertTrue("the store must actually write", file.isFile)
		assertFalse("the blob must not be plaintext", String(file.readBytes(), Charsets.UTF_8).contains("stored-state"))
	}

	@Test
	fun `a key that dies mid-install keeps writing to the fallback`() {
		val directory = newDirectory()
		val key = RotatingKey(generateKey())
		var warnings = 0
		val fallback = MemoryStore()
		val store = ResilientKeyValueStore(
			primary = EncryptedFileStore(directory, AesGcmCodec(key)),
			fallback = fallback,
			onFallback = { warnings += 1 },
		)
		store.write(KEY, "before")

		// What a destroyed AndroidKeyStore alias looks like from Java.
		key.destroy()
		store.write(KEY, "after")

		assertEquals("the fallback must be logged exactly once", 1, warnings)
		assertEquals("after", store.read(KEY))
		assertEquals("consent must survive the relaunch that follows", "after", fallback.read(KEY))
	}

	@Test
	fun `a tampered blob reads as nothing stored and does not degrade`() {
		val directory = newDirectory()
		val key = RotatingKey(generateKey())
		val fallback = MemoryStore()
		val store = ResilientKeyValueStore(EncryptedFileStore(directory, AesGcmCodec(key)), fallback)
		store.write(KEY, "stored-state")
		val file = File(directory, "com.c15t.snapshot")
		file.writeBytes(file.readBytes().also { it[it.size - 1] = (it[it.size - 1].toInt() xor 0x5C).toByte() })

		assertNull(store.read(KEY))

		assertFalse("tampering is a fail-closed read, not a key failure", store.isDegraded)
		assertNull(fallback.read(KEY))
	}

	@Test
	fun `a key that never worked at all still leaves the store usable`() {
		val directory = newDirectory()
		val codec = AesGcmCodec(RotatingKey(null))
		val store = ResilientKeyValueStore(EncryptedFileStore(directory, codec), MemoryStore())

		store.write(KEY, "state")

		assertEquals("state", store.read(KEY))
		assertTrue(store.isDegraded)
	}

	private fun encryptedStore(directory: File, key: SymmetricKeyProvider): ResilientKeyValueStore =
		ResilientKeyValueStore(EncryptedFileStore(directory, AesGcmCodec(key)), MemoryStore())

	private fun newDirectory(): File = Files.createTempDirectory("c15t-store").toFile().apply { deleteOnExit() }

	private fun generateKey(): SecretKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
		.let { SecretKeySpec(it.encoded, "AES") }

	/** A key the test can destroy, standing in for a revoked AndroidKeyStore alias. */
	private class RotatingKey(initial: SecretKey?) : SymmetricKeyProvider {
		private var current: SecretKey? = initial

		fun destroy() {
			current = null
		}

		override fun key(): SecretKey = current ?: throw KeyStoreException("No such key: c15t")
	}

	private class MemoryStore : KeyValueStore {
		private val data = LinkedHashMap<String, String>()

		override fun read(key: String): String? = data[key]

		override fun write(
			key: String,
			value: String?,
		) {
			if (value == null) {
				data.remove(key)
			} else {
				data[key] = value
			}
		}

		override fun flush() = Unit
	}

	private companion object {
		const val KEY = "com.c15t.snapshot"
	}

}
