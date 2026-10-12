package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelError
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.wire.SnapshotWire
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The stored-id half of the subject identity rule, on this core's own bytes.
 *
 * The shape under test is an install written by a build that minted the legacy UUID
 * subject id. Every save that install made was refused by the producer, so the device
 * holds a decision attributed to an id no query returns while the core keeps reporting a
 * committed write and the backend holds nothing. `native/CONTRACT.md` prices that
 * identity at nothing, which means the whole stored envelope goes with it, and this is
 * the one fixture for this core that holds the line: a well-formed grant under a refused
 * id has to read exactly like a first launch, records and all, and must not put the old
 * bytes back on the wire.
 *
 * A core test rather than a shared `native/protocol` fixture on purpose: the JavaScript
 * kernel accepts a UUID subject id without looking at it, so it cannot produce an
 * expectation for a refusal, and a stored envelope is device output no kernel writes.
 */
class UnusableSubjectIdTest {
	// -- the rule -------------------------------------------------------------

	@Test
	fun `a stored grant under a refused id reads as a first launch`() {
		val install = poisonedInstall()
		val backend = install.backend
		val store = C15tStore(backend)
		val errors = mutableListOf<KernelError>()
		val relaunch = RecordingTransport()
		val launch = testKernel(
			store = store,
			transport = relaunch,
			logger = { errors += it },
		)

		launch.bootstrap()

		// Reads like a first launch, records and all.
		val snapshot = launch.snapshot()
		assertFalse(snapshot.ready, "a launch that restored nothing cannot claim an answer")
		assertTrue(snapshot.policyPending)
		assertNull(snapshot.explicitChoice, "the choice written under the refused id is gone")
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(launch.isAllowed(category), "$category outlived its own subject id")
		}

		// A fresh identity, and one the producer will actually take.
		val adopted = assertNotNull(snapshot.subject).id
		assertNotEquals(LEGACY_UUID, adopted)
		assertTrue(SubjectIdGenerator.isValid(adopted), "the replacement must be acceptable: $adopted")
		assertEquals(adopted, assertNotNull(store.readSubject()).id, "and it is the one now stored")

		// What is on disk now is this launch's own state, not the grant that was there.
		assertTrue(store.readPending().isEmpty(), "the frozen bodies went with it")
		val persisted = assertNotNull(
			store.readEnvelope(),
			"hydration persists what it settled on, the same way a first launch does",
		)
		assertNull(persisted.snapshot.explicitChoice, "the grant must not be what comes back")
		val persistedBytes = assertNotNull(backend.read(C15tStoreKeys.SNAPSHOT))
		assertFalse(
			persistedBytes.contains(install.healthyId),
			"the envelope on disk is still the one written under the refused id",
		)

		// The old bytes do not go out the door.
		assertTrue(
			relaunch.saveRequests.isEmpty(),
			"a refused id must not replay the body queued under it",
		)

		// The host is told once, in terms it can repeat to a user.
		val unusable = errors.filter { it.code == CODE }
		assertEquals(1, unusable.size, "a dropped identity is announced exactly once per launch")
		val message = assertNotNull(unusable.first().message)
		assertTrue(message.contains(LEGACY_UUID), "the message must name the id it refused: $message")
		for (fragment in listOf("^sub_", "asks for", "consent again", "no decision for it")) {
			assertTrue(message.contains(fragment), "the message must carry \"$fragment\": $message")
		}

