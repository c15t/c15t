package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

/**
 * The vendor scope applied to a served list, graded against `narrowGVLToVendors` in
 * `packages/iab/src/tcf/fetch-gvl.ts` and `narrowToVendorIds` in `packages/backend/src/http/gvl.ts`.
 *
 * Both web filters are two lines of pruning and one deliberate restraint: `vendors` is pruned and
 * everything else on the document comes back as it was served. The restraint is the part a port loses,
 * because thinning the purposes nobody references looks like the same tidy gesture and quietly changes
 * what a dialog says -- `processPurposes` in `packages/iab/src/headless/dialog-data.ts` walks the
 * served `purposes` record, and it does not ask the vendor scope's permission. So it is graded by
 * equality against the unnarrowed list, and not by a count of what looks left over.
 *
 * The other half is that a scope is an allowlist of ids the served document already carries. A number
 * a publisher configured is not a company: an entry invented to answer it would reach
 * [toTcVendorList] as declarations nobody published, which is rule 5 with a friendly face. These tests
 * use ids that are not served -- `404`, a made-up `1000483`, and both ends of `Int` -- for exactly that
 * reason, and one fixture keeps a vendor whose body `id` disagrees with its key, because key authority
 * is the difference between scoping a disclosure and renaming one.
 */
class VendorListNarrowingTest {
	private val json = Json { ignoreUnknownKeys = true }

	/** A served vendor list in `globalVendorListSchema`'s names: every sibling record, plus a custom id. */
	private val served: JsonObject = json.parseToJsonElement(SERVED).jsonObject

	/** [served] as the model a kernel holds, which is what [GlobalVendorList.narrowToVendorIds] prunes. */
	private val servedList: GlobalVendorList = requireNotNull(GlobalVendorListJson.read(served))

	/**
	 * The declared scope prunes to the ids it declares, in served order, and the survivors are the
	 * entries that were served.
	 */
	@Test
	fun `a declared scope prunes exactly the ids it declares`() {
		val whole = GlobalVendorListJson.toJsonElement(servedList)["vendors"]!!.jsonObject

		// Served 42 and 755, with 42 twice: a scope is a set of names, and `Object.entries` hands the
		// web ascending served order rather than the order a host typed the allowlist in.
		val narrowed = servedList.narrowToVendorIds(listOf(755, 42, 42))

		assertEquals(listOf(42, 755), narrowed.vendors.keys.toList(), "pruned to the scope, in served order")
		assertEquals(
			whole.filterKeys { key -> key in setOf("42", "755") },
			GlobalVendorListJson.toJsonElement(narrowed)["vendors"]!!.jsonObject,
			"a surviving entry has to be the entry that was served, field for field",
		)
	}

	/**
	 * Purposes, special purposes, features, special features, stacks, data categories, both versions
	 * and `lastUpdated` survive a vendor scope untouched, gaps in the stack ids included.
	 *
	 * The comparison is against the unnarrowed list through the same codec, so the only difference
	 * these assertions can see is the one narrowing made.
	 */
	@Test
	fun `everything that is not vendors comes back verbatim`() {
		val narrowed = servedList.narrowToVendorIds(listOf(42))
		val whole = GlobalVendorListJson.toJsonElement(servedList)
		val back = GlobalVendorListJson.toJsonElement(narrowed)

		SIBLING_KEYS.forEach { key ->
			assertEquals(whole[key], back[key], "$key describes the framework, not the audience")
		}
		assertEquals(
			listOf("1", "7", "44"),
			back["stacks"]!!.jsonObject.keys.toList(),
			"stacks skip ids on purpose and a scope is not a reason to close the gaps",
		)
		assertEquals(177L, narrowed.vendorListVersion, "a TC String still has to say what it encoded against")
		assertEquals(5L, narrowed.tcfPolicyVersion, "and which policy revision grades those bits")
		assertEquals(3L, requireNotNull(narrowed.gvlSpecificationVersion))
		assertEquals("2026-02-14T00:00:00Z", requireNotNull(narrowed.lastUpdated))
	}

	/**
	 * No scope is no filter, which is the web's reading and not a local preference:
	 * `narrowGVLToVendors` hands the list back for an empty array, and `gvlRequestUrl` does not append
	 * the parameter for one at all, so the document on the wire is the whole one.
	 */
	@Test
	fun `no scope is no filter`() {
		assertSame(servedList, servedList.narrowToVendorIds(null), "a body that carries no scope is the served list")
		assertSame(
			servedList,
			servedList.narrowToVendorIds(emptyList()),
			"an empty scope asks for every vendor here, so a host that means nobody has to say so elsewhere",
		)
	}

