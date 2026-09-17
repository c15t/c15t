package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.DecisionInputs
import com.c15t.core.model.GpcSignal
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PrivacySignals
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.C15tJson
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.transport.SaveBodyBuilder
import com.c15t.core.transport.SaveOutcome
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Pins the corrected overrides and privacy signals on Android: what the core
 * encodes, what it refuses to read back, and what a save body has to carry.
 *
 * `native/CONTRACT.md` first described a `test` override and an `msa` signal, and
 * its Corrections section retires both. The expectations here come from
 * `KernelOverrides` and `KernelPrivacySignals` in `@c15t/core`, which is the
 * authority. `OverrideAndSignalTests.swift` and
 * `protocol/__tests__/protocol.test.ts` pin the same cases, so the three cores
 * cannot drift apart silently.
 */
class OverrideAndSignalTest {
	// -- shape ----------------------------------------------------------------

	@Test
	fun `overrides serialize the four kernel fields and nothing else`() {
		val encoded = fieldsOf(KernelOverrides.serializer(), KernelOverrides(country = "DE", language = "de", gpc = true))

		assertEquals(setOf("country", "region", "language", "gpc"), encoded.keys)
		assertEquals(true, encoded.booleanOf("gpc"))
		assertFalse("test" in encoded.keys, "publisher test mode is a client option, not an override")
	}

	@Test
	fun `privacy signals serialize the detected override active triple`() {
		val encoded = fieldsOf(PrivacySignals.serializer(), PrivacySignals())
		assertFalse("msa" in encoded.keys, "there is no msa signal anywhere in v3")

		val gpc = assertNotNull(encoded["gpc"] as? JsonObject)
		assertEquals(setOf("detected", "override", "active"), gpc.keys)
		assertEquals(false, gpc.booleanOf("detected"))
		assertEquals(false, gpc.booleanOf("active"))
		assertTrue("override" in gpc.keys, "the key is present and null, never absent")
		assertEquals("null", gpc["override"].toString())
	}

	@Test
	fun `an override outranks a detection and a detection alone still activates`() {
		val overridden = GpcSignal.derive(override = false, detected = true)
		assertFalse(overridden.active, "an override off switches a detected signal off")
		assertTrue(overridden.detected, "the detection is still reported, just not honored")

		val detected = GpcSignal.derive(override = null, detected = true)
		assertTrue(detected.active)
		assertNull(detected.override)
	}

	// -- stored envelopes written before the correction -----------------------

	@Test
	fun `an envelope carrying the retired test override reads as nothing stored`() {
		val backend = InMemoryKeyValueStore()
		storeRetiredEnvelope(backend) { snapshot -> withExtraKey(snapshot, "overrides", "test", JsonPrimitive("run-7")) }

		assertNull(C15tStore(backend).readEnvelope(), "the retired field has to fail the read, not be dropped quietly")
	}

	@Test
	fun `an envelope carrying the retired signal pair reads as nothing stored`() {
		val backend = InMemoryKeyValueStore()
		storeRetiredEnvelope(backend) { snapshot ->
			snapshot["privacySignals"] = Json.parseToJsonElement("""{"gpc":true,"msa":false}""")
		}

		assertNull(C15tStore(backend).readEnvelope())
	}

