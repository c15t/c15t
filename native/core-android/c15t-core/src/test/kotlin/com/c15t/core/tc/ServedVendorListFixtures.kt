package com.c15t.core.tc

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Served-GVL documents built out of the shared vectors, for the tests that encode against a list.
 *
 * [documentFor] re-expresses a fixture's `input.vendorList` in GVL wire shape so the served path can
 * be measured against bytes the web oracle actually produced; the rule helpers take one of those
 * documents and change the single fact under test. A detail comes from a web fixture only where a
 * `@source` tag says which fixture, and everything else is written by hand -- see
 * the `@source` tags on the rules in `TcServedVendorListTest`, which is where those rules are graded.
 */
internal object ServedVendorListFixtures {
	/**
	 * [manifest] as a `/init`-shaped vendor-list document.
	 *
	 * The vendor facts are the manifest's own, field for field: the four purpose lists, the withdrawal
	 * date when the vector's own vendor list carries one, and the id, which goes in as both the record
	 * key and the entry's `id` field because a GVL writes it that way and both readers have to agree
	 * about a vendor that does not.
	 *
	 * `purposes` is not in the manifest -- `TcStringFixtures` says so plainly -- so it is filled with
	 * ten entries carrying ids and placeholder names. [TcSemanticPreEncoder]'s two questions reach
	 * `vendors` and the two versions, and `TcServedVendorListTest` pins that an orphan `GVL`
	 * makes the same bytes here as its hand-in twin, so the filler cannot alter the claim or hide a
	 * `purposes`-dependent branch. `name` is required by the dialog's reader (`purpose.name`), and ten
	 * numbered entries tell a reader at a glance that nothing in them is real.
	 *
	 * `language` deliberately does not go in. The manifest has one and the fixture's bytes can show it,
	 * but no GVL document does -- the web chooses a language by URL -- and the reference leaves
	 * `GVL.language` at `DEFAULT_LANGUAGE`, which is what [toTcVendorList] reproduces.
	 */
	fun documentFor(manifest: TcVendorList): JsonObject = buildJsonObject {
		put("vendorListVersion", JsonPrimitive(manifest.vendorListVersion))
		put("tcfPolicyVersion", JsonPrimitive(manifest.tcfPolicyVersion))
		put("gvlSpecificationVersion", JsonPrimitive(GVL_SPECIFICATION_VERSION))
		put("lastUpdated", JsonPrimitive(LAST_UPDATED))
		put("purposes", numberedEntries(PURPOSE_COUNT))
		put("specialPurposes", numberedEntries(SPECIAL_PURPOSE_COUNT))
		put("features", numberedEntries(FEATURE_COUNT))
		put("specialFeatures", numberedEntries(SPECIAL_FEATURE_COUNT))
		put("stacks", JsonObject(emptyMap()))
		put(
			"vendors",
			JsonObject(
				manifest.vendors.associate { vendor ->
					vendor.id.toString() to JsonObject(
						buildMap {
							put("id", JsonPrimitive(vendor.id))
							put("name", JsonPrimitive("Vector vendor ${vendor.id}"))
							put("purposes", ids(vendor.purposes))
							put("legIntPurposes", ids(vendor.legIntPurposes))
							put("flexiblePurposes", ids(vendor.flexiblePurposes))
							put("specialPurposes", ids(vendor.specialPurposes))
							// Feature ids are not part of what a TC String encodes or what these rules
							// ask, and `TcVendor` carries none, so the manifest has nothing to put here.
							// The key stays present and empty because the schema requires it.
							put("features", JsonArray(emptyList()))
							put("specialFeatures", JsonArray(emptyList()))
							vendor.deletedDate?.let { put("deletedDate", JsonPrimitive(it)) }
							put("cookieMaxAgeSeconds", JsonNull)
							put("cookieRefresh", JsonPrimitive(false))
							put("usesCookies", JsonPrimitive(false))
							put("usesNonCookieAccess", JsonPrimitive(false))
							put("urls", JsonArray(emptyList()))
						},
					)
				},
			),
		)
	}

	/**
	 * [documentFor] with vendor [id] removed from `vendors`.
	 *
	 * @source `tc-string-parity-pruned-signals` names vendor 400 in both vectors and no vector carries a
	 * `deletedDate` (`TcStringFixtures` records that), so 400 does double duty in this file because it is
	 * a name the vectors themselves put in front of the encoder. Which of the two states the carrier is
	 * in is always named in the test's own words: not in `vendors` here, and withdrawn in
	 * [withVendorWithdrawn].
	 */
	fun withVendorAbsent(document: JsonObject, id: Int): JsonObject = edited(document) {
		JsonObject((it["vendors"]!!.jsonObject).filterKeys { key -> key != id.toString() })
	}

	/**
	 * [documentFor] with vendor [id] carrying [deletedDate], still declaring purposes.
	 *
	 * The date format and the state it describes are documentary: they come from `gvlVendorSchema`'s
	 * `deletedDate` field, because no vector runs one -- which is precisely why rule needs a fixture of
	 * its own.
	 */
	fun withVendorWithdrawn(
		document: JsonObject,
		id: Int,
		deletedDate: String,
	): JsonObject = editedWithVendor(document, id) {
		JsonObject(it + ("deletedDate" to JsonPrimitive(deletedDate)))
	}

	/** Whether vendor [id] is in vendor [id]'s `legIntPurposes`, leaving the rest of the document alone. */
	fun withLegitimateInterestDeclared(document: JsonObject, id: Int, declared: Boolean): JsonObject =
		editedWithVendor(document, id) { vendor ->
			val list = vendor["legIntPurposes"]!!.jsonArray.map { it.jsonPrimitive.int }
			JsonObject(
				vendor + (
					"legIntPurposes" to ids(if (declared) list + CONSENTED_PURPOSE else list.filterNot { p -> p == CONSENTED_PURPOSE })
				),
			)
		}

