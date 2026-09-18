package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.io.File
import java.security.MessageDigest
import kotlin.test.fail

/**
 * What one surviving vendor claims about itself, as the web filter left it in the fixture.
 *
 * [bodyId] is the id the surviving entry states in its own `id` field, which the served
 * document's key may or may not agree with. The filter never consults it, so
 * [bodyIdDiffersFromKey] is the fixture recording a disagreement the producer planted rather
 * than a rule this build invented, and a runner that keys correctly and reads bodies anyway
 * produces a different set with the same count -- which is only visible if the surviving keys
 * are compared one by one.
 */
internal data class VendorSurvivalClaim(
	val bodyId: Long,
	val bodyIdDiffersFromKey: Boolean,
	val carriesOptionalFields: Boolean,
	val key: Long,
	val name: String,
)

/**
 * One `vendor-list-scope` fixture, read off the bytes `index.json` hashed.
 *
 * [scope] is `null` for the vector that declares no scope at all, an empty list for the vector
 * that declares an empty one, and the declared ids otherwise. Both "no scope" shapes expect the
 * served document back, which is what [unchanged] records: the web's filter returned the very
 * document it was handed rather than a rebuilt copy of it.
 */
internal data class VendorListScopeFixture(
	val expectedDocument: JsonObject,
	val expectedVendorKeys: List<Long>,
	val id: String,
	val scope: List<Long>?,
	val scopeSize: Int,
	val served: JsonObject,
	val servedVendorKeys: List<Long>,
	val shape: String,
	val surviving: List<VendorSurvivalClaim>,
	val unchanged: Boolean,
)

/**
 * The shared `vendor-list-scope` fixtures in `native/protocol`, loaded through one door.
 *
 * The vectors lane owns that directory and publishes through its `index.json`; this build reads
 * it and writes nothing to it. The oracle behind these files is `narrowGVLToVendors` in
 * `packages/iab/src/tcf/fetch-gvl.ts`, called by the generator rather than restated, so an
 * expectation here is the browser build's answer and not Kotlin's opinion about it.
 *
 * [load] enumerates through the index rather than globbing, and proves the bytes are the ones
 * the generator hashed before parsing them: a fixture whose digestmoved is a fixture that was
 * edited by hand after it was written, and grading a core against that would fail the core for
 * someone else's edit. A `vendor-list-scope` file on disk that the index never listed also
 * fails, so the set under test cannot shrink or grow quietly.
 */
internal object VendorListScopeFixtures {
	/** The kind these fixtures carry, and the only one [load] returns. */
	const val KIND: String = "vendor-list-scope"

	private const val INDEX_FILE = "index.json"

	private val json = Json { ignoreUnknownKeys = true }

	/**
	 * Every `vendor-list-scope` entry in `index.json`, in index order, with its bytes verified.
	 */
	fun load(): List<VendorListScopeFixture> {
		val directory = fixtureDirectory()
		val index = json.parseToJsonElement(File(directory, INDEX_FILE).readText()).jsonObject
		val listed = index["fixtures"]!!.jsonArray
			.map { it.jsonObject }
			.filter { it["kind"]?.jsonPrimitive?.content == KIND }

		val claimed = listed.map { entry ->
			val name = entry["file"]?.jsonPrimitive?.content
				?: fail("a $KIND index entry names no file: $entry")
			read(directory, name, entry["sha256"]?.jsonPrimitive?.content
				?: fail("$name: its index entry carries no sha256"))
		}

		val unlisted = directory.listFiles().orEmpty()
			.filter { it.name.startsWith("$KIND-") && it.name.endsWith(".json") }
			.map { it.name }
			.filterNot { name -> listed.any { it["file"]?.jsonPrimitive?.content == name } }
			.sorted()
		if (unlisted.isNotEmpty()) {
			fail(
				"$KIND fixtures on disk that $INDEX_FILE does not list: $unlisted. A runner that " +
					"enumerates the index would skip them silently."
			)
		}
		return claimed
	}

	/** The ids of every `vendor-list-scope` fixture, so the kernel runner can prove it claims them too. */
	fun ids(): List<String> = load().map { it.id }.sorted()

