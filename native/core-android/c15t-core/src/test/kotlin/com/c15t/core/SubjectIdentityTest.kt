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
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Subject identity across a lost encryption key.
 *
 * The case this guards is a field failure with no visible symptom: the keystore key
 * goes, the core hydrates nothing, mints a fresh subject id, and every consent record
 * the backend holds against the old id is orphaned. The contract's answer is that the
 * id is a random UUID and belongs outside the encrypted store, so losing the key costs
 * the records and never the identity.
 */
class SubjectIdentityTest {
	private val timeline = mutableListOf<String>()

	/**
	 * The kernel hands one generator to both the subject and the pending-save queue, so
	 * these tests compare the counter across launches instead of expecting a total.
	 */
	private var idsGenerated = 0

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
		val mintedFirstLaunch = idsGenerated

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
			idsGenerated,
			"the relaunch after a key loss mints nothing, because it inherits the stored id",
		)
		assertEquals(
			"00000001-0000-4000-8000-000000000000",
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

		assertEquals(1, idsGenerated, "one id for the whole install")
		assertEquals("00000001-0000-4000-8000-000000000000", assertNotNull(store.readSubject()).id)
		assertEquals(listOf(C15tStoreKeys.SUBJECT), identity.keys.toList(), "exactly one id, in plain storage")
		assertFalse(
			protectedStore.heldKeys.contains(C15tStoreKeys.SUBJECT),
			"identity never rides in the store a key reset can invalidate",
		)
	}

	@Test
	fun `a subject held only in protected storage is recovered before the first encrypted write`() {
		val protectedStore = DestroyableProtectedStore()
		protectedStore.seed(C15tStoreKeys.SUBJECT, subjectJson("subject-legacy"))
		val identity = plainStore()
		val store = C15tStore(
			SubjectPreservingStore(ResilientKeyValueStore(protectedStore, plainStore()), identity),
		)

		kernel(store).bootstrap()

		assertEquals(0, idsGenerated, "an upgrade adopts the id it found instead of replacing it")
		assertEquals("subject-legacy", assertNotNull(store.readSubject()).id)
		assertEquals("subject-legacy", assertNotNull(plainSubject(identity)).id)
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
		protectedStore.seed(C15tStoreKeys.SUBJECT, subjectJson("subject-legacy"))
		val identity = plainStore()
		val records = ResilientKeyValueStore(protectedStore, plainStore())
		val thisLaunch = C15tStore(SubjectPreservingStore(records, identity))
		val nextLaunch = C15tStore(SubjectPreservingStore(records, identity))

		assertEquals("subject-legacy", assertNotNull(thisLaunch.readSubject()).id)
		assertEquals(1, protectedStore.subjectReads, "protected storage is asked for the id once")

		assertEquals("subject-legacy", assertNotNull(nextLaunch.readSubject()).id)
		nextLaunch.readEnvelope()
		nextLaunch.writeSubject(ConsentSubject(id = "subject-legacy", externalId = "user-7"))

		assertEquals(1, protectedStore.subjectReads, "a later launch reads plain storage and moves nothing")
		assertEquals(
			"subject-legacy",
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

		store.writeSubject(ConsentSubject(id = "subject-alone"))

		assertEquals("subject-alone", assertNotNull(store.readSubject()).id)
		kernel(store).bootstrap()
		assertEquals("subject-alone", assertNotNull(store.readSubject()).id)
		assertEquals(0, idsGenerated, "an existing id is adopted, not replaced")
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
		idGenerator = {
			idsGenerated += 1
			"%08d-0000-4000-8000-000000000000".format(idsGenerated)
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
}
