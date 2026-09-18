package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.io.File
import kotlin.test.fail

/**
 * The shared `tc-string` fixtures in `native/protocol`, loaded through one door.
 *
 * This replaced a provisional in-test array of hand-collected strings. The vectors lane owns
 * `native/protocol` and publishes through its `index.json`; this build reads that directory and
 * writes nothing to it, so the strings under test are the same bytes the web oracle's fixtures
 * carry. Nothing else in this test target holds a TC String literal.
 *
 * The contract, per fixture:
 *
 * - `input.model` plus `input.encodingOptions` plus `input.vendorList` is the encoder input.
 * - `expected.encode.tcString` is the byte target, `expected.encode.segmentTypes` the segment list.
 * - `expected.decode.fields` is everything a decoder must report back.
 * - `expects.encode` / `expects.decode` say which halves are graded. The encode half is false where
 *   the reference cannot produce that shape at all, which is a fact about the oracle, not an
 *   exemption this build granted itself.
 *
 * [load] reads the index rather than globbing, and separately fails if the directory holds a
 * `tc-string` file the index never listed, so the set under test cannot shrink by accident.
 */
object TcStringFixtures {
	private val json = Json { ignoreUnknownKeys = true }

	fun load(): List<TcStringFixture> {
		val directory = fixtureDirectory()
		val listed = json.parseToJsonElement(File(directory, INDEX_FILE).readText())
			.jsonObject["fixtures"]!!
			.jsonArray
			.map { it.jsonObject }
			.filter { it["kind"]?.jsonPrimitive?.content == KIND }

		val claimed = listed.map { entry ->
			val name = entry["file"]?.jsonPrimitive?.content ?: fail("${entry["id"]}: a tc-string index entry names no file")
			val file = File(directory, name)
			if (!file.isFile) {
				fail("index.json lists $name, which is not on disk")
			}
			parse(name, json.parseToJsonElement(file.readText()).jsonObject)
		}.sortedBy { it.id }

		val unlisted = directory.listFiles()
			.orEmpty()
			.filter { it.name.startsWith("$KIND-") && it.name.endsWith(".json") }
			.map { it.name }
			.filterNot { name -> listed.any { it["file"]?.jsonPrimitive?.content == name } }
			.sorted()
		if (unlisted.isNotEmpty()) {
			fail("$KIND fixtures on disk that index.json does not list: $unlisted. A runner would skip them silently.")
		}
		return claimed
	}

	private fun parse(fileName: String, root: JsonObject): TcStringFixture {
		val input = root["input"]!!.jsonObject
		val model = input["model"]!!.jsonObject
		// The vendor list recorded here is a stub: language, tcfPolicyVersion, vendorListVersion and
		// vendors, and no purposes or stacks. The three values this codec needs are scalars, and
		// taking them as scalars is what the recorded data supports. Reaching past them would mean
		// inventing a GVL to make a number line up.
		val vendorList = input["vendorList"]!!.jsonObject
		val expects = root["expects"]!!.jsonObject
		val expected = root["expected"]!!.jsonObject
		val encode = expected["encode"]!!.jsonObject
		val fields = expected["decode"]!!.jsonObject["fields"]!!.jsonObject
		val id = root["id"]!!.jsonPrimitive.content

		return TcStringFixture(
			id = id,
			fileName = fileName,
			population = root["population"]?.jsonPrimitive?.content ?: "<missing>",
			expectsDecode = expects["decode"]!!.jsonPrimitive.boolean,
			expectsEncode = expects["encode"]!!.jsonPrimitive.boolean,
			encoded = encode["tcString"]!!.jsonPrimitive.content,
			expectedSegments = encode["segments"]!!.jsonArray.map { it.jsonPrimitive.content },
			expectedSegmentTypes = encode["segmentTypes"]!!.jsonArray.map { it.jsonPrimitive.int },
			expected = ExpectedFields(fields),
			model = ModelInput(model),
			vendorListLanguage = vendorList["language"]!!.jsonPrimitive.content,
			vendorListVersion = vendorList["vendorListVersion"]!!.jsonPrimitive.int,
			policyVersion = vendorList["tcfPolicyVersion"]!!.jsonPrimitive.int,
		)
	}

