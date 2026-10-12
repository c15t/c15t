package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.PolicyResolution
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.PolicyPrompt
import com.c15t.core.policy.ScopeMode
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.store.TcBusValue
import com.c15t.core.store.TcStorageBusKeys
import com.c15t.core.store.TcStorageBusProjection
import com.c15t.core.store.TcStorageBusSink
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import kotlinx.serialization.json.add
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
import kotlinx.serialization.json.JsonNull
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** A bus endpoint that remembers what the core told it. */
internal class RecordingTcStorageBus : TcStorageBusSink {
	private val lock = Any()
	private var _live: Map<String, TcBusValue> = emptyMap()
	private var _cleared = 0
	private var _writes = 0

	val live: Map<String, TcBusValue>
		get() = synchronized(lock) { _live }

	val clears: Int
		get() = synchronized(lock) { _cleared }

	val writes: Int
		get() = synchronized(lock) { _writes }

	override fun write(values: Map<String, TcBusValue>) {
		synchronized(lock) {
			_writes += 1
			_live = values
		}
	}

	override fun clear() {
		synchronized(lock) {
			_cleared += 1
			_live = emptyMap()
		}
	}

	/** Somebody outside the core emptied the application-default file. */
	fun simulateWipedExternally() {
		synchronized(lock) { _live = emptyMap() }
	}
}

/**
 * The projection of stored state onto the `IABTCF_*` table, and the store and
 * kernel steps that move it.
 */
class TcStorageBusTest {
	private fun gvl(tcfPolicyVersion: Long = 5) = com.c15t.core.tc.GlobalVendorList(
		purposes = emptyMap(),
		vendors = emptyMap(),
		vendorListVersion = 177L,
		tcfPolicyVersion = tcfPolicyVersion,
	)

	private fun envelope(
		policyPending: Boolean = true,
		status: String = PolicyResolution.STATUS_UNCONFIGURED,
		list: com.c15t.core.tc.GlobalVendorList? = null,
		policy: EvaluationPolicy? = null,
	) = SnapshotEnvelope(
		snapshot = ConsentSnapshot.denyAll(ConsentSubject(id = "sub_bus1"), now = 0L).copy(
			policyPending = policyPending,
			resolution = PolicyResolution(
				status = status,
				policyId = if (status == PolicyResolution.STATUS_MATCHED) "de-1" else null,
			),
		),
		evaluationPolicy = policy,
		gvl = list,
	)

	/** The matched rule a bus write normally sits on. */
	private fun rule(model: ConsentModel) = EvaluationPolicy(
		id = "de-1",
		model = model,
		prompt = PolicyPrompt.CHOICE,
		scope = listOf(ConsentCategory.MARKETING),
		scopeMode = ScopeMode.STRICT,
		choiceMs = 30L * 24 * 60 * 60 * 1000,
		noticeMs = 30L * 24 * 60 * 60 * 1000,
		choiceFingerprint = "choice-fp-1",
		policyFingerprint = "policy-fp-1",
	)

	// -- 1. Projection --------------------------------------------------------

	@Test
	fun coldStartEnvelopeProjectsNoRows() {
		assertEquals(emptyMap(), TcStorageBusProjection.values(envelope()))
	}

	@Test
	fun policyVersionFollowsTheStoredVendorList() {
		assertEquals(
			TcBusValue.NumberValue(5),
			TcStorageBusProjection.values(envelope(list = gvl(5)))[TcStorageBusKeys.POLICY_VERSION],
		)
		// The list's own number, not a constant a build could have kept from an
		// older document.
		assertEquals(
			TcBusValue.NumberValue(6),
			TcStorageBusProjection.values(envelope(list = gvl(6)))[TcStorageBusKeys.POLICY_VERSION],
		)
		assertNotNull(TcStorageBusProjection.values(envelope(list = gvl()))[TcStorageBusKeys.POLICY_VERSION])
		// A wipe drops the list with the policy claim, and the row goes back to
		// absent rather than lying about a version nothing serves.
		assertNull(TcStorageBusProjection.values(envelope())[TcStorageBusKeys.POLICY_VERSION])
	}

	@Test
	fun gdprAppliesAnswersOnlyForAResolvedPolicy() {
		// Mirrors `policyRule.model === "iab"` from `packages/iab`: every model but
		// `iab` answers false there, so a matched policy that names no IAB rule owes
		// 0 and nothing more. The IAB answer is the next test.
		assertEquals(
			TcBusValue.NumberValue(0),
			TcStorageBusProjection
				.values(envelope(policyPending = false, status = PolicyResolution.STATUS_MATCHED))
				[TcStorageBusKeys.GDPR_APPLIES],
		)
		val silent = listOf(
			envelope(),
			envelope(policyPending = false, status = PolicyResolution.STATUS_NO_MATCH),
			envelope(policyPending = false, status = PolicyResolution.STATUS_FAILED),
			// The fail-closed pair a rejected re-read leaves behind.
			envelope(policyPending = true, status = PolicyResolution.STATUS_MATCHED),
		)
		for (subject in silent) {
			assertNull(
				TcStorageBusProjection.values(subject)[TcStorageBusKeys.GDPR_APPLIES],
				"an unresolved policy must not claim an answer",
			)
		}
	}

