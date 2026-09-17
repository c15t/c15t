package com.c15t.core

import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ConfirmedCoverage
import com.c15t.core.model.SavePayload
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.PendingSaveQueue
import com.c15t.core.transport.C15tProtocol
import com.c15t.core.transport.HostedTransport
import com.c15t.core.transport.SaveOutcome
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * The write queue: persist first, replay unchanged, cap at the newest 20.
 */
class PendingQueueTest {
	private val json = Json { ignoreUnknownKeys = true }

	@Test
	fun `save persists the payload before the network call`() {
		val timeline = mutableListOf<String>()
		val backend = InMemoryKeyValueStore(eventLog = timeline)
		val transport = RecordingTransport(timeline).respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(store = C15tStore(backend), transport = transport)
		kernel.bootstrap()
		val writesBeforeSave = timeline.size

		val result = kernel.save(CommitIntent.All)

		assertTrue(result.ok)
		assertFalse(result.delivered, "an unreachable backend must not fail the commit")
		assertTrue(result.queued)

		val events = timeline.drop(writesBeforeSave)
		val pendingWrite = events.indexOf("write:${C15tStoreKeys.PENDING}")
		val snapshotWrite = events.indexOf("write:${C15tStoreKeys.SNAPSHOT}")
		val networkCall = events.indexOf("network:save")
		assertTrue(pendingWrite >= 0, "the payload must reach disk, got: $events")
		assertTrue(snapshotWrite >= 0, "the new permissions must be persisted too")
		assertTrue(networkCall >= 0, "the transport must be consulted")
		assertTrue(pendingWrite < networkCall, "the queue write must precede the request, got: $events")

		val queued = transport.saveRequests.single().payload
		assertEquals(4, queued.confirmed.categories.size)
		assertTrue(queued.confirmed.categories.values.all { it })
		assertEquals(queued.givenAt, queued.confirmed.actionAt, "one action time, reused everywhere")
	}

