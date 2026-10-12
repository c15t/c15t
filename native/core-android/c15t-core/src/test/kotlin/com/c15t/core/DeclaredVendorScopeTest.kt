package com.c15t.core

import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.TcBusValue
import com.c15t.core.store.TcStorageBusKeys
import com.c15t.core.tc.GlobalVendorListJson
import com.c15t.core.tc.VendorListScopeFixture
import com.c15t.core.tc.VendorListScopeFixtures
import com.c15t.core.tc.narrowToVendorIds
import com.c15t.core.transport.TransportOutcome
import com.c15t.core.wire.SnapshotWire
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * A publisher's declared vendor scope, taken from [NativeConfig.vendors] through the kernel.
 *
 * [com.c15t.core.tc.narrowToVendorIds] has always been correct and has always been called only from
 * a test, which is the gap this file closes: a device discloses exactly the scope the server chose
 * to embed, and a setting nobody reads is not a setting. Everything here therefore enters through
 * [C15tKernel.bootstrap] with a configured core and leaves through one of the three surfaces a host
 * actually reads -- the published snapshot, the body a bridge forwards, and the `IABTCF_*` mirror --
 * because a prune that lives only inside the helper would still leave all three serving the wide list.
 *
 * The vectors are the shared `native/protocol/vendor-list-scope-*` fixtures this core already claims
 * in [com.c15t.core.tc.VendorListScopeFixturesTest], graded here through the kernel rather than
 * against the helper directly. Their oracle is `narrowGVLToVendors` in
 * `packages/iab/src/tcf/fetch-gvl.ts`, called by the generator, so what a scoped device ends up
 * holding is the browser build's answer and not Kotlin's opinion about it.
 *
 * Two axes are deliberately absent here, because they belong to the file that grades the prune and
 * would only be re-graded worse from a kernel: which entry survives a disagreement between a served
 * key and a body `id`, and the field-by-field shape of a survivor. What this file adds on top of
 * that is the storage half -- a scope declared after the bytes were written -- and the request half,
 * which is in [VendorScopeHeaderTest].
 */
class DeclaredVendorScopeTest {
	private val fixtures: List<VendorListScopeFixture> = VendorListScopeFixtures.load()

	init {
		// Without this, a fixture directory that stopped publishing vectors turns every loop below
		// into a green run over nothing.
		assertTrue(fixtures.isNotEmpty(), "no vendor-list-scope fixtures are published, so nothing below runs")
	}

	/**
	 * A wide served list and a declared scope leave a narrow snapshot, on both keys.
	 *
	 * The list the fixture serves carries 54 vendors and the declaration names 32, and the answer has
	 * to be the 32 the web returned on the field the dialog draws from (`snapshot.iab.gvl`, which
	 * `packages/react-native/src/protocol/snapshot.ts` declares and `core-swift` already fills) and on
	 * the accessor a host's own Kotlin reads, which is one value read two ways -- so a prune on the
	 * fold would show up here rather than hiding behind a helper that passes.
	 *
	 * The count is pinned beside the keys because two equal key sets is also what a run that read no
	 * document at all produces.
	 */
	@Test
	fun `a wide served list and a declared scope give a narrow snapshot`() {
		val fixture = fixture("scope-32-vendors")
		val kernel = serve(fixture, scope = fixture.declaredScope())
		kernel.bootstrap()

		val served = assertNotNull(GlobalVendorListJson.read(fixture.served))
		assertEquals(54, served.vendors.size, "the fixture stopped serving a wide list")

		val held = assertNotNull(kernel.vendorList, "a `/init` that served a list has to leave one held")
		assertEquals(fixture.expectedVendorKeys.map(Long::toInt), held.vendors.keys.toList(), "survivors, in served order")
		assertEquals(32, held.vendors.size)
		assertEquals(held, kernel.snapshot().iab?.gvl, "the accessor and the key the bridge reads are one list")

		// And the framework half came along for the ride: a scope is an answer about partners, not
		// about what purpose 7 means.
		assertEquals(served.purposes.keys, held.purposes.keys, "purposes were pruned")
		assertEquals(served.vendorListVersion, held.vendorListVersion)
		assertEquals(served.tcfPolicyVersion, held.tcfPolicyVersion)
	}

