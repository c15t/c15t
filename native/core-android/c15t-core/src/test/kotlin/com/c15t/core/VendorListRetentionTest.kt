package com.c15t.core

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelError
import com.c15t.core.store.C15tStore
import com.c15t.core.tc.GlobalVendorListJson
import com.c15t.core.transport.TransportOutcome
import com.c15t.core.wire.SnapshotWire
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.jsonObject
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
 */
class VendorListRetentionTest {
	private val json = Json { ignoreUnknownKeys = true }

	/**
	 * A list on the body is exposed, stored, and changes nothing about the reserved snapshot slot.
	 *
	 * The stored half is the load-bearing half: [com.c15t.core.C15tKernel.vendorList] is one read of
	 * memory on a path an ad SDK calls from `Application.onCreate`, so the envelope is what proves
	 * the list will still be there tomorrow, and `gvl` rides it exactly as [com.c15t.core.policy.EvaluationPolicy]
	 * does -- same slot, same codec, same expiry, no new retention rule invented for a vendor list.
	 */
	@Test
	fun `a served list is exposed and stored beside the policy`() {
		val store = C15tStore(InMemoryKeyValueStore())
		val kernel = testKernel(store = store, transport = RecordingTransport().respondInit(initWithGvl(GVL)))
		kernel.bootstrap()

		val held = assertNotNull(kernel.vendorList, "a body that carried a list has to leave one held")
		assertEquals(177L, held.vendorListVersion)
		assertEquals(5L, held.tcfPolicyVersion)
		assertNotNull(held.vendor(755), "a vendor is keyed by its id")
		assertNull(held.vendor(404), "this list carries no such vendor")

		val envelope = assertNotNull(store.readEnvelope(), "an init that resolved has to be stored")
		assertEquals(held, envelope.gvl, "the list has to outlive this process")
		assertNotNull(envelope.evaluationPolicy, "the policy it arrived with is stored the same way")

		// The reserved slot stays reserved. `native/CONTRACT.md` asks for a serialised `null` there
		// and `packages/react-native/src/protocol/snapshot.ts` pins the type to `null` this phase, so
		// a body on that key would be a wire shape the JavaScript side never agreed to read. The list
		// reaches a bridge through the two accessors above instead.
		assertEquals(
			JsonNull,
			SnapshotWire.toJsonElement(kernel.snapshot())["iab"],
			"the `iab` slot keeps its reserved null while the list comes from [vendorList]",
		)
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
	 * With no list served, there is no body: not an empty object, not `{}`.
	 *
	 * An absent body is what a JavaScript layer that never saw a `gvl` already handles, and a bridge
	 * that sent `{"vendors":{}}` would be a dialog rendering an empty disclosure out of a device that
	 * was never given one.
	 */
	@Test
	fun `a device that was never served a list has no body to send`() {
		val kernel = testKernel(store = C15tStore(InMemoryKeyValueStore()), transport = RecordingTransport())
		kernel.bootstrap()

		assertNull(kernel.vendorList)
		assertNull(kernel.vendorListBody())
		assertNull(kernel.vendorListJson())
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
		assertEquals(withoutList.snapshot().copy(revision = 0), snapshot.copy(revision = 0))
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

	private companion object {
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