	@Test
	fun `an unreadable envelope serves deny-all and keeps the subject`() {
		val backend = InMemoryKeyValueStore()
		storeRetiredEnvelope(backend) { snapshot -> withExtraKey(snapshot, "overrides", "test", JsonPrimitive("run-7")) }

		val kernel = testKernel(store = C15tStore(backend))
		kernel.bootstrap()
		val snapshot = kernel.snapshot()

		assertFalse(kernel.hasStoredSnapshot, "a payload this build cannot name is nothing stored")
		assertFalse(snapshot.ready, "an unreadable envelope is nothing stored")
		assertTrue(snapshot.policyPending)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(kernel.isAllowed(category), "$category must not be allowed from an envelope this build cannot read")
		}
		assertEquals(
			SUBJECT_ID,
			snapshot.subject?.id,
			"failing closed on a snapshot must not cost the device its identity"
		)
	}

	@Test
	fun `the offline write queue is not screened for retired field names`() {
		val backend = InMemoryKeyValueStore()
		val store = C15tStore(backend)
		val transport = RecordingTransport()
			.respondInit(initSuccess())
			.respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(store = store, transport = transport)
		kernel.bootstrap()
		kernel.save(CommitIntent.All)

		val queued = assertNotNull(backend.read(C15tStoreKeys.PENDING))
		backend.putSilently(C15tStoreKeys.PENDING, queued.replaceFirst("\"overrides\":{", "\"overrides\":{\"test\":\"run-7\","))

		// A queued payload's retired `test` never reached the wire, and its
		// `decisionInputs.gpc` is spelled the same in both shapes. Dropping a stored
		// consent action to police a name would be a worse outcome than replaying it.
		assertEquals(1, store.readPending().size)
	}

	@Test
	fun `a stored active signal is recomputed rather than trusted`() {
		val backend = InMemoryKeyValueStore()
		val envelope = SnapshotEnvelope(
			snapshot = ConsentSnapshot(
				revision = 4,
				policyPending = false,
				ready = true,
				subject = ConsentSubject(id = SUBJECT_ID),
				privacySignals = C15tJson.storage.decodeFromJsonElement(
					PrivacySignals.serializer(),
					Json.parseToJsonElement("""{"gpc":{"detected":false,"override":null,"active":true}}"""),
				),
			),
		)
		backend.putSilently(C15tStoreKeys.SNAPSHOT, C15tJson.storage.encodeToString(SnapshotEnvelope.serializer(), envelope))

		val kernel = testKernel(store = C15tStore(backend), transport = RecordingTransport().respondInit(initSuccess()))
		kernel.bootstrap()
		val signal = kernel.snapshot().privacySignals.gpc

		// `active` is an output. A stored copy that claims a signal is on while saying
		// nothing detected it and nothing overrode it is answered with the value the
		// other two support.
		assertFalse(signal.active)
		assertFalse(signal.detected)
		assertNull(signal.override)
		assertTrue(kernel.hasStoredSnapshot, "the shape is current, so only the derived field is rewritten")
	}

	@Test
	fun `the gpc override survives a storage round trip`() {
		val store = C15tStore(InMemoryKeyValueStore())
		store.writeEnvelope(
			SnapshotEnvelope(snapshot = ConsentSnapshot(revision = 1, overrides = KernelOverrides(language = "en", gpc = true)))
		)

		assertEquals(
			true,
			assertNotNull(store.readEnvelope()).snapshot.overrides.gpc,
			"the override has to survive storage, or the next write looks stale"
		)
	}

	// -- init ----------------------------------------------------------------

	@Test
	fun `init folds the served location and translation language into the overrides`() {
		val transport = RecordingTransport().respondInit(
			initSuccess(
				body = withInitFields(
					initBody(policySnapshotToken = null),
					""""location":{"countryCode":"DE","regionCode":"BE"}""",
					""""translations":{"language":"de"}""",
				),
			),
		)
		val kernel = testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", overrides = KernelOverrides(language = "en")),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = transport,
		)
		kernel.bootstrap()

		// `mapResolvedOverrides` derives the overrides from the location and translation
		// language the same response carries, and the backend recomputes from them
		// before it accepts a save, so a core that reports null here writes a body the
		// backend reads as a different decision.
		val overrides = kernel.snapshot().overrides
		assertEquals("DE", overrides.country)
		assertEquals("BE", overrides.region)
		assertEquals("de", overrides.language, "the served bundle language wins over the app's")
		assertNull(overrides.gpc, "/init never derives an app override")
	}

	@Test
	fun `an app gpc override survives an init that reports only a detection`() {
		val transport = RecordingTransport().respondInit(
			initSuccess(body = withInitFields(initBody(), """"resolvedPrivacySignals":{"gpc":true}""")),
		)
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				overrides = KernelOverrides(gpc = false),
				detectedGpc = true,
			),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = transport,
		)
		kernel.bootstrap()
		val snapshot = kernel.snapshot()

		// The wire serves a detection, never an override, so the app's "off" is the
		// answer the evaluator honors. A boolean gpc/msa pair could not say both
		// "the device asked" and "the app refused".
		assertEquals(false, snapshot.overrides.gpc)
		assertTrue(snapshot.privacySignals.gpc.detected, "the detection is still reported")
		assertFalse(snapshot.privacySignals.gpc.active, "the override outranks it")
	}

	// -- save body -----------------------------------------------------------

	@Test
	fun `a tokenless save asserts gpc among the decision inputs it sends`() {
		val transport = RecordingTransport().respondInit(initSuccess(body = initBody(policySnapshotToken = null)))
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				overrides = KernelOverrides(language = "en", gpc = true),
			),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = transport,
		)
		kernel.bootstrap()
		assertTrue(kernel.save(CommitIntent.All).delivered)

		val payload = assertNotNull(transport.saveRequests.lastOrNull()).payload
		assertNull(payload.policySnapshotToken, "this init served no token")
		assertEquals(true, payload.decisionInputs?.gpc, "the write names the GPC input it was decided under")

		val body = SaveBodyBuilder.build(payload, "test.c15t.app")
		assertFalse("policySnapshotToken" in body.keys)
		assertEquals(true, body.booleanOf("gpc"), "a tokenless write asserts its decision inputs, and gpc is one of them")
		assertEquals("us-ca", body.stringOf("policyId"))
	}

	@Test
	fun `a signed token keeps the flat assertion off the wire`() {
		val transport = RecordingTransport().respondInit(initSuccess())
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				overrides = KernelOverrides(language = "en", gpc = true),
			),
			store = C15tStore(InMemoryKeyValueStore()),
			transport = transport,
		)
		kernel.bootstrap()
		assertTrue(kernel.save(CommitIntent.All).delivered)

		val payload = assertNotNull(transport.saveRequests.lastOrNull()).payload
		assertEquals(true, payload.decisionInputs?.gpc, "the queued payload keeps its inputs whatever the wire does")

		val body = SaveBodyBuilder.build(payload, "test.c15t.app")
		assertEquals("snap-1", body.stringOf("policySnapshotToken"))
		assertFalse("gpc" in body.keys, "the token is the stronger claim, so the flat assertion stays off the wire")
	}

	@Test
	fun `an offline save keeps its gpc decision input through the queue`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport()
			.respondInit(initSuccess(body = initBody(policySnapshotToken = null)))
			.respondSave(SaveOutcome.Unavailable("offline"))
		val kernel = testKernel(
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				overrides = KernelOverrides(language = "en", gpc = true),
			),
			store = store,
			transport = transport,
		)
		kernel.bootstrap()
		val result = kernel.save(CommitIntent.All)
		assertTrue(result.queued)
		assertFalse(result.delivered)

		// A queued payload replays unchanged, so the claim it carries cannot depend on
		// whether the first attempt happened to reach the network.
		assertEquals(true, assertNotNull(store.readPending().firstOrNull()).payload.decisionInputs?.gpc)
	}

	// -- staleness ----------------------------------------------------------

	@Test
	fun `flipping the gpc override makes a remembered decision stale`() {
		val atInit = KernelOverrides(country = "DE", language = "en")
		assertTrue(
			decisionInputsMatch(remembered(atInit, gpcActive = false), atInit),
			"the same context still describes the decision that was made"
		)

		val flipped = KernelOverrides(country = "DE", language = "en", gpc = true)
		assertFalse(
			decisionInputsMatch(remembered(atInit, gpcActive = false), flipped),
			"turning GPC on after init changed an input the decision was made against"
		)
	}

	@Test
	fun `a stored gpc override is compared like any other`() {
		val store = C15tStore(InMemoryKeyValueStore())
		store.writeEnvelope(
			SnapshotEnvelope(snapshot = ConsentSnapshot(revision = 1, overrides = KernelOverrides(language = "en", gpc = true)))
		)
		val restored = assertNotNull(store.readEnvelope()).snapshot.overrides

		assertFalse(
			decisionInputsMatch(remembered(restored, gpcActive = true), KernelOverrides(language = "en", gpc = false)),
			"true then false is a changed input, not an unchanged one"
		)
	}

	@Test
	fun `a detected signal is not an override so it cannot date a write`() {
		val atInit = KernelOverrides(country = "DE", language = "en")
		// The device starts reporting GPC. The evaluation changes; the write does not
		// become stale, because nothing the app pinned moved.
		assertTrue(decisionInputsMatch(remembered(atInit, gpcActive = false), atInit))
		assertNull(atInit.gpc)
	}

	@Test
	fun `an unset override is not compared which is why null has to mean absent`() {
		// `@c15t/core` treats an undefined override as "not pinned". The React Native
		// protocol spells the same thing as an explicit null, so the boundary has to
		// map null to absent before this comparison, or every remembered decision looks
		// stale because null never equals a real country.
		assertTrue(decisionInputsMatch(remembered(KernelOverrides(country = "DE"), gpcActive = false), KernelOverrides()))
	}

	// -- helpers ------------------------------------------------------------

	private fun <T : Any> fieldsOf(serializer: KSerializer<T>, value: T): JsonObject =
		Json.parseToJsonElement(C15tJson.storage.encodeToString(serializer, value)) as JsonObject

	/** Splice [key] with [value] into the nested [parent] object of the snapshot. */
	private fun withExtraKey(
		snapshot: MutableMap<String, JsonElement>,
		parent: String,
		key: String,
		value: JsonElement,
	) {
		val nested = assertNotNull(snapshot[parent] as? JsonObject).toMutableMap()
		nested[key] = value
		snapshot[parent] = JsonObject(nested)
	}

	/**
	 * Park a realistic stored envelope under the contract key, with [retire] applied to
	 * the snapshot so one retired field is the only difference from a healthy read. The
	 * subject lives in its own slot, exactly as it does on a device.
	 */
	private fun storeRetiredEnvelope(
		backend: InMemoryKeyValueStore,
		retire: (MutableMap<String, JsonElement>) -> Unit,
	) {
		val envelope = SnapshotEnvelope(
			snapshot = ConsentSnapshot(
				revision = 9,
				policyPending = false,
				ready = true,
				// A stored grant that survives the splice, so a reader that simply ignored
				// the retired field would keep marketing on. Reinterpreting `test` as a GPC
				// override, or dropping it and keeping the rest, both serve a permission
				// derived from a field this build cannot name.
				effectivePermissions = ConsentState.ALLOW_ALL,
				subject = ConsentSubject(id = SUBJECT_ID),
			),
		)
		val root = Json.parseToJsonElement(
			C15tJson.storage.encodeToString(SnapshotEnvelope.serializer(), envelope)
		).jsonObject.toMutableMap()
		val snapshot = assertNotNull(root["snapshot"] as? JsonObject).toMutableMap()
		retire(snapshot)
		root["snapshot"] = JsonObject(snapshot)

		backend.putSilently(C15tStoreKeys.SNAPSHOT, Json.encodeToString(JsonElement.serializer(), JsonObject(root)))
		backend.putSilently(C15tStoreKeys.SUBJECT, """{"id":"$SUBJECT_ID"}""")
	}

	/** Add top level [extra] fields, given as raw JSON, to an init body. */
	private fun withInitFields(body: String, vararg extra: String): String {
		val inner = body.removePrefix("{").removeSuffix("}")
		val prefixed = extra.joinToString(",")
		return when {
			inner.isEmpty() -> "{$prefixed}"
			prefixed.isEmpty() -> "{$inner}"
			else -> "{$prefixed,$inner}"
		}
	}

	private fun remembered(overrides: KernelOverrides, gpcActive: Boolean): DecisionInputs = DecisionInputs(
		policyId = "us-ca",
		fingerprint = "policy-fp-1",
		country = overrides.country,
		region = overrides.region,
		language = overrides.language ?: "",
		gpc = gpcActive,
	)

	/**
	 * Mirror of `decisionInputsMatchOverrides` in `@c15t/core`.
	 *
	 * The kernel owns the rule and the native cores do not run it, so this feeds the
	 * rule the values this core actually recorded and shows it reaches a different
	 * answer once `gpc` flips. The same cases run against the real function in
	 * `packages/react-native/src/protocol/__tests__/protocol.test.ts`.
	 */
	private fun decisionInputsMatch(inputs: DecisionInputs, overrides: KernelOverrides): Boolean {
		if (overrides.country != null && overrides.country != inputs.country) {
			return false
		}
		if (overrides.region != null && overrides.region != inputs.region) {
			return false
		}
		if (overrides.gpc != null && overrides.gpc != inputs.gpc) {
			return false
		}
		val language = overrides.language ?: return true
		return primaryLanguage(language) == primaryLanguage(inputs.language)
	}

	// The kernel's helper takes a string; `DecisionInputs.language` is nullable here,
	// and a null simply never matches a real primary subtag.
	private fun primaryLanguage(value: String?): String? = value?.lowercase()?.substringBefore('-')

	private fun JsonObject.booleanOf(key: String): Boolean? = (this[key] as? JsonPrimitive)?.booleanOrNull

	private fun JsonObject.stringOf(key: String): String? = (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content

	private companion object {
		const val SUBJECT_ID = "6f1d2c3a-8b4e-4a7f-9c21-0d5e7a9b1c03"
	}
}