	/**
	 * The one bus row this core's IAB support moves: an IAB rule reads 1, which is the
	 * question `packages/iab` asks (`policyRule.model === "iab"`).
	 *
	 * It is read off the envelope's own rule and not off `snapshot.model`, because this
	 * core reports `opt-in` while an IAB rule runs -- the report is about what the device
	 * can back with a record, and this row is about which rule matched. Reading it off the
	 * envelope is also what keeps a rebuilt bus equal to the one the commit published.
	 */
	@Test
	fun gdprAppliesReadsOneUnderAStoredIABRule() {
		val iab = envelope(
			policyPending = false,
			status = PolicyResolution.STATUS_MATCHED,
			policy = rule(ConsentModel.IAB),
		)
		assertEquals(
			TcBusValue.NumberValue(1),
			TcStorageBusProjection.values(iab)[TcStorageBusKeys.GDPR_APPLIES],
			"an IAB rule applies GDPR, whatever the snapshot reports",
		)
		assertEquals(
			ConsentModel.OPT_IN,
			iab.snapshot.model,
			"and this core still reports opt-in while it runs",
		)

		val optIn = envelope(
			policyPending = false,
			status = PolicyResolution.STATUS_MATCHED,
			policy = rule(ConsentModel.OPT_IN),
		)
		assertEquals(
			TcBusValue.NumberValue(0),
			TcStorageBusProjection.values(optIn)[TcStorageBusKeys.GDPR_APPLIES],
			"a model that is not IAB keeps the web's own 0",
		)
	}

	@Test
	fun projectionNamesOnlySpecTableKeys() {
		val full = envelope(
			policyPending = false,
			status = PolicyResolution.STATUS_MATCHED,
			list = gvl(),
		)
		for (key in TcStorageBusProjection.values(full).keys) {
			assertTrue(key in TcStorageBusKeys.ALL_NAMES, "$key is not a row of the spec table")
		}
	}

	// -- 2. The store steps --------------------------------------------------

	@Test
	fun writeEnvelopePublishesTheProjectionOfTheCommittedBytes() {
		val backend = InMemoryKeyValueStore()
		val bus = RecordingTcStorageBus()
		val store = C15tStore(backend = backend, tcStorageBus = bus)

		store.writeEnvelope(envelope(policyPending = false, status = PolicyResolution.STATUS_MATCHED, list = gvl(5)))

		// The commit-step rule read back: the live bus equals the projection of
		// the bytes actually in the store, not of whatever the caller had in mind.
		val stored = assertNotNull(store.readEnvelope())
		assertEquals(TcStorageBusProjection.values(stored), bus.live)
		assertEquals(TcBusValue.NumberValue(5), bus.live[TcStorageBusKeys.POLICY_VERSION])
		assertEquals(TcBusValue.NumberValue(0), bus.live[TcStorageBusKeys.GDPR_APPLIES])
	}

	@Test
	fun clearConsentStateClearsTheBus() {
		val backend = InMemoryKeyValueStore()
		val bus = RecordingTcStorageBus()
		val store = C15tStore(backend = backend, tcStorageBus = bus)
		store.writeEnvelope(envelope(policyPending = false, status = PolicyResolution.STATUS_MATCHED, list = gvl()))
		assertTrue(bus.live.isNotEmpty())

		store.clearConsentState()

		assertNull(backend.read(C15tStoreKeys.SNAPSHOT), "the authoritative wipe still happens")
		assertEquals(emptyMap(), bus.live)
		assertTrue(bus.clears >= 1, "an explicit clear, not a later projection")
	}

	@Test
	fun rebuildRecreatesTheBusAfterSomebodyWipesIt() {
		val backend = InMemoryKeyValueStore()
		val bus = RecordingTcStorageBus()
		val store = C15tStore(backend = backend, tcStorageBus = bus)
		store.writeEnvelope(envelope(policyPending = false, status = PolicyResolution.STATUS_MATCHED, list = gvl()))
		val committed = bus.live

		bus.simulateWipedExternally()
		store.rebuildTcStorageBus()

		assertEquals(committed, bus.live, "the bus is rebuildable from stored state alone")
	}