		// The refused id coming back cannot buy a second announcement. A host whose
		// identity slot is unwritable re-reads the same bad id on every resolve, and a
		// launch that reported each of them turns one re-prompt into a stream of errors.
		backend.putSilently(C15tStoreKeys.SUBJECT, subjectJson(LEGACY_UUID))
		launch.reset()
		assertEquals(1, errors.count { it.code == CODE }, "one launch, one announcement")
		assertNotEquals(LEGACY_UUID, assertNotNull(launch.snapshot().subject).id)
	}

	@Test
	fun `discarding the envelope leaves the storage of a first launch`() {
		// "Records and all" said about storage rather than about a snapshot, because the
		// discarded launch mints a new id and that is the one field the contract keeps in
		// its own slot: after the discard, the slots left are exactly the slots a first
		// launch leaves, which is what stops the old decision coming back tomorrow.
		val install = poisonedInstall()
		val discarded = C15tStore(install.backend)
		val launch = testKernel(store = discarded, transport = RecordingTransport())
		launch.bootstrap()
		val adopted = assertNotNull(launch.snapshot().subject).id

		val firstLaunchBackend = InMemoryKeyValueStore()
		firstLaunchBackend.putSilently(C15tStoreKeys.SUBJECT, subjectJson(adopted))
		val comparison = testKernel(
			store = C15tStore(firstLaunchBackend),
			transport = RecordingTransport(),
		)
		comparison.bootstrap()

		assertEquals(
			firstLaunchBackend.keys.sorted(),
			install.backend.keys.sorted(),
			"the launch that dropped its identity left slots a first launch would not leave",
		)
		assertTrue(discarded.readPending().isEmpty())
		// Same slots, same clock, nobody answering: the two snapshots agree on every field
		// except the identity, and the identity is identical by construction.
		assertEquals(
			SnapshotWire.toJsonElement(comparison.snapshot()),
			SnapshotWire.toJsonElement(launch.snapshot()),
			"the refused-id launch answers something a first launch does not",
		)
	}

	// -- harness --------------------------------------------------------------

	/** A device holding a real grant and an undelivered queued save, then read back under
	 * the legacy id an older build wrote into the same slot. */
	private fun poisonedInstall(): PoisonedInstall {
		val backend = InMemoryKeyValueStore()
		backend.putSilently(C15tStoreKeys.SUBJECT, subjectJson(HEALTHY_ID))
		val store = C15tStore(backend)
		// A policy has to resolve or the commit is refused and there is no grant to lose.
		val transport = RecordingTransport()
			.respondInit(initSuccess())
			// Unavailable, not Rejected: the entry has to still be waiting when the id is
			// swapped, so the "must not replay" half of the rule has something real to
			// refuse. A 400 would drop it, and the queue would be empty by the time the
			// discard had a decision to make about it.
			.respondSave(SaveOutcome.Unavailable("offline"))
		val first = testKernel(store = store, transport = transport)
		first.bootstrap()

		val result = first.save(CommitIntent.All)
		assertTrue(result.ok, "the grant has to land before the id is poisoned")
		assertFalse(result.delivered, "and it has to owe delivery when the id is poisoned")
		assertTrue(result.queued)
		assertTrue(first.isAllowed(ConsentCategory.MARKETING), "the install has to hold a real grant")

		val healthyId = assertNotNull(store.readSubject()).id
		assertEquals(HEALTHY_ID, healthyId, "the install keeps the id it was seeded with")
		assertNotNull(store.readEnvelope(), "the install has to hold a real envelope")
		val queued = store.readPending().single()
		assertEquals(
			healthyId,
			queued.payload.subjectId,
			"the queued body is attributed to the healthy id",
		)

		backend.putSilently(C15tStoreKeys.SUBJECT, subjectJson(LEGACY_UUID))
		return PoisonedInstall(backend, healthyId)
	}

	private class PoisonedInstall(val backend: InMemoryKeyValueStore, val healthyId: String)

	private companion object {
		/** The lowercase v4 shape a prerelease build minted and the producer refuses. */
		const val LEGACY_UUID = "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c01"

		/** A usable id the install starts on, taken from the vector table the three SDKs share. */
		const val HEALTHY_ID = "sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc"

		/** The code both cores emit on this path, per `native/CONTRACT.md`. */
		const val CODE = "subject-id-unusable"

		fun subjectJson(id: String): String =
			C15tJson.storage.encodeToString(ConsentSubject.serializer(), ConsentSubject(id = id))
	}
}