	/** Find `native/protocol` by walking up, because Gradle may start anywhere in the module. */
	private fun fixtureDirectory(): File {
		var cursor: File? = File(System.getProperty("user.dir")).absoluteFile
		while (cursor != null) {
			val candidate = File(cursor, "native/protocol/$INDEX_FILE")
			if (candidate.isFile) {
				return candidate.parentFile
			}
			cursor = cursor.parentFile
		}
		fail("no native/protocol/$INDEX_FILE above ${File(System.getProperty("user.dir")).absolutePath}")
	}

	private const val INDEX_FILE = "index.json"
	private const val KIND = "tc-string"
}

private fun JsonObject.ids(name: String): List<Int> = this[name]!!.jsonArray.map { it.jsonPrimitive.int }

private fun JsonObject.int(name: String): Int = this[name]!!.jsonPrimitive.int

private fun JsonObject.long(name: String): Long = this[name]!!.jsonPrimitive.long

private fun JsonObject.boolean(name: String): Boolean = this[name]!!.jsonPrimitive.boolean

private fun JsonObject.string(name: String): String = this[name]!!.jsonPrimitive.content

/** One `tc-string` fixture, flattened into what the two test classes need. */
data class TcStringFixture(
	val id: String,
	val fileName: String,
	val population: String,
	val expectsDecode: Boolean,
	val expectsEncode: Boolean,
	/** The byte string: the encode target, and the input the decoder is fed. */
	val encoded: String,
	val expectedSegments: List<String>,
	val expectedSegmentTypes: List<Int>,
	val expected: ExpectedFields,
	val model: ModelInput,
	/**
	 * `vendorList.language`, which the reference writes into ConsentLanguage in place of whatever
	 * the model carried. See `tc-string-parity-consent-language-from-vendor-list`, where the app
	 * said EN and the string says DE.
	 */
	val vendorListLanguage: String,
	val vendorListVersion: Int,
	val policyVersion: Int,
)

/** `expected.decode.fields`, every key required: the contract is uniform across all 27 fixtures. */
data class ExpectedFields(private val fields: JsonObject) {
	val version: Int = fields.int("version")
	val createdMillis: Long = fields.long("created")
	val lastUpdatedMillis: Long = fields.long("lastUpdated")
	val cmpId: Int = fields.int("cmpId")
	val cmpVersion: Int = fields.int("cmpVersion")
	val consentScreen: Int = fields.int("consentScreen")
	val consentLanguage: String = fields.string("consentLanguage")
	val vendorListVersion: Int = fields.int("vendorListVersion")
	val policyVersion: Int = fields.int("policyVersion")
	val isServiceSpecific: Boolean = fields.boolean("isServiceSpecific")
	val useNonStandardTexts: Boolean = fields.boolean("useNonStandardTexts")
	val purposeOneTreatment: Boolean = fields.boolean("purposeOneTreatment")
	val publisherCountryCode: String = fields.string("publisherCountryCode")
	val specialFeatureOptins: List<Int> = fields.ids("specialFeatureOptins")
	val purposeConsents: List<Int> = fields.ids("purposeConsents")
	val purposeLegitimateInterests: List<Int> = fields.ids("purposeLegitimateInterests")
	val vendorConsents: List<Int> = fields.ids("vendorConsents")
	val vendorLegitimateInterests: List<Int> = fields.ids("vendorLegitimateInterests")
	val vendorsDisclosed: List<Int> = fields.ids("vendorsDisclosed")
	val vendorsAllowed: List<Int> = fields.ids("vendorsAllowed")
	val publisherConsents: List<Int> = fields.ids("publisherConsents")
	val publisherLegitimateInterests: List<Int> = fields.ids("publisherLegitimateInterests")
	val numCustomPurposes: Int = fields.int("numCustomPurposes")
	val publisherCustomConsents: List<Int> = fields.ids("publisherCustomConsents")
	val publisherCustomLegitimateInterests: List<Int> = fields.ids("publisherCustomLegitimateInterests")