	@Test
	fun rebuildWithNothingStoredClearsTheBus() {
		// A stale mirror the core never wrote (a prior CMP's, or a dropped
		// projection): with nothing stored, rebuild makes the bus match the
		// store, which means emptying it.
		val shared = RecordingTcStorageBus()
		shared.write(mapOf(TcStorageBusKeys.TC_STRING to TcBusValue.TextValue("stale")))
		val store = C15tStore(backend = InMemoryKeyValueStore(), tcStorageBus = shared)

		store.rebuildTcStorageBus()
		assertEquals(emptyMap(), shared.live, "nothing stored means nothing mirrored")
	}

	// -- 3. Kernel launch keeps the mirror in step ---------------------------

	private val servedGvlJson = buildJsonObject {
		put("gvlSpecificationVersion", 3)
		put("vendorListVersion", 177L)
		put("tcfPolicyVersion", 5L)
		put("lastUpdated", "2025-11-01T00:00:00Z")
		putJsonObject("purposes") {
			putJsonObject("1") {
				put("id", 1)
				put("name", "Access")
				put("description", "Access")
				putJsonArray("illustrations") {}
			}
		}
		putJsonObject("specialPurposes") {}
		putJsonObject("features") {}
		putJsonObject("specialFeatures") {}
		putJsonObject("stacks") {}
		putJsonObject("vendors") {
			putJsonObject("1") {
				put("id", 1)
				put("name", "Vendor One")
				putJsonArray("purposes") { add(1) }
				putJsonArray("legIntPurposes") {}
				putJsonArray("specialPurposes") {}
				putJsonArray("flexiblePurposes") {}
				putJsonArray("features") {}
				putJsonArray("specialFeatures") {}
				put("cookieMaxAgeSeconds", JsonNull)
				put("cookieRefresh", false)
				put("usesCookies", true)
				put("usesNonCookieAccess", false)
				putJsonArray("urls") {}
			}
		}
	}.toString()

	@Test
	fun bootstrappingWithAServedListAndAMatchedPolicyPublishesBothRows() {
		val backend = InMemoryKeyValueStore()
		val bus = RecordingTcStorageBus()
		val store = C15tStore(backend = backend, tcStorageBus = bus)
		val transport = RecordingTransport().respondInit(
			initSuccess(body = initBody(policyId = "de-1", gvl = servedGvlJson)),
		)
		testKernel(store = store, transport = transport).bootstrap()

		assertEquals(TcBusValue.NumberValue(5), bus.live[TcStorageBusKeys.POLICY_VERSION], "bus: ${bus.live}")
		assertEquals(TcBusValue.NumberValue(0), bus.live[TcStorageBusKeys.GDPR_APPLIES], "bus: ${bus.live}")
	}

	@Test
	fun resetClearsTheKeysWeWrote() {
		val backend = InMemoryKeyValueStore()
		val bus = RecordingTcStorageBus()
		val store = C15tStore(backend = backend, tcStorageBus = bus)
		// The second answer sticks as the transport's steady state: after the
		// reset the re-init finds an unresolved policy, so whatever the bus
		// holds then is the projection of the wiped state, not of the old hit.
		val transport = RecordingTransport()
			.respondInit(initSuccess(body = initBody(policyId = "de-1", gvl = servedGvlJson)))
			.respondInit(initSuccess(body = initBody(includePolicyResolution = false)))
		val kernel = testKernel(store = store, transport = transport)
		kernel.bootstrap()
		assertTrue(bus.live.isNotEmpty())

		kernel.reset()

		assertEquals(emptyMap(), bus.live, "reset removed every bus value the core knew about")
		assertTrue(bus.clears >= 1)
	}

	@Test
	fun relaunchAfterAnExternalWipeRepublishesFromTheStoredEnvelope() {
		val backend = InMemoryKeyValueStore()
		val busA = RecordingTcStorageBus()
		val transport = RecordingTransport().respondInit(
			initSuccess(body = initBody(policyId = "de-1", gvl = servedGvlJson)),
		)
		testKernel(store = C15tStore(backend = backend, tcStorageBus = busA), transport = transport).bootstrap()
		val expected = busA.live
		assertTrue(expected.isNotEmpty())

		// The application-default file goes away (uninstall, a publisher clear)
		// while the encrypted store under `noBackupFilesDir` keeps the envelope.
		// Relaunching must republish the mirror from that envelope.
		busA.simulateWipedExternally()
		val busB = RecordingTcStorageBus()
		testKernel(store = C15tStore(backend = backend, tcStorageBus = busB)).bootstrap()

		assertEquals(expected, busB.live, "launch republished the bus from the stored envelope")
	}
}