	/**
	 * Walk up from the Gradle module until `native/protocol/index.json` appears.
	 *
	 * The same walk ProtocolFixtureTest makes: `user.dir` is the module directory under the
	 * Gradle test JVM, and the protocol directory is a sibling of the whole native tree.
	 */
	private fun fixtureDirectory(): File {
		var cursor: File? = File(System.getProperty("user.dir")).absoluteFile
		while (cursor != null) {
			val candidate = File(cursor, "native/protocol/$INDEX_FILE")
			if (candidate.isFile) {
				return candidate.parentFile
			}
			cursor = cursor.parentFile
		}
		fail(
			"no native/protocol/$INDEX_FILE above ${File(System.getProperty("user.dir")).absolutePath}. " +
				"Run `bun run --cwd packages/react-native generate:fixtures`."
		)
	}

	/** Read one fixture, refusing it unless its bytes still hash to what the index recorded. */
	private fun read(directory: File, name: String, expectedDigest: String): VendorListScopeFixture {
		val file = File(directory, name)
		if (!file.isFile) {
			fail("$INDEX_FILE lists $name, which is not on disk")
		}
		val bytes = file.readBytes()
		val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
		if (digest != expectedDigest) {
			fail(
				"$name is not the file $INDEX_FILE hashed ($digest != $expectedDigest). It was edited " +
					"after generation; regenerate rather than grading this build against it."
			)
		}
		return parse(name, json.parseToJsonElement(String(bytes, Charsets.UTF_8)).jsonObject)
	}

	private fun parse(fileName: String, root: JsonObject): VendorListScopeFixture {
		val input = root["input"]?.jsonObject ?: fail("$fileName: no input")
		val expected = root["expected"]?.jsonObject ?: fail("$fileName: no expected")
		val served = input["document"]?.jsonObject ?: fail("$fileName: no input.document")
		val expectedDocument = expected["document"]?.jsonObject ?: fail("$fileName: no expected.document")
		val protocolVersion = root["protocolVersion"]?.jsonPrimitive?.long
		if (protocolVersion != 1L) {
			fail("$fileName: protocolVersion $protocolVersion is not this build's 1")
		}
		val vendorIds = input["vendorIds"]
		val scope = when {
			vendorIds == null || vendorIds is kotlinx.serialization.json.JsonNull -> null
			else -> vendorIds.jsonArray.map { it.jsonPrimitive.long }
		}
		return VendorListScopeFixture(
			expectedDocument = expectedDocument,
			expectedVendorKeys = expected["vendorKeys"]!!.jsonArray.map { it.jsonPrimitive.long },
			id = root["id"]?.jsonPrimitive?.content ?: fail("$fileName: no id"),
			scope = scope,
			scopeSize = input["scopeSize"]?.jsonPrimitive?.int ?: fail("$fileName: no input.scopeSize"),
			served = served,
			servedVendorKeys = served["vendors"]!!.jsonObject.keys.map { it.toLong() },
			shape = root["shape"]?.jsonPrimitive?.content ?: fail("$fileName: no shape"),
			surviving = expected["vendors"]!!.jsonArray.map { row ->
				val fields = row.jsonObject
				VendorSurvivalClaim(
					bodyId = fields["bodyId"]!!.jsonPrimitive.long,
					bodyIdDiffersFromKey = fields["bodyIdDiffersFromKey"]!!.jsonPrimitive.boolean,
					carriesOptionalFields = fields["carriesOptionalFields"]!!.jsonPrimitive.boolean,
					key = fields["key"]!!.jsonPrimitive.long,
					name = fields["name"]!!.jsonPrimitive.content,
				)
			},
			unchanged = expected["unchanged"]?.jsonPrimitive?.boolean
				?: fail("$fileName: no expected.unchanged"),
		)
	}

	/** The optional halves of `gvlVendorSchema`, so "the survivor kept its own fields" is one check. */
	val OPTIONAL_VENDOR_FIELDS: List<String> = listOf(
		"dataCategories",
		"dataRetention",
		"deletedDate",
		"deviceStorageDisclosureUrl",
		"overflow",
	)

	/** The records that sit beside `vendors` in the document, which no scope may touch. */
	val SIBLING_KEYS: List<String> = listOf(
		"dataCategories",
		"features",
		"gvlSpecificationVersion",
		"lastUpdated",
		"purposes",
		"specialFeatures",
		"specialPurposes",
		"stacks",
		"tcfPolicyVersion",
		"vendorListVersion",
	)

	/** [element]'s `vendors` keys, in document order, as numbers. */
	fun vendorKeysOf(document: JsonObject): List<Long> =
		document["vendors"]?.jsonObject?.keys?.map { it.toLong() } ?: emptyList()
}
