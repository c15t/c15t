package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelError
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.tc.GlobalVendorListJson
import com.c15t.core.transport.TransportOutcome
import com.c15t.core.wire.SnapshotWire
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The device half of the vendor list: what `/init` hands over, what the core keeps, and what it
 * answers when asked.
 *
 * `GlobalVendorListShapeTest` grades the document and `TcServedVendorListTest` grades the bytes the
 * encoder writes against it. This class grades the promises wrapped around them, which is where a
 * requirement about a quiet device actually gets checked:
 *
 *   * An absent `gvl` is an ordinary `/init`, not a failure. The backend embeds one only for a matched
 *     `iab` policy, so most devices never see the key, and nothing that works today may start
 *     failing because of it. Both edges run here as a pair of kernels, one served a list and one not,
 *     answered against each other: that is the only way "identical behaviour" means something.
 *   * A list outlives the `/init` that served it. A purpose name and a vendor name already shown to a
 *     subject are claims the disclosure and the TC String keep repeating on every later launch, so a
 *     refresh that happened to carry no `gvl` cannot take them back, in memory or on disk.
 *   * The loss is the policy's own loss and no wider. A wipe drops the list with the matched rule it
 *     is stored beside; a failed init drops nothing.
 *   * One copy on disk, one answer in memory. The document is stored under the envelope's own `gvl`
 *     key and published on `snapshot.iab`, which is the key the bridge reads; the two are the same
 *     list, and the blob does not hold it twice.
 */
class VendorListRetentionTest {
	private val json = Json { ignoreUnknownKeys = true }

	/**
	 * A list on the body reaches the snapshot the bridge reads, and is stored once.
	 *
	 * Three places, one document. A drawer that names partners reads `snapshot.iab.gvl`, which is the
	 * key `packages/react-native/src/protocol/snapshot.ts` declares and the key `core-swift` fills, so
	 * a body parked only behind a kernel accessor left that drawer empty on Android while the same
	 * build worked on iOS. [com.c15t.core.C15tKernel.vendorList] is now that same field read a second
	 * way, which is what keeps a native disclosure and a JavaScript one naming the same vendors.
	 *
	 * The stored half is still the load-bearing half -- the envelope is what proves the list will be
	 * there tomorrow -- and it keeps exactly one copy of the document, under `gvl`, the key the build
	 * before this snapshot field wrote. This document is by far the largest thing in the blob and the
	 * write happens on every committed mutation, so the stored snapshot goes with its `iab` nulled and
	 * hydration puts it back.
	 */
	@Test
	fun `a served list reaches the snapshot and is stored once`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val kernel = testKernel(store = store, transport = RecordingTransport().respondInit(initWithGvl(GVL)))
		kernel.bootstrap()

		val held = assertNotNull(kernel.vendorList, "a body that carried a list has to leave one held")
		assertEquals(177L, held.vendorListVersion)
		assertEquals(5L, held.tcfPolicyVersion)
		assertNotNull(held.vendor(755), "a vendor is keyed by its id")
		assertNull(held.vendor(404), "this list carries no such vendor")

		// The key a partner list is actually drawn from.
		val served = assertNotNull(kernel.snapshot().iab?.gvl, "the published snapshot carries the list")
		assertEquals(held, served, "the accessor and the snapshot are one list, not two answers")

		// In the layout the web reads it in: the served keys and no others, so a document that never
		// carried `dataCategories` does not arrive wearing one.
		val iab = (SnapshotWire.toJsonElement(kernel.snapshot())["iab"] as? JsonObject)
			?: throw AssertionError("the wire lost the `iab` object holding the list")
		assertEquals(setOf("gvl"), iab.keys, "the kernel's `KernelIABState` carries `gvl` and nothing beside it")
		val document = iab["gvl"]!!.jsonObject
		assertEquals(
			SERVED_KEYS.toSet(),
			document.keys,
			"the body on the snapshot is the served document, not this core's storage layout",
		)
		assertEquals(
			listOf("8", "755"),
			document["vendors"]!!.jsonObject.keys.toList(),
			"vendors come back as an object keyed by id, in the order the list arrived",
		)
		assertEquals(
			GlobalVendorListJson.toJsonElement(served),
			document,
			"the body on the snapshot and the body a host's own Kotlin is handed are one document",
		)

