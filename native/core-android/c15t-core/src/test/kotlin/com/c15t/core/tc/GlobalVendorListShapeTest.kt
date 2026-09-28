package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * The shape a bridge hands JavaScript, and the acceptance rules that decide whether a device holds a
 * list at all.
 *
 * The shape requirement is stated plainly in the task and by `native/CONTRACT.md`: a JSON string that
 * renamed a key fails no compile and no type check, and the JavaScript side reads `undefined` in
 * silence -- the contract wrote that rule after one core carried four renamed keys behind fixture
 * tolerations. So the strongest check available runs here: [served body round trips key for key]
 * compares every path and value of a document in `globalVendorListSchema`'s own names against the body
 * this build hands back, one document with an awkward part in every corner of the schema.
 *
 * The refusals are `fetch-gvl.ts`'s, graded one condition at a time, and each one has to look exactly
 * like the ordinary no-IAB case rather than like a failure -- rule 5 discards an unusable list, and the
 * kernel's own tests grade what that does to a device.
 */
class GlobalVendorListShapeTest {
	private val json = Json { ignoreUnknownKeys = true }

	/**
	 * The document a web `/init` would carry, written as one string in `globalVendorListSchema`'s names,
	 * with the awkward parts included on purpose: `gvlSpecificationVersion`, `lastUpdated`, a
	 * `descriptionLegal` on one purpose, a `cookieMaxAgeSeconds` that is explicitly `null`, a vendor with
	 * no `deletedDate` at all, `dataRetention` and `overflow` and `urls` inside a vendor, and a `stacks`
	 * record whose ids skip. Round-tripping that names what the model writes, so a rename, a compacted
	 * spelling, a numbered record flattened into an array, or an optional key materialised as `[]` or 0
	 * fails here.
	 */
	private val served: JsonObject = json.parseToJsonElement(SHAPE_BEARER).jsonObject

	@Test
	fun `served body round trips key for key`() {
		val list = GlobalVendorListJson.read(served)
		assertNotNull(list, "a well-formed document has to be accepted")
		val returned = GlobalVendorListJson.toJsonElement(list)

		// Paths *and* values. Names alone would pass while an id came back as a string, an absent
		// `cookieMaxAgeSeconds` came back as null next to a vendor that never had the key, or an
		// illustrations list came back as one flat array of paths.
		assertEquals(
			servedNullsDropped(paths(served)),
			paths(returned),
			"the served document and the body handed back are not the same document",
		)
	}

	/**
	 * The one thing a typed nullable cannot carry: a key the document wrote as an explicit `null`.
	 * 
	 * Both sides read that key as absent -- `v.optional(...)` in `globalVendorListSchema`, and a
	 * default after it in every reader -- so one value standing for both is the shape rather than
	 * a lossy reading of it. What must not follow is the collapse spreading, so a vendor that
	 * claims `341` behind the same key is graded in the same breath.
	 */
	@Test
	fun `a served null drops only its own key`() {
		val held = requireNotNull(GlobalVendorListJson.read(served))
		val asAbsence = paths(GlobalVendorListJson.toJsonElement(held))
		assertEquals(emptyList(), asAbsence.filter { it.startsWith(".vendors.755.cookieMaxAgeSeconds") })

		val claimed = served.toString().replace("\"cookieMaxAgeSeconds\":null", "\"cookieMaxAgeSeconds\":341")
		val reread = requireNotNull(GlobalVendorListJson.read(json.parseToJsonElement(claimed).jsonObject))
		val back = paths(GlobalVendorListJson.toJsonElement(reread))
		assertEquals(
			listOf(".vendors.755.cookieMaxAgeSeconds=341"),
			back.filter { it.startsWith(".vendors.755.cookieMaxAgeSeconds") },
			"a vendor that did claim a cookie lifetime has to keep that claim",
		)
	}

	@Test
	fun `the body keeps the web name for every numbered record`() {
		val list = requireNotNull(GlobalVendorListJson.read(served))
		val returned = GlobalVendorListJson.toJsonElement(list)
		NUMBERED_ROOT_KEYS.forEach { key ->
			assertTrue(returned[key] is JsonObject || key !in served, "$key has to go back as an object of records")
		}
		assertEquals(
			setOf("1", "2", "3", "7", "43", "44"),
			returned["stacks"]!!.jsonObject.keys,
			"stacks skip ids on purpose, and a reader that turned one into an array would rename every " +
				"entry after the first gap",
		)
		assertEquals(
			listOf("1", "2", "3", "7", "43", "44"),
			returned["stacks"]!!.jsonObject.keys.toList(),
			"`Object.entries` walks a numbered object in ascending order, so a disclosure drawn from this " +
				"one has to arrive in the same order",
		)
	}

	@Test
	fun `a missing gvl reads as no list`() {
		assertNull(GlobalVendorListJson.fromInitBody(buildJsonObject { put("policySnapshotToken", "t") }))
		assertNull(GlobalVendorListJson.fromInitBody(null))
		assertNull(GlobalVendorListJson.fromInitBody(buildJsonObject { put("gvl", JsonNull) }))
		assertNull(GlobalVendorListJson.read(null))
		assertNull(GlobalVendorListJson.read(JsonPrimitive("gvl")), "a string is not a document")
	}