	/**
	 * Echoed back from the encode options, not read out of the string. There is no bit for it: OOB
	 * support only decides whether a VendorsAllowed segment is emitted, so no decoder can recover
	 * it and no assertion here claims to.
	 */
	val supportOob: Boolean = fields.boolean("supportOOB")

	val restrictions: List<ExpectedRestriction> = fields["publisherRestrictions"]!!
		.jsonArray
		.map { entry ->
			entry.jsonObject.let {
				ExpectedRestriction(
					purposeId = it.int("purposeId"),
					restrictionType = it.int("restrictionType"),
					vendorIds = it.ids("vendorIds"),
				)
			}
		}

	private val maxIds = fields["vectorMaxIds"]!!.jsonObject

	/**
	 * The MaxVendorId each section carries, which is the id a decoder must stop reading at. It is a
	 * separate claim from the id set: a section can reach 700 while naming three vendors.
	 */
	val maxIdsOf: MaxIds = MaxIds(
		vendorConsents = maxIds.int("vendorConsents"),
		vendorLegitimateInterests = maxIds.int("vendorLegitimateInterests"),
		vendorsDisclosed = maxIds.int("vendorsDisclosed"),
		vendorsAllowed = maxIds.int("vendorsAllowed"),
		publisherCustomConsents = maxIds.int("publisherCustomConsents"),
	)
}

data class ExpectedRestriction(val purposeId: Int, val restrictionType: Int, val vendorIds: List<Int>)

data class MaxIds(
	val vendorConsents: Int,
	val vendorLegitimateInterests: Int,
	val vendorsDisclosed: Int,
	val vendorsAllowed: Int,
	val publisherCustomConsents: Int,
)

/** `input.model`, the consent state the encoder is handed. */
data class ModelInput(private val model: JsonObject) {
	val version: Int = model.int("version")
	val createdMillis: Long = model.long("created")
	val lastUpdatedMillis: Long = model.long("lastUpdated")
	val cmpId: Int = model.int("cmpId")
	val cmpVersion: Int = model.int("cmpVersion")
	val consentScreen: Int = model.int("consentScreen")
	val consentLanguage: String = model.string("consentLanguage")
	val publisherCountryCode: String = model.string("publisherCountryCode")
	val isServiceSpecific: Boolean = model.boolean("isServiceSpecific")
	val useNonStandardTexts: Boolean = model.boolean("useNonStandardTexts")
	val purposeOneTreatment: Boolean = model.boolean("purposeOneTreatment")
	val supportOob: Boolean = model.boolean("supportOOB")
	val numCustomPurposes: Int = model.int("numCustomPurposes")
	val purposeConsents: List<Int> = model.ids("purposeConsents")
	val purposeLegitimateInterests: List<Int> = model.ids("purposeLegitimateInterests")
	val specialFeatureOptins: List<Int> = model.ids("specialFeatureOptins")
	val vendorConsents: List<Int> = model.ids("vendorConsents")
	val vendorLegitimateInterests: List<Int> = model.ids("vendorLegitimateInterests")
	val vendorsDisclosed: List<Int> = model.ids("vendorsDisclosed")
	val vendorsAllowed: List<Int> = model.ids("vendorsAllowed")
	// Restriction entries are objects, not ids -- the same shape `expected.decode.fields` reports.
	val publisherRestrictions: List<ExpectedRestriction> = model["publisherRestrictions"]!!
		.jsonArray
		.map { entry ->
			entry.jsonObject.let {
				ExpectedRestriction(
					purposeId = it.int("purposeId"),
					restrictionType = it.int("restrictionType"),
					vendorIds = it.ids("vendorIds"),
				)
			}
		}
	val publisherConsents: List<Int> = model.ids("publisherConsents")
	val publisherLegitimateInterests: List<Int> = model.ids("publisherLegitimateInterests")
	val publisherCustomConsents: List<Int> = model.ids("publisherCustomConsents")
	val publisherCustomLegitimateInterests: List<Int> = model.ids("publisherCustomLegitimateInterests")
}