	/**
	 * The body a bridge forwards is the narrowed document, not the served one.
	 *
	 * This is the axis with a subject-facing consequence: a JavaScript preference centre draws its
	 * partner rows out of these bytes, and a device that pruned its own model while forwarding the
	 * served document would render 54 names under a declaration of 32. The claim is the exact key set
	 * on the payload, plus that the document sitting on the snapshot is the same one, so a body built
	 * from a second copy of the list cannot pass.
	 */
	@Test
	fun `the bridge payload a scoped device forwards is the narrow document`() {
		val fixture = fixture("scope-32-vendors")
		val kernel = serve(fixture, scope = fixture.declaredScope())
		kernel.bootstrap()

		val document = assertNotNull(kernel.vendorListJson())["vendors"]?.jsonObject
		assertEquals(
			fixture.expectedVendorKeys.map { it.toString() },
			document?.keys?.toList(),
			"the partner rows a dialog draws come from the declared scope",
		)
		val onSnapshot = (SnapshotWire.toJsonElement(kernel.snapshot())["iab"]?.jsonObject?.get("gvl") as? JsonObject)
			?: throw AssertionError("the wire lost the `iab` object holding the list")
		assertEquals(
			document,
			onSnapshot["vendors"]?.jsonObject,
			"the body a host's own Kotlin is handed and the body the bridge forwards are one document",
		)
	}

	/**
	 * No declared scope -- `null` or an empty list -- leaves the served list untouched.
	 *
	 * The fail-open half, and the mistake with the worst shape: a core that reads `emptyList()` as
	 * "show nobody" hands a publisher who never scoped anything a preference centre with no vendors in
	 * it, under a consent the subject can still give. Web reads it that way twice over, and both
	 * shapes have to answer alike here, on the bytes and not only on the model. The stored envelope is
	 * compared too, because a rule that no-oped in memory while rewriting the document on disk would
	 * still wake up wide on the next launch.
	 */
	@Test
	fun `no declared scope leaves the served list untouched`() {
		for (shape in listOf("scope-absent", "scope-empty")) {
			val fixture = fixture(shape)
			assertTrue(fixture.unchanged, "${fixture.id}: the fixture claims a rebuilt document for a scope nobody declared")
			val store = C15tStore(InMemoryKeyValueStore())
			// `null` for the vector with no scope at all, `emptyList()` for the one with an empty
			// scope: the config field carries the shape the vector published, because the whole claim
			// is that the two shapes stop differing once they reach a device.
			val kernel = serve(fixture, scope = fixture.intScope(), store = store)
			kernel.bootstrap()

			val served = assertNotNull(GlobalVendorListJson.read(fixture.served))
			val held = assertNotNull(kernel.vendorList, "${fixture.id}: a list nobody scoped came back missing")
			assertEquals(served, held, "${fixture.id}: a host that declared no scope came back with a pruned list")
			assertEquals(served.vendors.keys.toList(), held.vendors.keys.toList(), "${fixture.id}: survivors, in served order")
			assertEquals(54, held.vendors.size, "${fixture.id}: a scope nobody declared cannot shorten the drawer")
			assertEquals(
				GlobalVendorListJson.toJsonElement(served).toString(),
				kernel.vendorListBody(),
				"${fixture.id}: the bytes a bridge forwards moved for a scope nobody declared",
			)
			assertEquals(
				served,
				store.readEnvelope()?.gvl,
				"${fixture.id}: the stored document moved for a scope nobody declared",
			)
		}
	}