	/**
	 * The conditions `fetchGVL` refuses on, one assertion each, plus the tolerance that keeps this
	 * a refusal list rather than a wish list.
	 * 
	 * A document carrying only the four required keys has to be accepted, or a subject loses a
	 * dialog over data none of those readers ask for. The tolerance stops there: a display record
	 * of the wrong shape costs the whole list, which is where this core is stricter than the web.
	 * That difference is graded two tests below instead of being left out of this list.
	 */
	@Test
	fun `a list the web would throw away is refused`() {
		fun without(key: String) = served.excluding(key)
		fun rewritten(key: String, value: JsonElement) = served.with(key, value)

		assertNull(GlobalVendorListJson.read(without("vendorListVersion")), "vendorListVersion is required")
		assertNull(GlobalVendorListJson.read(rewritten("vendorListVersion", JsonPrimitive(0))), "truthiness, not presence")
		assertNull(GlobalVendorListJson.read(without("purposes")), "purposes is required")
		assertNull(GlobalVendorListJson.read(without("vendors")), "vendors is required")
		assertNull(GlobalVendorListJson.read(without("tcfPolicyVersion")), "a string cannot be graded against")
		assertNull(GlobalVendorListJson.read(rewritten("tcfPolicyVersion", JsonPrimitive(0))), "revision 1 is the floor")
		assertNull(GlobalVendorListJson.read(rewritten("tcfPolicyVersion", JsonPrimitive(-1))), "no revision is negative")
		assertNull(
			GlobalVendorListJson.read(rewritten("tcfPolicyVersion", JsonPrimitive("5"))),
			"Number.isSafeInteger refuses a quoted number, so the web throws the document away",
		)
		assertNull(
			GlobalVendorListJson.read(rewritten("tcfPolicyVersion", JsonPrimitive(5.5))),
			"a fraction of a policy revision is not a revision",
		)
		assertNull(
			GlobalVendorListJson.read(rewritten("tcfPolicyVersion", JsonPrimitive(9_007_199_254_740_992L))),
			"past 2^53 a JavaScript number is no longer an integer, whatever a Long could hold",
		)

		val spare = buildJsonObject {
			put("vendorListVersion", JsonPrimitive(177))
			put("tcfPolicyVersion", JsonPrimitive(5))
			put("purposes", JsonObject(emptyMap()))
			put("vendors", JsonObject(emptyMap()))
		}
		assertNotNull(GlobalVendorListJson.read(spare), "the acceptance rules are exactly those conditions")
	}

	/**
	 * A record this build cannot name costs the list, and that is a tightening rather than parity.
	 * 
	 * `fetchGVL` stops at its four keys and lets `dialog-data.ts` render whatever of the rest
	 * survives; here a `stacks` that arrived as a string takes the purposes and the vendors down
	 * with it, because a Kotlin decode is all-or-nothing and the alternative is a vendor list this
	 * build read only part of, which `TcSemanticPreEncoder` would then prune against -- emptying
	 * an honest vendor's signals over a lost label. [GlobalVendorListJson] carries the argument.
	 * 
	 * Not reachable from a c15t backend: `packages/backend/src/http/gvl.ts` parses the upstream
	 * document against `globalVendorListSchema` before `/init` embeds it. Graded because it decides
	 * what a device ends up holding, not because a backend can serve it.
	 */
	@Test
	fun `a record of the wrong shape refuses the whole list, which is a tightening and not web parity`() {
		val purposesAsArray = served.with("purposes", JsonArray(emptyList()))
		assertNull(GlobalVendorListJson.read(purposesAsArray), "purposes is keyed by number, not a list")
		assertNull(
			GlobalVendorListJson.read(served.with("stacks", JsonPrimitive("nonsense"))),
			"the web keeps this document and renders the half it can reach; this core serves neither half",
		)

		val nameAsNumber = served.toString().replace("\"name\":\"Vendor Eight\"", "\"name\":42")
		assertNull(
			GlobalVendorListJson.read(json.parseToJsonElement(nameAsNumber).jsonObject),
			"a vendor whose name is a number cannot be kept while the rest of the list is trusted: the " +
				"encoder would write signals against a list it only half-read",
		)
	}

	/**
	 * A vendor's id is its key, which is what both web readers hold.
	 *
	 * `GVL` overwrites `vendor.id` with the parsed key while it converts the record, and
	 * `mapGvlVendor` in `dialog-data.ts` writes `id: Number(vendorId)` for the dialog's copy. The body
	 * keeps the entry's own field, because it is the served document; what must not happen is the
	 * *encoder* being told about the entry's id, which would advertise 755 and write a signal for 404.
	 */
	@Test
	fun `a vendor's encoder identity comes from its key`() {
		val vendors = served["vendors"]!!.jsonObject
		val entry = vendors["755"]!!.jsonObject.with("id", JsonPrimitive(404))
		val disagreeing = served.with("vendors", vendors.with("755", entry))
		val list = requireNotNull(GlobalVendorListJson.read(disagreeing))
		val vendorList = list.toTcVendorList()

		assertNotNull(vendorList.vendor(755), "the key names the vendor the encoder is told about")
		assertNull(vendorList.vendor(404), "an entry cannot rename itself into somebody else's signal")
		assertTrue(
			vendorList.vendors.any { vendor -> vendor.id == 755 && vendor.purposes == listOf(1, 2, 7, 9) },
			"the declarations travel with the key, not with the id the entry claimed",
		)
	}

