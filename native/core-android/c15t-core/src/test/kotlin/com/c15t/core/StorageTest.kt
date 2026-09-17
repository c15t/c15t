package com.c15t.core

import com.c15t.core.crypto.AesGcmCodec
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.policy.NoticeDismissal
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.SnapshotEnvelope
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Storage round trips and the AES/GCM framing the Android module builds on. */
class StorageTest {
	@Test
	fun `the envelope round trips and keeps the reserved iab key`() {
		val backend = InMemoryKeyValueStore()
		val store = C15tStore(backend)
		val envelope = SnapshotEnvelope(
			snapshot = ConsentSnapshot(
				revision = 12,
				policyPending = false,
				ready = true,
				subject = ConsentSubject(id = "subject-1", externalId = "user-42"),
				explicitChoice = com.c15t.core.model.ExplicitChoice(
					consents = mapOf("measurement" to true),
					action = com.c15t.core.model.ConsentAction.CUSTOM,
					actionAt = 1_700_000_000_000L,
					fingerprint = "choice-fp-1",
				),
				restrictions = mapOf("marketing" to listOf("gpc")),
				policySnapshotToken = "snap-1",
				evaluatedAt = 1_700_000_000_000L,
			),
			evaluationPolicy = null,
			noticeDismissal = NoticeDismissal(dismissedAt = 1_700_000_000_000L, fingerprint = "choice-fp-1"),
		)

		store.writeEnvelope(envelope)
		val raw = assertNotNull(backend.read(C15tStoreKeys.SNAPSHOT), "the envelope must be stored under the contract key")

		val decoded = C15tJson.storage.decodeFromString(SnapshotEnvelope.serializer(), raw)
		assertEquals(envelope.snapshot, decoded.snapshot)
		assertEquals(12L, decoded.snapshot.revision)
		assertEquals("user-42", decoded.snapshot.subject?.externalId)
		assertEquals(listOf("gpc"), decoded.snapshot.restrictions["marketing"])
		assertTrue("\"iab\":null" in raw, "the reserved IAB slot must serialize as null, got: $raw")
		assertNull(decoded.evaluationPolicy)
		assertNotNull(decoded.noticeDismissal)
	}

	@Test
	fun `a subject survives its own storage key`() {
		val backend = InMemoryKeyValueStore()
		val store = C15tStore(backend)

		store.writeSubject(ConsentSubject(id = "subject-1"))

		assertEquals("subject-1", assertNotNull(store.readSubject()).id)
		assertEquals(setOf(C15tStoreKeys.SUBJECT), backend.keys, "identity lives in its own slot")
	}

	@Test
	fun `aes-gcm round trips and rejects a tampered blob`() {
		val codec = AesGcmCodec(keyProviderOf(generateKey()))
		val plaintext = """{"revision":3,"ready":true}""".toByteArray()

		val blob = codec.encrypt(plaintext)
		assertContentEquals(plaintext, codec.decrypt(blob))

		// Flipping any byte must break the GCM tag rather than change the read.
		for (index in blob.indices step maxOf(1, blob.size / 7)) {
			val tampered = blob.copyOf().also { it[index] = (it[index].toInt() xor 0x40).toByte() }
			assertNull(codec.decrypt(tampered), "byte $index is not covered by the tag")
		}
	}

	@Test
	fun `aes-gcm rejects a blob from another key and a foreign payload`() {
		val codec = AesGcmCodec(keyProviderOf(generateKey()))
		val blob = codec.encrypt("secret".toByteArray())

		val other = AesGcmCodec(keyProviderOf(generateKey()))
		assertNull(other.decrypt(blob), "a different key must not read the blob")
		assertNull(codec.decrypt("plaintext, not a c15t blob".toByteArray()))
		assertNull(codec.decrypt(ByteArray(0)))
	}

	@Test
	fun `a revoked key is reported as key loss, not as a verdict on the blob`() {
		var key: SecretKey? = generateKey()
		val codec = AesGcmCodec(
			object : com.c15t.core.spi.SymmetricKeyProvider {
				override fun key(): SecretKey = key ?: throw java.security.KeyStoreException("key revoked")
			},
		)
		val blob = codec.encrypt("state".toByteArray())
		key = null

		// Returning null here would read as "nothing was ever stored", which hides an
		// infrastructure failure behind a policy answer. The storage layer needs the
		// difference so it can step down to an unprotected store instead.
		assertFailsWith<java.security.KeyStoreException> { codec.decrypt(blob) }
	}

	private fun keyProviderOf(secret: SecretKey) = object : com.c15t.core.spi.SymmetricKeyProvider {
		override fun key(): SecretKey = secret
	}

	private fun generateKey(): SecretKey = KeyGenerator.getInstance("AES").apply { init(256) }.generateKey()
		.let { SecretKeySpec(it.encoded, "AES") }
}