		val envelope = assertNotNull(store.readEnvelope(), "an init that resolved has to be stored")
		assertEquals(held, envelope.gvl, "the list has to outlive this process")
		assertNotNull(envelope.evaluationPolicy, "the policy it arrived with is stored the same way")
		assertNull(
			envelope.snapshot.iab,
			"the blob holds the document once, under `gvl`, and not again inside the snapshot",
		)
	}

	/**
	 * Bytes written by the build that kept the list only on the envelope key still give this build a
	 * disclosure, and this build leaves that build the facts it knows how to read.
	 *
	 * Both directions ride on one property: for these two keys the bytes did not change shape. The
	 * earlier build wrote a populated top-level `gvl` and an `iab` sitting at `null`, which is what
	 * [com.c15t.core.C15tKernel.persist] writes today and what [com.c15t.core.C15tKernel.bootstrap]
	 * reads back onto the slot, so an installed device keeps the list it already paid for. The upgrade
	 * read is run here. What the build *behind* this one would read cannot be run from this tree, so
	 * that half is graded as the shape it depends on -- `iab` written null, `gvl` written under the
	 * same name holding the same document -- which is all that build parsed.
	 */
	@Test
	fun `stored bytes agree with the build either side of this field`() {
		val backend = InMemoryKeyValueStore()
		val warm = testKernel(
			store = C15tStore(backend),
			transport = RecordingTransport().respondInit(initWithGvl(GVL)),
		)
		warm.bootstrap()
		val body = assertNotNull(warm.vendorListBody())

		val raw = assertNotNull(backend.read(C15tStoreKeys.SNAPSHOT), "a resolved init has to have written bytes")
		val stored = json.parseToJsonElement(raw).jsonObject
		assertEquals(
			JsonNull,
			stored["snapshot"]!!.jsonObject["iab"],
			"the stored snapshot keeps the null the previous build's model read, so those bytes still parse there",
		)
		assertEquals(
			SERVED_KEYS.toSet(),
			stored["gvl"]!!.jsonObject.keys,
			"`gvl` is the same document under the same name, which is all the previous build read",
		)

		// The upgrade itself: those same bytes, a kernel that never saw the `/init` that served them,
		// and a network that stays shut.
		val cold = testKernel(
			store = C15tStore(InMemoryKeyValueStore(mapOf(C15tStoreKeys.SNAPSHOT to raw))),
			transport = RecordingTransport(),
		)
		cold.bootstrap()
		assertEquals(body, cold.vendorListBody(), "hydrated off the envelope key")
		assertNotNull(cold.snapshot().iab?.gvl, "and back on the key the bridge reads")
	}

	/**
	 * A list stored inside the snapshot is read with no envelope key beside it.
	 *
	 * The envelope key wins because that is the one this build writes, but bytes that carry the
	 * document the way the published snapshot holds it must not cost a device its disclosure. Half of
	 * this grades the fallback; the other half is that the fallback is reachable at all, which a suite
	 * that only ever feeds the preferred shape would never notice.
	 */
	@Test
	fun `a list stored inside the snapshot is read without the envelope key`() {
		val kernel = testKernel(
			store = C15tStore(InMemoryKeyValueStore(mapOf(C15tStoreKeys.SNAPSHOT to bytesWithListInsideTheSnapshot()))),
			transport = RecordingTransport(),
		)
		kernel.bootstrap()
		assertEquals(
			177L,
			kernel.snapshot().iab?.gvl?.vendorListVersion,
			"read off the snapshot, with no envelope key to fall back on",
		)
	}

	/**
	 * An `iab` object naming an IAB field this build does not model makes the envelope unreadable.
	 *
	 * Contract rule 5, on the storage side. The alternative is a core that keeps the half of the IAB
	 * state it happens to model and answers as though nothing were missing -- an envelope carrying a
	 * `tcString` is a core that believes it wrote a TC String, and no version of that is a claim
	 * anybody can back up. Refusing the payload is the same answer a stray top-level key gets: nothing
	 * stored, and a device that behaves like a fresh install.
	 */
	@Test
	fun `an iab object carrying a field this build does not model reads as nothing stored`() {
		val tampered = bytesWithListInsideTheSnapshot(extraIabField = "tcString" to TC_STRING)

		val store = C15tStore(InMemoryKeyValueStore(mapOf(C15tStoreKeys.SNAPSHOT to tampered)))
		assertNull(store.readEnvelope(), "an unreadable iab is an unreadable envelope, not a partial one")

		val kernel = testKernel(store = store, transport = RecordingTransport())
		kernel.bootstrap()
		assertFalse(kernel.snapshot().ready, "and the device reads as a fresh install, not a decided one")
		assertNull(kernel.vendorList)
	}

	/**
	 * The body a bridge forwards is the served document, key for key.
	 *
	 * A renamed key is the failure mode this whole file exists to avoid: it compiles, it passes type
	 * checking, and the JavaScript reader gets `undefined`. So the claim is the exact key set, plus
	 * that a numbered record went back as an object keyed by id rather than as an array, plus that
	 * the two keys this document left out stayed out -- `encodeDefaults` turning an absent optional
	 * into `"dataCategories": {}` would be an invention all the way to a rendered dialog.
	 */
	@Test
	fun `the body a bridge forwards is the served document`() {
		val kernel = testKernel(
			store = C15tStore(InMemoryKeyValueStore()),
			transport = RecordingTransport().respondInit(initWithGvl(GVL)),
		)
		kernel.bootstrap()

		val body = assertNotNull(kernel.vendorListBody())
		val document = json.parseToJsonElement(body).jsonObject
		assertEquals(SERVED_KEYS.toSet(), document.keys.toSet(), "the web's names or nothing")
		assertEquals(
			listOf("8", "755"),
			document["vendors"]!!.jsonObject.keys.toList(),
			"vendors stay an object keyed by id, in the order the document arrived",
		)
		assertEquals(
			GlobalVendorListJson.toJsonElement(requireNotNull(kernel.vendorList)),
			document,
			"the body and the model a host can hold are one document and cannot drift apart",
		)

		assertEquals(
			2,
			document["purposes"]!!.jsonObject.keys.size,
			"the purposes a disclosure is drawn from are there under their own key",
		)
	}

	/**
	 * With no list served, there is no body: not an empty object, not `{}`, and no `iab` object
	 * holding an empty list.
	 *
	 * An absent body is what a JavaScript layer that never saw a `gvl` already handles, and a bridge
	 * that sent `{"vendors":{}}` would be a dialog rendering an empty disclosure out of a device that
	 * was never given one. A null on the snapshot key is the same answer in the other notation, and it
	 * has to be written rather than missing, so a reader that predates TCF never branches on a version.
	 */
	@Test
	fun `a device that was never served a list has no body to send`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = RecordingTransport())
		kernel.bootstrap()

		assertNull(kernel.vendorList)
		assertNull(kernel.vendorListBody())
		assertNull(kernel.vendorListJson())
		assertEquals(
			JsonNull,
			SnapshotWire.toJsonElement(kernel.snapshot()).getValue("iab"),
			"no list is a null on the key the bridge reads, never an invented empty object",
		)
	}

	/**
	 * A refresh that carried no `gvl` leaves the held list alone, in memory and on disk.
	 *
	 * This is requirement 3 stated as an executable: the second `/init` is a total success -- policy
	 * resolved, no error, save bodies still fine -- and the only difference is the absent key. The
	 * backend writes that body whenever the matched model is not `iab`, which is most of the world.
	 */
	@Test
	fun `a refresh with no gvl keeps the list the device already holds`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondInit(initWithGvl(GVL)).respondInit(initWithGvl(null))
		val errors = mutableListOf<KernelError>()
		val kernel = testKernel(store = store, transport = transport, logger = { errors += it })

		kernel.bootstrap()
		val body = assertNotNull(kernel.vendorListBody(), "the first init served a list")
		assertEquals(177L, kernel.vendorList?.vendorListVersion)

		kernel.refresh()

		val held = assertNotNull(kernel.vendorList, "an absent `gvl` never takes a list back")
		assertEquals(177L, held.vendorListVersion)
		// Byte for byte the same body. Both halves of the claim matter: that a list is still
		// held, and that a refresh which served none rewrote any of it.
		assertEquals(body, kernel.vendorListBody())
		assertEquals(held, store.readEnvelope()?.gvl, "and the stored list has to be the held one")
		assertTrue(errors.isEmpty(), "a list-less init is not an error: ${errors.map { it.code }}")
	}

	/**
	 * A list the web would throw away is refused exactly as though it had not been sent.
	 *
	 * Refusal has to be invisible, because the alternative is that a malformed display field costs a
	 * subject the policy that resolved fine. So a kernel served a refused `gvl` has to answer like
	 * the kernel served none, second for second: same snapshot, same errors, same held list. The
	 * revision is set aside because this test grades the answer and not the counter, which the pair
	 * walks identically anyway.
	 */
	@Test
	fun `a refused gvl is answered exactly like no gvl at all`() {
		fun servedThen(gvl: String?): Pair<C15tKernel, List<KernelError>> {
			val errors = mutableListOf<KernelError>()
			val kernel = testKernel(
				store = C15tStore(InMemoryKeyValueStore()),
				transport = RecordingTransport().respondInit(initWithGvl(GVL)).respondInit(initWithGvl(gvl)),
				logger = { errors += it },
			)
			kernel.bootstrap()
			kernel.refresh()
			return kernel to errors
		}

		val bad = GVL.replace("\"tcfPolicyVersion\":5", "\"tcfPolicyVersion\":0")
		val (refused, refusedErrors) = servedThen(bad)
		val (absent, absentErrors) = servedThen(null)

		assertNotNull(refused.vendorList, "the refusal keeps the list already held, it does not clear it")
		assertEquals(absent.vendorList, refused.vendorList)
		assertEquals(absentErrors.map { it.code }, refusedErrors.map { it.code })
		assertEquals(
			absent.snapshot().copy(revision = 0),
			refused.snapshot().copy(revision = 0),
			"a refused list must not reach the answer the subject gets",
		)
	}

	/**
	 * A resolution this core cannot represent still fails closed, list or no list.
	 *
	 * `iab` is not in Kotlin's [com.c15t.core.model.ConsentModel], so an `iab` policy is an unreadable
	 * resolution here, which makes it the exact case contract rule 5 is about: pending, deny all, and
	 * never an invented permission. Reading `gvl` off the same body may not soften that, and it may
	 * not make the two devices differ. The list itself stays held -- it is disclosure and encoding
	 * data rather than a permission, and the rule 5 argument is about the rule.
	 */
	@Test
	fun `an unreadable policy resolution fails closed the same way with a list on the body`() {
		fun run(gvl: String?): Pair<C15tKernel, List<KernelError>> {
			val errors = mutableListOf<KernelError>()
			val kernel = testKernel(
				store = C15tStore(InMemoryKeyValueStore()),
				transport = RecordingTransport().respondInit(initSuccess(body = initBody(model = "\"iab\"", gvl = gvl))),
				logger = { errors += it },
			)
			kernel.bootstrap()
			return kernel to errors
		}

		val (withList, withListErrors) = run(GVL)
		val (withoutList, withoutListErrors) = run(null)

		val snapshot = withList.snapshot()
		assertTrue(snapshot.policyPending, "an `iab` rule is still unreadable here")
		assertFalse(snapshot.ready)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse(withList.isAllowed(category), "$category stays denied under a rule this core cannot read")
		}
		// The two devices differ in exactly one field, and it is the disclosure half: same pending
		// flag, same deny-all, same prompt, same errors. A rule this core cannot read decides nothing
		// more than it would have with no list riding along.
		assertEquals(
			withoutList.snapshot().copy(revision = 0, iab = null),
			snapshot.copy(revision = 0, iab = null),
			"a served list may change what the device can name, and nothing the subject is allowed to do",
		)
		assertNotNull(snapshot.iab?.gvl, "and it is held on the snapshot, not only behind an accessor")
		assertEquals(withoutListErrors.map { it.code }, withListErrors.map { it.code })
		assertNotNull(withList.vendorList, "the list is not a permission, so rule 5 does not take it back")
	}

	/**
	 * The list comes back on the next launch, and that launch asking for a new one does not take
	 * it back.
	 *
	 * Two things at once, which is how a cold start actually reads: the envelope hands the list over,
	 * and then the network answer never comes. A core that re-derived the disclosure per session
	 * would render a blank pane here, on a device whose subject had already been shown the names.
	 */
	@Test
	fun `the list comes back on the next launch through a failed init`() {
		val backend = InMemoryKeyValueStore()
		val warm = testKernel(store = C15tStore(backend), transport = RecordingTransport().respondInit(initWithGvl(GVL)))
		warm.bootstrap()
		val body = assertNotNull(warm.vendorListBody())

		val coldBackend = RecordingTransport()
		val cold = testKernel(store = C15tStore(backend), transport = coldBackend)
		cold.bootstrap()

		assertEquals(177L, cold.vendorList?.vendorListVersion, "hydrated off the envelope")
		assertEquals(body, cold.vendorListBody())
		// The double scripted no answer, so this launch asked and failed; the failure is the
		// transport default, and the grade is that asking and getting nothing left the held list
		// where it was.
		assertEquals(1, coldBackend.initRequests.size, "this launch ran its own /init, and served no list")
	}

	/**
	 * A wipe takes the list with the policy, because a wiped device is showing nobody a disclosure.
	 *
	 * This is the one place the latch releases, and it releases for the matched policy's own reason
	 * rather than a new one: [com.c15t.core.C15tKernel.reset] deletes the rule the receipts were
	 * judged against, so the claim the latch protects has been withdrawn with it -- and a list left
	 * in memory would be written straight back into the fresh envelope the next save builds.
	 */
	@Test
	fun `a wipe takes the list with the policy it was stored beside`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val transport = RecordingTransport().respondInit(initWithGvl(GVL)).respondInit(initWithGvl(null))
		val kernel = testKernel(store = store, transport = transport)
		kernel.bootstrap()
		assertEquals(177L, kernel.vendorList?.vendorListVersion)

		kernel.reset()

		assertNull(kernel.vendorList, "gone with the evaluation policy")
		// The envelope the wipe leaves behind is the one the /init after it wrote, and it carries no
		// list -- so the release is stored and not just a lost variable someone would find in a
		// memory dump and call a bug.
		assertNull(store.readEnvelope()?.gvl, "gone from storage, not only from memory")
	}

	/**
	 * The bytes this core writes for a device holding a list, with the document moved out of the
	 * envelope key and into the snapshot's `iab` object -- the shape a build that stored it that way
	 * would leave behind.
	 *
	 * Built by patching a real write rather than typed out, because every other field in these bytes
	 * has to stay something the strict codec accepts.
	 */
	private fun bytesWithListInsideTheSnapshot(extraIabField: Pair<String, String>? = null): String {
		val backend = InMemoryKeyValueStore()
		testKernel(
			store = C15tStore(backend),
			transport = RecordingTransport().respondInit(initWithGvl(GVL)),
		).bootstrap()

		val stored = json.parseToJsonElement(assertNotNull(backend.read(C15tStoreKeys.SNAPSHOT))).jsonObject
		val gvl = stored["gvl"]?.takeUnless { it is JsonNull }
			?: throw AssertionError("the write these bytes start from carried no list")
		return JsonObject(
			stored.toMutableMap().apply {
				put("gvl", JsonNull)
				put(
					"snapshot",
					buildJsonObject {
						stored["snapshot"]!!.jsonObject.forEach { (key, value) ->
							if (key != "iab") {
								put(key, value)
							} else {
								put("iab", buildJsonObject {
									put("gvl", gvl)
									// The one way a caller gets an IAB field this build has no model for in
									// there: assembled, never pasted, so the rest of the bytes stay readable.
									extraIabField?.let { (name, value) -> put(name, value) }
								})
							}
						}
					},
				)
			},
		).toString()
	}

	private companion object {
		/** A TC String this build has no field for. That is the point: it must not be half-believed. */
		const val TC_STRING = "BOpmE9vOpmE9vA-ACAENACC"

		/** An `/init` body with [gvl] embedded, or without the key when it is null. */
		fun initWithGvl(gvl: String?): TransportOutcome = initSuccess(body = initBody(gvl = gvl))

		/**
		 * The keys this document goes back out with: the four the acceptance rules ask for, the two
		 * optional roots it carries, and the two it does not carry, which is the point -- an absent
		 * `v.optional(...)` has to stay absent instead of arriving as `{}`.
		 */
		val SERVED_KEYS = listOf(
			"features",
			"gvlSpecificationVersion",
			"lastUpdated",
			"purposes",
			"specialPurposes",
			"stacks",
			"tcfPolicyVersion",
			"vendorListVersion",
			"vendors",
		)

		/**
		 * A `/init`-shaped vendor list with two vendors and the shape a real document has: numbered
		 * records as objects keyed by id, sparse stack ids, a purpose with legal text, a vendor with
		 * retention and an overflow limit, and no `dataCategories` or `specialFeatures` at all.
		 *
		 * Written here rather than reused from the encoder fixtures because this file is about the
		 * device holding a list, not about what the encoder does with one. `vendorListVersion` 177 and
		 * `tcfPolicyVersion` 5 are what the version assertions above read back.
		 */
		const val GVL = """
{"features":{"2":{"description":"No cross-site browsing","id":2,"illustrations":[],"name":"Use data to identify devices"}},
"gvlSpecificationVersion":3,
"lastUpdated":"2025-02-14T00:00:00Z",
"purposes":{"1":{"description":"Storage","id":1,"illustrations":[],"name":"Store and/or access information on a device"},
"2":{"description":"Ads","descriptionLegal":"Legal text for purpose two.","id":2,"illustrations":["one"],"name":"Personalised advertising"}},
"specialPurposes":{"1":{"description":"Security","id":1,"illustrations":[],"name":"Ensure security"}},
"stacks":{"1":{"description":"Basic","id":1,"name":"Stack","purposes":[1,2],"specialFeatures":[]},
"7":{"description":"Ads and content","id":7,"name":"Personalised advertising","purposes":[2,7],"specialFeatures":[]}},
"tcfPolicyVersion":5,
"vendorListVersion":177,
"vendors":{"8":{"cookieMaxAgeSeconds":31536000,"cookieRefresh":false,"features":[],"flexiblePurposes":[],"id":8,
"legIntPurposes":[],"name":"Vendor Eight","purposes":[2],"specialFeatures":[],"specialPurposes":[],
"urls":[{"langId":"EN","privacy":"https://example.test/privacy"}],"usesCookies":true,"usesNonCookieAccess":false},
"755":{"cookieRefresh":true,"dataCategories":[1],"dataRetention":{"purposes":{"1":341,"2":170},"stdRetention":341},
"deviceStorageDisclosureUrl":"https://example.test/dsd","features":[2],"flexiblePurposes":[2],"id":755,
"legIntPurposes":[2,7],"name":"Vendor Seven Fifty-Five","overflow":{"httpGetLimit":128},"purposes":[1,2,7,9],
"specialFeatures":[],"specialPurposes":[1],"urls":[{"langId":"EN","legIntClaim":"https://example.test/li"}],
"usesCookies":true,"usesNonCookieAccess":true}}}
"""
	}
}