	private companion object {
		/** The same object with [key] removed, so a refusal test changes one key and nothing else. */
		fun JsonObject.excluding(key: String): JsonObject = buildJsonObject {
			this@excluding.forEach { (name, value) ->
				if (name != key) {
					put(name, value)
				}
			}
		}

		/** The same object with [key] set to [value], replacing it when it was already there. */
		fun JsonObject.with(key: String, value: JsonElement): JsonObject = buildJsonObject {
			this@with.forEach { (name, existing) ->
				if (name != key) {
					put(name, existing)
				}
			}
			put(key, value)
		}

		/**
		 * The served paths that come back absent rather than `null`, which is everything a typed
		 * nullable can do with an explicit null. Graded by `a served null drops only its own key`.
		 */
		private fun servedNullsDropped(lines: List<String>): List<String> = lines.filterNot { it.endsWith("=null") }

		/** The root keys whose values are records keyed by a number written as a string. */
		private val NUMBERED_ROOT_KEYS = listOf("purposes", "specialPurposes", "features", "specialFeatures", "stacks", "vendors")

		/** One document, every corner of `globalVendorListSchema`, in the web's names. */
		private const val SHAPE_BEARER = """
			{
				"dataCategories": {"1":{"id":1,"name":"IP addresses","description":"Collected from your device"}},
				"features": {"2":{"id":2,"name":"Use data to identify devices","description":"No cross-site","illustrations":[]}},
				"gvlSpecificationVersion": 3,
				"lastUpdated": "2025-02-14T00:00:00Z",
				"purposes": {
					"1":{"id":1,"name":"Store and/or access information on a device","description":"Storage","illustrations":[]},
					"2":{"id":2,"name":"Personalised advertising","description":"Ads","descriptionLegal":"Legal text","illustrations":["one"]}
				},
				"specialFeatures": {"1":{"id":1,"name":"Use precise geolocation data","description":"Precise","illustrations":[]}},
				"specialPurposes": {"1":{"id":1,"name":"Ensure security","description":"Security","illustrations":[]}},
				"stacks": {
					"1":{"id":1,"name":"Stack","description":"Basic","purposes":[1,2],"specialFeatures":[]},
					"2":{"id":2,"name":"Cookieless","description":"No storage","purposes":[1],"specialFeatures":[]},
					"3":{"id":3,"name":"Cookieless and device","description":"Mostly none","purposes":[1,2],"specialFeatures":[1]},
					"7":{"id":7,"name":"Personalised advertising","description":"Ads and content","purposes":[2,7],"specialFeatures":[]},
					"43":{"id":43,"name":"Late stack","description":"Far along","purposes":[7],"specialFeatures":[]},
					"44":{"id":44,"name":"Later stack","description":"Further","purposes":[9],"specialFeatures":[]}
				},
				"tcfPolicyVersion": 5,
				"vendorListVersion": 177,
				"vendors": {
					"8":{"id":8,"name":"Vendor Eight","purposes":[2],"legIntPurposes":[2],"flexiblePurposes":[],"specialPurposes":[],"features":[],"specialFeatures":[],"usesCookies":true,"usesNonCookieAccess":false,"cookieMaxAgeSeconds":31536000,"cookieRefresh":false,"urls":[{"langId":"EN","privacy":"https://example.test/privacy"}]},
					"755":{"id":755,"name":"Vendor Seven Fifty-Five","purposes":[1,2,7,9],"legIntPurposes":[2,7],"flexiblePurposes":[2],"specialPurposes":[1],"features":[2],"specialFeatures":[],"dataCategories":[1],"dataRetention":{"purposes":{"1":341,"2":170},"stdRetention":341},"deletedDate":"2025-03-01T00:00:00Z","deviceStorageDisclosureUrl":"https://example.test/dsd","cookieMaxAgeSeconds":null,"cookieRefresh":true,"usesCookies":true,"usesNonCookieAccess":true,"urls":[{"langId":"EN","legIntClaim":"https://example.test/li","privacy":"https://example.test/privacy"}],"overflow":{"httpGetLimit":128}}
				}
			}
		"""

		/**
		 * A document as sorted `path=value` lines, so a mismatch names the path that drifted instead of
		 * reprinting two documents and leaving the diff to somebody's eyes.
		 */
		private fun paths(root: JsonObject): List<String> = flatten(root, "").sorted()

		private fun flatten(element: JsonElement, path: String): List<String> = when (element) {
			is JsonObject -> element.entries.flatMap { (key, value) -> flatten(value, "$path.$key") }
			is JsonArray -> element.flatMapIndexed { index, value -> flatten(value, "$path[$index]") }
			is JsonPrimitive -> listOf("$path=${element}")
		}
	}
}
