package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSubject
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.ResilientKeyValueStore
import com.c15t.core.store.SubjectPreservingStore
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.SaveOutcome
import java.security.KeyStoreException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Subject identity across a lost encryption key.
 *
 * The case this guards is a field failure with no visible symptom: the keystore key
 * goes, the core hydrates nothing, mints a fresh subject id, and every consent record
 * the backend holds against the old id is orphaned. The contract's answer is that the
 * id is a random `sub_` id and belongs outside the encrypted store, so losing the key
 * costs the records and never the identity.
 *
 * The ids this harness mints come from [subjectIdForSequence], so they are in the format
 * the producer accepts. A stored id in any other shape is now refused on read and takes
 * its envelope with it, which would make every case here a case about that instead.
 */
class SubjectIdentityTest {
	private val timeline = mutableListOf<String>()

	/** How many times the core reached for a new subject id. */
	private var subjectIdsMinted = 0

	private var warnings = 0

	@Test
	fun `losing the key keeps the subject id and drops the records it cannot read`() {
		val protectedStore = DestroyableProtectedStore()
		val fallback = plainStore()
		val identity = plainStore()
		val records = ResilientKeyValueStore(protectedStore, fallback, onFallback = { warnings += 1 })
		val transport = RecordingTransport(timeline).respondSave(SaveOutcome.Unavailable("offline"))

		val first = kernel(C15tStore(SubjectPreservingStore(records, identity)), transport)
		first.bootstrap()
		assertTrue(first.save(CommitIntent.All).queued, "the payload must be waiting in the queue")
		val originalId = assertNotNull(first.snapshot().subject).id
		assertTrue(
			protectedStore.heldKeys.containsAll(setOf(C15tStoreKeys.SNAPSHOT, C15tStoreKeys.PENDING)),
			"records live in protected storage while the key works, got ${protectedStore.heldKeys}",
		)
		val mintedFirstLaunch = subjectIdsMinted

		protectedStore.destroyKey()

		val second = kernel(C15tStore(SubjectPreservingStore(records, identity)), transport)
		second.bootstrap()

		assertEquals(
			originalId,
			assertNotNull(second.snapshot().subject).id,
			"a keystore reset must not answer with a fresh identity",
		)
		assertEquals(
			mintedFirstLaunch,
			subjectIdsMinted,
			"the relaunch after a key loss mints nothing, because it inherits the stored id",
		)
		assertEquals(
			// base58 spells the count 1 as `2`: the alphabet's first digit is `1`, and
			// that one stands for zero.
			"sub_2",
			originalId,
			"the first launch is a fresh install and owns the first id",
		)
		assertEquals(1, warnings, "the step-down is logged once, not on every read")
		assertEquals(emptySet<String>(), protectedStore.heldKeys, "blobs the dead key cannot read are dropped")
		assertEquals(
			listOf(C15tStoreKeys.SUBJECT),
			identity.keys.toList(),
			"identity is the only thing plain storage holds, and it survived",
		)
		assertFalse(second.snapshot().ready, "the lost records leave a pending state, never a stale grant")
		assertTrue(second.snapshot().policyPending)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(second.isAllowed(category), "$category must be denied until a policy resolves")
		}
	}

	@Test
	fun `a fresh install generates exactly one id and keeps it out of protected storage`() {
		val protectedStore = DestroyableProtectedStore()
		val identity = plainStore()
		val store = C15tStore(
			SubjectPreservingStore(ResilientKeyValueStore(protectedStore, plainStore()), identity),
		)

		kernel(store).bootstrap()

		assertEquals(1, subjectIdsMinted, "one id for the whole install")
		assertEquals("sub_2", assertNotNull(store.readSubject()).id)
		assertEquals(listOf(C15tStoreKeys.SUBJECT), identity.keys.toList(), "exactly one id, in plain storage")
		assertFalse(
			protectedStore.heldKeys.contains(C15tStoreKeys.SUBJECT),
			"identity never rides in the store a key reset can invalidate",
		)
	}

	@Test
	fun `a subject held only in protected storage is recovered before the first encrypted write`() {
		val protectedStore = DestroyableProtectedStore()
		protectedStore.seed(C15tStoreKeys.SUBJECT, subjectJson(UPGRADED_ID))
		val identity = plainStore()
		val store = C15tStore(
			SubjectPreservingStore(ResilientKeyValueStore(protectedStore, plainStore()), identity),
		)

		kernel(store).bootstrap()

		assertEquals(0, subjectIdsMinted, "an upgrade adopts the id it found instead of replacing it")
		assertEquals(UPGRADED_ID, assertNotNull(store.readSubject()).id)
		assertEquals(UPGRADED_ID, assertNotNull(plainSubject(identity)).id)
		assertFalse(protectedStore.heldKeys.contains(C15tStoreKeys.SUBJECT), "one copy of the id is left")

		val recovery = timeline.indexOf("delete:${C15tStoreKeys.SUBJECT}")
		val firstRecordWrite = timeline.indexOfFirst {
			it == "write:${C15tStoreKeys.SNAPSHOT}" || it == "write:${C15tStoreKeys.PENDING}"
		}
		assertTrue(recovery >= 0, "the encrypted copy must be removed, got $timeline")
		assertTrue(firstRecordWrite >= 0, "bootstrap must persist records, got $timeline")
		assertTrue(
			recovery < firstRecordWrite,
			"the id has to be safe before anything is written encrypted, got $timeline",
		)
	}

	@Test
	fun `recovery runs once and repeating it changes nothing`() {
		val protectedStore = DestroyableProtectedStore()
		protectedStore.seed(C15tStoreKeys.SUBJECT, subjectJson(UPGRADED_ID))
		val identity = plainStore()
		val records = ResilientKeyValueStore(protectedStore, plainStore())
		val thisLaunch = C15tStore(SubjectPreservingStore(records, identity))
		val nextLaunch = C15tStore(SubjectPreservingStore(records, identity))

		assertEquals(UPGRADED_ID, assertNotNull(thisLaunch.readSubject()).id)
		assertEquals(1, protectedStore.subjectReads, "protected storage is asked for the id once")

		assertEquals(UPGRADED_ID, assertNotNull(nextLaunch.readSubject()).id)
		nextLaunch.readEnvelope()
		nextLaunch.writeSubject(ConsentSubject(id = UPGRADED_ID, externalId = "user-7"))

		assertEquals(1, protectedStore.subjectReads, "a later launch reads plain storage and moves nothing")
		assertEquals(
			UPGRADED_ID,
			assertNotNull(plainSubject(identity)).id,
			"idempotent: running the recovery again cannot change the id",
		)
		assertEquals(listOf(C15tStoreKeys.SUBJECT), identity.keys.toList())
		assertFalse(protectedStore.heldKeys.contains(C15tStoreKeys.SUBJECT))
	}

	@Test
	fun `one store for both roles keeps the id where it is`() {
		// A host with nowhere better to put the id is allowed to hand the same store to
		// both roles. Migrating there would move the id onto itself, which reads as a
		// delete first, so the wrapper has to stay out of the way instead.
		val single = plainStore()
		val store = C15tStore(SubjectPreservingStore(single, single))

		store.writeSubject(ConsentSubject(id = UPGRADED_ID))

		assertEquals(UPGRADED_ID, assertNotNull(store.readSubject()).id)
		kernel(store).bootstrap()
		assertEquals(UPGRADED_ID, assertNotNull(store.readSubject()).id)
		assertEquals(0, subjectIdsMinted, "an existing id is adopted, not replaced")
	}

	@Test
	fun `a stored uuid is refused and mints a replacement instead of being adopted`() {
		// The rule this replaces read any stored string back as an identity, which is how
		// an install gets stuck where the backend answers every save with
		// INPUT_VALIDATION_FAILED while the core keeps reporting a committed write. An id
		// the producer refuses cannot carry consent, so it is not one this build can
		// answer with. The uuid stays recognisable -- see the case below -- as a diagnosis
		// of which build wrote it, never as a reason to use it.
		val legacy = LEGACY_UUID
		val store = C15tStore(plainStore())
		store.writeSubject(ConsentSubject(id = legacy))

		val launch = kernel(store).apply { bootstrap() }

		assertEquals(1, subjectIdsMinted, "a refused id leaves the launch with no identity at all")
		val adopted = assertNotNull(launch.snapshot().subject).id
		assertNotEquals(legacy, adopted)
		assertTrue(SubjectIdGenerator.isValid(adopted), "the replacement must be one the backend takes: $adopted")
		assertEquals(adopted, assertNotNull(store.readSubject()).id, "and it is the one now stored")
	}

	@Test
	fun `the legacy shape is recognised for its message and never as an identity`() {
		// What the recogniser is for, and what it is not for. Lowercase v4 is the shape
		// this SDK alone wrote, so it is the one refusal a host can name as "an older
		// build of yours"; uppercase is IDFV or ADID, a device identifier and a different
		// conversation. Neither is adopted: isValid is the only gate, and it answers the
		// producer's pattern.
		assertTrue(SubjectIdGenerator.isLegacyUuidShape(LEGACY_UUID))
		assertFalse(SubjectIdGenerator.isLegacyUuidShape("6F1D2C3A-8B4E-4A7F-9C21-0D5E7A9B1C01"))
		assertFalse(SubjectIdGenerator.isLegacyUuidShape("6f1d2c3a-8b4e-5a7f-9c21-0d5e7a9b1c01"))
		assertFalse(SubjectIdGenerator.isLegacyUuidShape("6f1d2c3a-8b4e-4a7f-cc21-0d5e7a9b1c01"))
		assertFalse(SubjectIdGenerator.isLegacyUuidShape("not-an-id"))

		assertTrue(SubjectIdGenerator.isValid(SUB_TEST_ID), "the format the producer takes")
		for (rejected in listOf(LEGACY_UUID, "sub_", "sub_0OI", "cns_4Zrjtb44", "not-an-id", "")) {
			assertFalse(SubjectIdGenerator.isValid(rejected), "$rejected must never be adopted")
		}
		assertFalse(
			SubjectIdGenerator.isValid(LEGACY_UUID),
			"recognising the legacy shape must not make it an identity",
		)
	}

	// -- harness --------------------------------------------------------------

	private fun plainStore(): InMemoryKeyValueStore = InMemoryKeyValueStore(emptyMap(), timeline)

	private fun plainSubject(store: KeyValueStore): ConsentSubject? = C15tStore(store).readSubject()

	private fun subjectJson(id: String): String =
		C15tJson.storage.encodeToString(ConsentSubject.serializer(), ConsentSubject(id = id))

	private fun kernel(
		store: C15tStore,
		transport: C15tTransport = C15tTransport.NONE,
	): C15tKernel = C15tKernel(
		config = NativeConfig(portalUrl = "https://test.c15t.app"),
		store = store,
		clock = FixedClock(),
		transport = transport,
		// Inline execution keeps ordering observable: hydration is finished by the time
		// bootstrap returns, so the timeline reads as a sequence of launches.
		executor = TaskExecutor.DIRECT,
		subjectIdGenerator = {
			subjectIdsMinted += 1
			// Format-valid, and base58 rather than decimal: an id outside the producer's
			// pattern is refused on read, which would make every case here a case about
			// that instead.
			subjectIdForSequence(subjectIdsMinted)
		},
	)

	/**
	 * The protected store, with a key the test can destroy.
	 *
	 * Deletion keeps working with the key gone, because removing a file needs no
	 * crypto. That asymmetry is what lets the core clear a store it can no longer read,
	 * so a double that refused every call would hide the purge instead of testing it.
	 */
	private inner class DestroyableProtectedStore : KeyValueStore {
		private val data = LinkedHashMap<String, String>()

		private var keyAlive = true

		var subjectReads = 0
			private set

		val heldKeys: Set<String>
			get() = data.keys.toSet()

		fun destroyKey() {
			keyAlive = false
		}

		/** Seed stored state without leaving a write on the timeline. */
		fun seed(
			key: String,
			value: String,
		) {
			data[key] = value
		}

		override fun read(key: String): String? {
			timeline += "read:$key"
			if (key == C15tStoreKeys.SUBJECT) {
				subjectReads += 1
			}
			requireKey()
			return data[key]
		}

		override fun write(
			key: String,
			value: String?,
		) {
			timeline += if (value == null) "delete:$key" else "write:$key"
			if (value == null) {
				data.remove(key)
				return
			}
			requireKey()
			data[key] = value
		}

		override fun keys(): Set<String> = data.keys.toSet()

		private fun requireKey() {
			if (!keyAlive) {
				throw KeyStoreException("No such key: com.c15t.consent.key.v1")
			}
		}
	}

	private companion object {
		/** The lowercase v4 shape a prerelease build minted and the producer refuses. */
		const val LEGACY_UUID = "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01"

		/** An id this SDK wrote, taken from the vector table the three SDKs share. */
		const val SUB_TEST_ID = "sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc"

		/** An id an upgrade carries in, already in the format the producer accepts. */
		const val UPGRADED_ID = "sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk"
	}
}