	/** An id the served document does not carry is not a vendor, and an empty result keeps the versions. */
	@Test
	fun `an id the list does not carry is not added`() {
		val scoped = servedList.narrowToVendorIds(listOf(42, 404))
		assertEquals(listOf(42), scoped.vendors.keys.toList(), "404 is not served, so there is nothing to disclose")
		assertNull(scoped.vendor(404), "and no entry is written to satisfy the scope")

		val nobody = servedList.narrowToVendorIds(listOf(404))
		assertTrue(nobody.vendors.isEmpty(), "a scope naming no served vendor empties the record, as the web's does")
		assertEquals(177L, nobody.vendorListVersion, "the versions travel with an empty record rather than going with it")
	}

	/**
	 * A custom vendor id is served data like any other and survives when it is declared; a made-up or
	 * out-of-range one creates nothing, in either form of the prune.
	 *
	 * `1000482` is the shape c15t's own custom vendors take -- a number the IAB list never issued, which
	 * a port that scoped by `GVL.vendorIds` (the IAB's own id list, which does not know them) would
	 * drop. The ends of `Int` are here because a wrapped id is a real vendor's disclosure.
	 */
	@Test
	fun `custom and out-of-range ids never create an entry`() {
		val scope = listOf(Int.MIN_VALUE, -1, 0, 1000482, 1000483, 999999, Int.MAX_VALUE)

		assertEquals(listOf(1000482), servedList.narrowToVendorIds(scope).vendors.keys.toList())
		val pruned = requireNotNull(narrowVendorListElement(served, scope)) as JsonObject
		assertEquals(listOf("1000482"), pruned["vendors"]!!.jsonObject.keys.toList())

		val customOnly = servedList.narrowToVendorIds(listOf(1000482))
		assertEquals(listOf(1000482), customOnly.vendors.keys.toList(), "a custom id is served data and stays served")
	}

	/**
	 * Vendor entries are selected by the key they live under, never by the `id` inside the entry body.
	 *
	 * The fixture for this one is `served` with vendor 755 taken out and vendor 42's body told to say
	 * 755, so the only thing in the document that reads as 755 is a claim from inside an entry. The web
	 * compares the scope against `Object.entries` keys twice over, and [toTcVendorList]'s id comes from
	 * the key for the same reason `GVL` overwrites `vendor.id` with the parsed key.
	 */
	@Test
	fun `the key decides which vendor a scope reaches`() {
		val vendors = served["vendors"]!!.jsonObject
		val lying = vendors.without("755").with("42", vendors["42"]!!.jsonObject.with("id", JsonPrimitive(755)))
		val list = requireNotNull(GlobalVendorListJson.read(served.with("vendors", lying)))

		val byBody = list.narrowToVendorIds(listOf(755))
		assertTrue(byBody.vendors.isEmpty(), "an entry cannot use a scope as the occasion to become vendor 755")

		val byKey = list.narrowToVendorIds(listOf(42))
		assertEquals(listOf(42), byKey.vendors.keys.toList(), "key 42 is vendor 42 whoever its body claims to be")
		assertEquals(
			755L,
			requireNotNull(byKey.vendor(42)).id,
			"the served body is still served: the key rules the scope, not the document",
		)
	}

	/**
	 * [narrowVendorListElement] pruning a raw document: the `vendors` record goes, everything else comes
	 * back as the same element it went in as, and the input is not edited.
	 */
	@Test
	fun `the element form prunes vendors and keeps every sibling`() {
		val pruned = requireNotNull(narrowVendorListElement(served, listOf(8, 755, 1000482))) as JsonObject

		assertEquals(served.keys.toList(), pruned.keys.toList(), "every sibling key survives, in served order")
		SIBLING_KEYS.forEach { key -> assertSame(served[key], pruned[key], "$key is handed back untouched") }

		val servedVendors = served["vendors"]!!.jsonObject
		val vendors = pruned["vendors"]!!.jsonObject
		assertEquals(listOf("8", "755", "1000482"), vendors.keys.toList(), "the scope selects, the document orders")
		vendors.forEach { (key, value) ->
			assertSame(servedVendors[key], value, "a surviving record is shared and not rewritten")
		}
		assertEquals(4, servedVendors.size, "narrowing builds a new record instead of editing the served one")
	}

	/**
	 * What [narrowVendorListElement] refuses to touch comes back as the same instance, and a scope that
	 * names no served vendor still prunes to an empty `vendors` rather than skipping.
	 *
	 * The unreadable shapes are the ones a caller can actually have: a `gvl` key that is absent, one
	 * that came back `null`, one that is a string, and one whose numbered record arrived as an array
	 * instead of an object. [GlobalVendorListJson.read] decides whether a device holds a list; this
	 * function only declines to invent a place to prune.
	 */
	@Test
	fun `the element form returns what it cannot narrow`() {
		assertSame(served, narrowVendorListElement(served, null), "no scope is no filter")
		assertSame(served, narrowVendorListElement(served, emptyList()), "an empty scope is no filter either")
		assertNull(narrowVendorListElement(null, listOf(42)), "an absent document is not a document")

		NOT_DOCUMENTS.forEach { element ->
			assertSame(element, narrowVendorListElement(element, listOf(42)), "$element cannot be narrowed")
		}

		val blank = requireNotNull(narrowVendorListElement(served, listOf(404))) as JsonObject
		assertEquals(JsonObject(emptyMap()), blank["vendors"], "a scope that reaches nobody empties the record")
		SIBLING_KEYS.forEach { key -> assertSame(served[key], blank[key], "and nothing else goes with it") }
	}