	/** The single purpose the rule pairs declare, under the basis named by the test that uses it. */
	const val CONSENTED_PURPOSE = 2

	/** Pinched from [TcSemanticPreEncoderTest], so both rule sets write a comparable pair. */
	private const val CMP_ID = 22

	/** A UTC day boundary, which is the grain the string's two date fields store. */
	private const val CONFIRMED_AT_MILLIS = 1_769_990_400_000L

	private const val GVL_SPECIFICATION_VERSION = 3
	private const val LAST_UPDATED = "2025-01-01T00:00:00Z"
	private const val PURPOSE_COUNT = 10
	private const val SPECIAL_PURPOSE_COUNT = 2
	private const val FEATURE_COUNT = 3
	private const val SPECIAL_FEATURE_COUNT = 2

	private fun ids(values: List<Int>): JsonArray = JsonArray(values.map { JsonPrimitive(it) })

	private fun numberedEntries(count: Int): JsonObject = JsonObject(
		(1..count).associate { index ->
			index.toString() to buildJsonObject {
				put("id", JsonPrimitive(index))
				put("name", JsonPrimitive("Purpose $index"))
				put("description", JsonPrimitive("Placeholder description $index"))
				put("illustrations", JsonArray(emptyList()))
			}
		},
	)

	/**
	 * [document] with vendor [id] added as [entry].
	 *
	 * No vector carries this vendor and no published GVL either: signals for a vendor named 902 are a
	 * fixture this file writes, which is what makes the pair below an authored case rather than an
	 * observed one. The vectors' document is still the substrate, so the served path is graded against a
	 * real vendor list with one vendor bolted on, not against a toy.
	 */
	fun withVendorAdded(document: JsonObject, id: Int, entry: JsonObject): JsonObject =
		JsonObject(document["vendors"]!!.jsonObject.let { vendors ->
			document + ("vendors" to JsonObject(vendors + (id.toString() to entry)))
		})

	/** A vendor entry declaring purpose 2 under legitimate interest and nothing under consent. */
	fun vendorDeclaringLegitimateInterestOnly(id: Int): JsonObject = buildJsonObject {
		put("id", JsonPrimitive(id))
		put("name", JsonPrimitive("Fixture vendor $id"))
		put("purposes", ids(emptyList()))
		put("legIntPurposes", ids(listOf(CONSENTED_PURPOSE)))
		put("flexiblePurposes", ids(emptyList()))
		put("specialPurposes", ids(emptyList()))
		put("features", ids(emptyList()))
		put("specialFeatures", ids(emptyList()))
		put("cookieMaxAgeSeconds", JsonNull)
		put("cookieRefresh", JsonPrimitive(false))
		put("usesCookies", JsonPrimitive(false))
		put("usesNonCookieAccess", JsonPrimitive(false))
		put("urls", JsonArray(emptyList()))
	}

	/**
	 * A vector's own consent state, authored against [vendorList] instead of the manifest's list.
	 *
	 * The one place a served-list test reaches a fixture's model, and deliberately the same field-for-field
	 * mapping [TcStringEncodeTest] uses, so the two routes differ by their vendor list and by nothing else.
	 */
	fun consentInput(fixture: TcStringFixture, vendorList: TcVendorList): TcConsentInput = TcConsentInput(
		cmpId = fixture.model.cmpId,
		confirmedAtMillis = fixture.model.createdMillis,
		vendorList = vendorList,
		cmpVersion = fixture.model.cmpVersion,
		consentScreen = fixture.model.consentScreen,
		publisherCountryCode = fixture.model.publisherCountryCode,
		isServiceSpecific = fixture.model.isServiceSpecific,
		purposeConsents = fixture.model.purposeConsents,
		purposeLegitimateInterests = fixture.model.purposeLegitimateInterests,
		specialFeatureOptins = fixture.model.specialFeatureOptins,
		vendorConsents = fixture.model.vendorConsents,
		vendorLegitimateInterests = fixture.model.vendorLegitimateInterests,
		vendorsDisclosed = fixture.model.vendorsDisclosed,
	)

	/**
	 * A consent state to encode against a rule fixture, with everything not under test pinned.
	 *
	 * The same CMP id and decision instant [TcSemanticPreEncoderTest] uses -- a UTC day boundary, because
	 * that is the grain the two date fields store -- so a pair of encodes that differ in one argument
	 * differ in the bytes by that argument and nothing else.
	 */
	fun consentInput(
		vendorList: TcVendorList,
		vendorConsents: List<Int> = emptyList(),
		vendorLegitimateInterests: List<Int> = emptyList(),
	): TcConsentInput = TcConsentInput(
		cmpId = CMP_ID,
		confirmedAtMillis = CONFIRMED_AT_MILLIS,
		vendorList = vendorList,
		vendorConsents = vendorConsents,
		vendorLegitimateInterests = vendorLegitimateInterests,
	)

	/** Replace the whole `vendors` record with [replace]'s answer, keeping every other key. */
	private fun edited(document: JsonObject, replace: (JsonObject) -> JsonObject): JsonObject =
		JsonObject(document + ("vendors" to replace(document)))

	/** Rewrite one vendor entry with [replace], and fail if that vendor is not in the document. */
	private fun editedWithVendor(document: JsonObject, id: Int, replace: (JsonObject) -> JsonObject): JsonObject {
		val vendors = document["vendors"]!!.jsonObject
		val vendor = vendors[id.toString()]?.jsonObject
			?: error("fixture document carries no vendor $id, so the rule under test is not set up")
		return JsonObject(document + ("vendors" to JsonObject(vendors + (id.toString() to replace(vendor)))))
	}
}
