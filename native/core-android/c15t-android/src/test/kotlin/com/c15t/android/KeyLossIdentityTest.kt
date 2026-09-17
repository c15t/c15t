package com.c15t.android

import com.c15t.core.C15tKernel
import com.c15t.core.NativeConfig
import com.c15t.core.crypto.AesGcmCodec
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSubject
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.SymmetricKeyProvider
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.ResilientKeyValueStore
import com.c15t.core.store.SubjectPreservingStore
import java.io.File
import java.nio.file.Files
import java.security.KeyStoreException
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Subject identity across a dead keystore key, on the real file store.
 *
 * `:c15t-core` proves the routing and the migration against storage doubles. This
 * drives the same composition through [EncryptedFileStore] with a software key the
 * test revokes, because the failure that matters is physical: the blobs stay on disk
 * and refuse to decrypt, while the id has to be somewhere a key reset cannot reach.
 */
class KeyLossIdentityTest {
	private var idsMinted = 0

	@Test
	fun `losing the key costs the records and not the identity`() {
		val directory = newDirectory()
		val key = RotatingKey(generateKey())
		var warnings = 0
		val records = ResilientKeyValueStore(
			primary = EncryptedFileStore(directory, AesGcmCodec(key)),
			fallback = PrefsStore(),
			onFallback = { warnings += 1 },
		)
		val identity = PrefsStore()

		val first = kernel(C15tStore(SubjectPreservingStore(records, identity)))
		first.bootstrap()
		val originalId = requireSubject(first.snapshot().subject).id
		assertEquals("a fresh install mints exactly one id", 1, idsMinted)
		assertTrue(
			"consent records belong in the encrypted directory",
			File(directory, C15tStoreKeys.SNAPSHOT).isFile,
		)
		assertFalse(
			"identity must be out of reach of a key reset",
			File(directory, C15tStoreKeys.SUBJECT).isFile,
		)

		// What a revoked AndroidKeyStore alias looks like from Java.
		key.destroy()
		val second = kernel(C15tStore(SubjectPreservingStore(records, identity)))
		second.bootstrap()

		assertEquals(
			"the relaunch after a reset carries the stored id",
			originalId,
			requireSubject(second.snapshot().subject).id,
		)
		assertEquals("and it mints nothing", 1, idsMinted)
		assertEquals("the step-down is logged once", 1, warnings)
		assertEquals(
			"blobs the dead key cannot open are removed rather than left to rot",
			emptyList<String>(),
			directory.list()?.sorted(),
		)
		assertFalse("the lost records leave a pending state, never a stale grant", second.snapshot().ready)
		assertTrue(second.snapshot().policyPending)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse("$category stays denied until a policy resolves", second.isAllowed(category))
		}
	}

	@Test
	fun `an install that kept the id encrypted surrenders it once`() {
		val directory = newDirectory()
		val records = ResilientKeyValueStore(
			primary = EncryptedFileStore(directory, AesGcmCodec(RotatingKey(generateKey()))),
			fallback = PrefsStore(),
		)
		// The pre-migration layout: the id written straight into encrypted storage.
		records.write(
			C15tStoreKeys.SUBJECT,
			C15tJson.storage.encodeToString(ConsentSubject.serializer(), ConsentSubject(id = "subject-legacy")),
		)
		assertTrue(
			"the fixture must really be on the encrypted path",
			File(directory, C15tStoreKeys.SUBJECT).isFile,
		)
		val identity = PrefsStore()

		val upgraded = C15tStore(SubjectPreservingStore(records, identity))
		assertEquals("subject-legacy", requireSubject(upgraded.readSubject()).id)
		assertFalse("the encrypted copy is retired", File(directory, C15tStoreKeys.SUBJECT).isFile)
		assertEquals("the id now lives in plain storage", listOf(C15tStoreKeys.SUBJECT), identity.storedKeys)

		// A later launch must find the same answer and disturb nothing.
		val nextLaunch = C15tStore(SubjectPreservingStore(records, identity))
		assertEquals("subject-legacy", requireSubject(nextLaunch.readSubject()).id)
		assertEquals("running the migration twice cannot change the id", "subject-legacy", identity.subjectId())
		assertFalse(File(directory, C15tStoreKeys.SUBJECT).isFile)
		assertEquals(0, idsMinted)
	}

	private fun kernel(store: C15tStore): C15tKernel = C15tKernel(
		config = NativeConfig(portalUrl = "https://test.c15t.app"),
		store = store,
		// Inline execution keeps hydration inside bootstrap(), so one launch reads as
		// one synchronous block and the assertions cannot race a background thread.
		executor = TaskExecutor.DIRECT,
		subjectIdGenerator = {
			idsMinted += 1
			"subject-$idsMinted"
		},
	)

	private fun newDirectory(): File = Files.createTempDirectory("c15t-identity").toFile().apply { deleteOnExit() }

	/** JUnit's assertNotNull returns nothing, and these reads are preconditions, not assertions. */
	private fun requireSubject(subject: ConsentSubject?): ConsentSubject =
		checkNotNull(subject) { "the core must always resolve a subject id" }

	private fun generateKey(): SecretKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
		.let { SecretKeySpec(it.encoded, "AES") }

	private fun PrefsStore.subjectId(): String? = C15tStore(this).readSubject()?.id

	/** A key the test can revoke, standing in for a lost AndroidKeyStore alias. */
	private class RotatingKey(initial: SecretKey?) : SymmetricKeyProvider {
		private var current: SecretKey? = initial

		fun destroy() {
			current = null
		}

		override fun key(): SecretKey = current ?: throw KeyStoreException("No such key: c15t")
	}

	/** Stands in for the `SharedPreferences` files, without a [android.content.Context]. */
	private class PrefsStore : KeyValueStore {
		private val data = LinkedHashMap<String, String>()

		val storedKeys: List<String>
			get() = data.keys.toList()

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

		override fun keys(): Set<String> = data.keys.toSet()

		override fun flush() = Unit
	}
}