	private companion object {
		/** The same object with [key] removed, so a test changes one thing and nothing else. */
		fun JsonObject.without(key: String): JsonObject = buildJsonObject {
			this@without.forEach { (name, value) ->
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

		/** The records a vendor scope has no claim on, which is every numbered key bar `vendors`. */
		val SIBLING_KEYS = listOf(
			"purposes",
			"specialPurposes",
			"features",
			"specialFeatures",
			"stacks",
			"dataCategories",
		)

		/** Shapes that are not a vendor-list document, including a `vendors` that is not a record. */
		val NOT_DOCUMENTS: List<JsonElement> = listOf(
			JsonNull,
			JsonPrimitive("gvl"),
			JsonArray(emptyList()),
			buildJsonObject {
				put("vendorListVersion", JsonPrimitive(177))
				put("purposes", JsonObject(emptyMap()))
			},
			buildJsonObject {
				put("vendorListVersion", JsonPrimitive(177))
				put("vendors", JsonArray(listOf(JsonPrimitive(42))))
			},
		)

		/**
		 * A served document in the web's names: the four required keys, one entry for each of the
		 * sibling records, a `stacks` record that skips ids, and vendors `8`, `42`, `755` and a custom
		 * `1000482`. Nothing here is `globalVendorListSchema`'s awkwardness -- `GlobalVendorListShapeTest`
		 * carries that -- because these tests ask which keys survive a scope, not what a codec does with
		 * an explicit `null`.
		 */
		const val SERVED = """
			{
				"dataCategories": {"1":{"id":1,"name":"IP addresses","description":"Collected from your device"}},
				"features": {"2":{"id":2,"name":"Use data to identify devices","description":"No cross-site"}},
				"gvlSpecificationVersion": 3,
				"lastUpdated": "2026-02-14T00:00:00Z",
				"purposes": {
					"1":{"id":1,"name":"Store and/or access information on a device","description":"Storage"},
					"2":{"id":2,"name":"Personalised advertising","description":"Ads"}
				},
				"specialFeatures": {"1":{"id":1,"name":"Use precise geolocation data","description":"Precise"}},
				"specialPurposes": {"1":{"id":1,"name":"Ensure security","description":"Security"}},
				"stacks": {
					"1":{"id":1,"name":"Stack","description":"Basic","purposes":[1,2],"specialFeatures":[]},
					"7":{"id":7,"name":"Personalised advertising","description":"Ads and content","purposes":[2,7],"specialFeatures":[]},
					"44":{"id":44,"name":"Later stack","description":"Further","purposes":[9],"specialFeatures":[]}
				},
				"tcfPolicyVersion": 5,
				"vendorListVersion": 177,
				"vendors": {
					"8":{"id":8,"name":"Vendor Eight","purposes":[2],"legIntPurposes":[],"flexiblePurposes":[],"specialPurposes":[],"features":[],"specialFeatures":[],"dataCategories":[1],"usesCookies":true,"usesNonCookieAccess":false,"cookieMaxAgeSeconds":31536000,"cookieRefresh":false,"urls":[{"langId":"EN","privacy":"https://example.test/privacy"}]},
					"42":{"id":42,"name":"Vendor Forty-Two","purposes":[1],"legIntPurposes":[2],"flexiblePurposes":[1],"specialPurposes":[1],"features":[2],"specialFeatures":[],"dataCategories":[1],"usesCookies":false,"usesNonCookieAccess":false,"urls":[]},
					"755":{"id":755,"name":"Vendor Seven Fifty-Five","purposes":[1,2,7,9],"legIntPurposes":[2,7],"flexiblePurposes":[2],"specialPurposes":[1],"features":[2],"specialFeatures":[],"deletedDate":"2026-03-01T00:00:00Z","dataRetention":{"purposes":{"1":341,"2":170},"stdRetention":341},"deviceStorageDisclosureUrl":"https://example.test/dsd","cookieRefresh":true,"usesCookies":true,"usesNonCookieAccess":true,"urls":[{"langId":"EN","legIntClaim":"https://example.test/li"}],"overflow":{"httpGetLimit":128}},
					"1000482":{"id":1000482,"name":"Publisher Custom Partner","purposes":[1],"legIntPurposes":[],"flexiblePurposes":[],"specialPurposes":[],"features":[],"specialFeatures":[],"usesCookies":true,"usesNonCookieAccess":false,"cookieMaxAgeSeconds":86400,"cookieRefresh":false,"urls":[]}
				}
			}
		"""
	}
}