	@Test
	fun `a payload is replayed unchanged after a simulated failure`() {
		val transport = RecordingTransport().respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to true)))

		val attempted = transport.saveRequests.single()
		val before = json.encodeToString(attempted)

		transport.respondSave(SaveOutcome.Delivered)
		val flushed = kernel.flushPending()

		assertEquals(1, flushed.delivered)
		assertEquals(0, flushed.remaining)
		val replayed = transport.saveRequests.last()
		assertEquals(
			before,
			json.encodeToString(replayed),
			"a replay resubmits identical receipts, including the original action time",
		)
		assertEquals(attempted.id, replayed.id, "the same queue entry, not a rebuilt one")
		assertTrue(kernel.snapshot().explicitChoice?.consents?.get("measurement") == true)
	}

	@Test
	fun `two payloads queued back to back fly oldest first, unchanged`() {
		// A device that commits twice with no network is the common case -- accept on
		// the banner, then tune purposes -- and it is where a queue goes wrong: sending
		// only the newest, or rebuilding a payload from the state of the moment, both
		// leave the audit trail describing a choice nobody made.
		val transport = RecordingTransport().respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)
		kernel.bootstrap()

		kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to true)))
		kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to false)))

		assertEquals(2, transport.saveRequests.size, "both commits must be queued, not superseded")
		val attempted = transport.saveRequests.map { json.encodeToString(it) }

		transport.respondSave(SaveOutcome.Delivered)
		val flushed = kernel.flushPending()

		assertEquals(2, flushed.delivered)
		assertEquals(0, flushed.remaining)
		assertEquals(
			attempted,
			transport.saveRequests.drop(2).map { json.encodeToString(it) },
			"both arrive, in the order they were made, with the receipts they were queued with",
		)
		assertFalse(
			kernel.snapshot().explicitChoice?.consents?.get("measurement") == true,
			"the newer commit still wins locally",
		)
	}

	@Test
	fun `a newer init does not rewrite a queued payload`() {
		val transport = RecordingTransport().respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = transport)

		// The first policy resolves, the subject accepts, and the write cannot fly.
		transport.respondInit(
			initSuccess(
				body = initBody(
					policyId = "us-ca",
					policySnapshotToken = "token-old",
					choiceFingerprint = "choice-fp-old",
					policyFingerprint = "policy-fp-old",
				),
			)
		)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		val queued = transport.saveRequests.single()
		val before = json.encodeToString(queued)
		assertEquals("token-old", queued.payload.policySnapshotToken)
		assertEquals("choice-fp-old", assertNotNull(queued.payload.choice?.fingerprint))
		assertEquals("us-ca", queued.payload.decisionInputs?.policyId)

		// A later init replaces everything the queued payload was built against.
		transport.respondInit(
			initSuccess(
				body = initBody(
					policyId = "eu-standard",
					model = "\"opt-out\"",
					scope = """["measurement"]""",
					scopeMode = "\"strict\"",
					policySnapshotToken = "token-new",
					choiceFingerprint = "choice-fp-new",
					policyFingerprint = "policy-fp-new",
				),
			)
		)
		kernel.refresh()
		assertEquals("eu-standard", kernel.snapshot().resolution.policyId)
		assertEquals("token-new", kernel.snapshot().policySnapshotToken)

		transport.respondSave(SaveOutcome.Delivered)
		assertEquals(1, kernel.flushPending().delivered)

		val replayed = transport.saveRequests.last().payload
		assertEquals(before, json.encodeToString(transport.saveRequests.last()), "a queued payload is immutable")
		assertEquals("token-old", replayed.policySnapshotToken, "the new token must not leak into the old write")
		assertEquals("choice-fp-old", replayed.choice?.fingerprint)
		assertEquals("us-ca", replayed.decisionInputs?.policyId)
	}

	@Test
	fun `the queue keeps the newest twenty payloads and drops the oldest`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val queue = PendingSaveQueue(store, limit = 20, idGenerator = idsFrom(1))
		repeat(25) { queue.enqueue(payloadFor(it), 1_700_000_000_000L + it) }

		val pending = queue.pending()
		assertEquals(20, pending.size)
		assertEquals("00000006-0000-4000-8000-000000000000", pending.first().id, "oldest dropped first")
		assertEquals("00000025-0000-4000-8000-000000000000", pending.last().id)
	}

	@Test
	fun `every backend-bound request carries the protocol headers`() {
		val http = RecordingHttpClient { responseFor(it) }
		val kernel = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = HostedTransport(http, NativeConfig(portalUrl = "https://test.c15t.app/")),
		)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		val init = http.requests.first { it.url == "https://test.c15t.app/init" }
		assertEquals(
			C15tProtocol.VERSION_PREFIX + C15tProtocol.DEFAULT_SDK_VERSION,
			init.headers[C15tProtocol.VERSION_HEADER],
		)
		assertEquals("1", init.headers[C15tProtocol.POLICY_CONTRACT_HEADER])

		val save = http.requests.first { it.url == "https://test.c15t.app/subjects" }
		assertEquals("1", save.headers[C15tProtocol.POLICY_CONTRACT_HEADER])
		val body = json.parseToJsonElement(requireNotNull(save.body)).jsonObject
		assertEquals("cookie_banner", body["type"]?.jsonPrimitive?.content)
		assertEquals("test.c15t.app", body["domain"]?.jsonPrimitive?.content, "domain falls back to the host")
		assertEquals("all", body["consentAction"]?.jsonPrimitive?.content)
		assertEquals("opt-in", body["jurisdictionModel"]?.jsonPrimitive?.content)
		assertEquals("snap-1", body["policySnapshotToken"]?.jsonPrimitive?.content)
		assertEquals(
			listOf(
				"consentAction",
				"domain",
				"givenAt",
				"jurisdictionModel",
				"policySnapshotToken",
				"preferences",
				"subjectId",
				"type",
				"uiSource",
				"choice",
			),
			body.keys.toList(),
			"member order matches buildSubjectPostBody, so bodies stay comparable with the fixtures",
		)
	}

	private fun payloadFor(index: Int) = SavePayload(
		subjectId = "subject-1",
		subject = ConsentSubject(id = "subject-1"),
		choice = null,
		confirmed = ConfirmedCoverage(mapOf("measurement" to true), 1_700_000_000_000L + index),
		consents = ConsentSnapshot().effectivePermissions,
		overrides = ConsentSnapshot().overrides,
		user = null,
		model = ConsentSnapshot().model,
		uiSource = ConsentSnapshot().activeUI,
		consentAction = ConsentAction.CUSTOM,
		policySnapshotToken = null,
		givenAt = 1_700_000_000_000L + index,
	)

	private fun idsFrom(start: Int): () -> String {
		var next = start - 1
		return {
			next += 1
			"%08d-0000-4000-8000-000000000000".format(next)
		}
	}

	private fun responseFor(request: com.c15t.core.spi.HttpRequest) = when {
		request.url.endsWith("/init") -> com.c15t.core.spi.HttpResponse(
			status = 200,
			headers = mapOf(C15tProtocol.POLICY_CONTRACT_HEADER to "1"),
			body = initBody(),
		)

		else -> com.c15t.core.spi.HttpResponse(status = 200, body = "{}")
	}
}