	/**
	 * Bytes stored before the host declared a scope come back narrow, and stop being stored wide.
	 *
	 * The part a "we prune what `/init` served us" rule quietly misses. The warm device below has no
	 * declaration at all -- which is every installed device one release before the publisher adds a
	 * `vendors` list -- and the cold one declares one over bytes it did not write. Those bytes have to
	 * be pruned on the way *in*, because the drawer that opens before `/init` answers is drawn from
	 * them, and on a device whose network never comes back that drawer is the answer for the life of
	 * the app. The stored document is re-narrowed on the same launch, so a relaunch of the same build
	 * is not back to square one.
	 *
	 * A scope already in force makes this call a no-op -- pruning an already-narrow list returns an
	 * equal one -- so this is the whole rule rather than a race against the network.
	 */
	@Test
	fun `a list stored wide comes back narrow once the host declares a scope`() {
		val fixture = fixture("scope-32-vendors")
		val scope = fixture.declaredScope()
		val backend = InMemoryKeyValueStore()

		// Release N: no declaration, so the envelope on disk is the served document whole.
		val warm = serve(fixture, scope = null, store = C15tStore(backend))
		warm.bootstrap()
		val wide = assertNotNull(warm.vendorListBody(), "the first release held the whole served list")
		assertEquals(54, warm.vendorList?.vendors?.size, "the warm device holds what it was served")

		// Release N+1: the host declares a scope, and this launch never hears from the backend, so no
		// `/init` is on its way to correct anything the stored bytes got wrong.
		val coldTransport = RecordingTransport()
		val coldStore = C15tStore(backend)
		val cold = testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = scope),
			store = coldStore,
			transport = coldTransport,
		)
		cold.bootstrap()

		val held = assertNotNull(cold.vendorList, "the stored list still has to be there")
		assertEquals(scope.toSet(), held.vendors.keys.toSet(), "declared ids, and only those")
		assertEquals(32, held.vendors.size)
		assertEquals(held, cold.snapshot().iab?.gvl, "the narrow answer is on the key the bridge reads too")
		assertTrue(
			held.vendors.keys.all { it in scope },
			"a bridge opened before `/init` answers must not name a vendor the host did not",
		)
		assertTrue(wide != cold.vendorListBody(), "the payload is unchanged, which is the failure this case exists for")
		assertEquals(1, coldTransport.initRequests.size, "this launch asked, and the transport scripted no answer")

		// The repair is stored, not just remembered: the next launch of the same build hydrates a
		// document that already says what the device discloses.
		val relaunched = testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = scope),
			store = C15tStore(backend),
			transport = RecordingTransport(),
		)
		relaunched.bootstrap()
		assertEquals(held.vendors.keys.toList(), relaunched.vendorList?.vendors?.keys?.toList(), "narrow on disk, so narrow on the next launch")
		assertNotNull(coldStore.readEnvelope()?.gvl, "and still stored")
	}

	/**
	 * A stored list inside the snapshot's own `iab` object is pruned as honestly as the envelope key.
	 *
	 * [com.c15t.core.C15tKernel.bootstrap] reads two shapes -- the envelope's `gvl` key, which is what
	 * this build writes, and `snapshot.iab.gvl`, which is what a device holding the list that way must
	 * not be stranded without. A scope applied to the preferred branch only would leave the fallback
	 * disclosing the wide list, and a reader that never sees the fallback would call that green.
	 */
	@Test
	fun `a scope applies to a list stored inside the snapshot too`() {
		val fixture = fixture("scope-32-vendors")
		val scope = fixture.declaredScope()
		val backend = InMemoryKeyValueStore()
		serve(fixture, scope = null, store = C15tStore(backend)).bootstrap()
		val stored = kotlinx.serialization.json.Json.parseToJsonElement(
			assertNotNull(backend.read(C15tStoreKeys.SNAPSHOT)),
		).jsonObject
		val gvl = stored["gvl"] ?: throw AssertionError("the warm write carried no list")
		backend.write(
			C15tStoreKeys.SNAPSHOT,
			buildJsonObject {
				stored.forEach { (key, value) ->
					if (key != "snapshot" && key != "gvl") {
						put(key, value)
					}
				}
				put("snapshot", stored["snapshot"]!!.jsonObject.withIabHolding(gvl))
			}.toString(),
		)

		val kernel = testKernel(
			config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = scope),
			store = C15tStore(backend),
			transport = RecordingTransport(),
		)
		kernel.bootstrap()

		val held = assertNotNull(kernel.vendorList, "read off the snapshot, with no envelope key to fall back on")
		assertEquals(scope.toSet(), held.vendors.keys.toSet(), "the fallback branch is scoped the same way")
	}

	/**
	 * A scope prunes the drawer and moves nothing the storage mirror reports.
	 *
	 * The `IABTCF_*` rows this build writes are the served policy version and the matched rule's model,
	 * and a vendor prune leaves both numbers exactly as served -- which is the claim, not an aside.
	 * The version vector serves policy 4 under list 431 precisely so a core that rebuilt a narrowed
	 * list from its own constants answers 5 here, in the one place an ad SDK reads a version out of.
	 */
	@Test
	fun `a declared scope prunes the drawer and leaves the projected versions alone`() {
		val fixture = fixture("scope-versions-preserved")
		val scope = fixture.declaredScope()
		val bus = RecordingTcStorageBus()
		val kernel = serve(fixture, scope = scope, store = C15tStore(InMemoryKeyValueStore(), tcStorageBus = bus))
		kernel.bootstrap()

		val held = assertNotNull(kernel.vendorList)
		assertEquals(scope.toSet(), held.vendors.keys.toSet(), "two declared ids, two disclosed vendors")
		assertEquals(4, bus.live[TcStorageBusKeys.POLICY_VERSION]?.let { (it as TcBusValue.NumberValue).value }, "the served tcfPolicyVersion, not this build's default")
		assertEquals(4L, held.tcfPolicyVersion)
		assertEquals(431L, held.vendorListVersion)
	}

	// -- helpers -------------------------------------------------------------

	/**
	 * A kernel configured with [scope], served [fixture]'s document on `/init` over [store].
	 *
	 * The list goes onto the wire exactly as the fixture wrote it, so the wide document the core has to
	 * prune is the wide document the vectors lane published rather than a summary of it.
	 */
	private fun serve(
		fixture: VendorListScopeFixture,
		scope: List<Int>?,
		store: C15tStore = C15tStore(InMemoryKeyValueStore()),
	): C15tKernel = testKernel(
		config = NativeConfig(portalUrl = "https://test.c15t.app", vendors = scope),
		store = store,
		transport = RecordingTransport().respondInit(
			initSuccess(body = initBody(policyId = "de-tcf", model = "\"iab\"", gvl = fixture.served.toString())),
		),
	)

	private fun fixture(shape: String): VendorListScopeFixture =
		fixtures.firstOrNull { it.shape == shape }
			?: throw AssertionError("no vendor-list-scope fixture has shape $shape")

	/**
	 * The declared ids as this core numbers them, exactly as published: `null` for the vector that
	 * declares no scope and an empty list for the one that declares an empty one.
	 */
	private fun VendorListScopeFixture.intScope(): List<Int>? = scope?.map(Long::toInt)

	/** The same for a vector this file only runs when a scope really was declared. */
	private fun VendorListScopeFixture.declaredScope(): List<Int> =
		intScope()?.takeIf { it.isNotEmpty() }
			?: throw AssertionError("${'$'}id: a vector graded against a scope declares none")
}

/** Move the top-level `gvl` document into the snapshot's own `iab` object, leaving every other byte. */
private fun JsonObject.withIabHolding(gvl: JsonElement): JsonObject = buildJsonObject {
	this@withIabHolding.forEach { (key, value) ->
		if (key != "iab") {
			put(key, value)
		} else {
			put("iab", buildJsonObject { put("gvl", gvl) })
		}
	}
}
