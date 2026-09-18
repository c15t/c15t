package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Counts the `tc-string` fixtures in `native/protocol` and fails if this build does not claim them.
 *
 * The vectors lane owns `native/protocol` and publishes through its `index.json`; that directory is
 * the merge gate for TC String work, and this build reads it and writes nothing to it. The point of
 * the counter is that silence cannot pass: a fixture nobody claims is a case nobody runs, and a
 * codec that passes its own invented vectors while ignoring the published ones has tested the wrong
 * thing.
 *
 * As of writing, `index.json` carries fixtures of kinds `evaluation`, `native-envelope`,
 * `save-body`, `reset-consent` and `revision-trace` and no `tc-string` at all, and
 * `native/CONTRACT.md` still says TCF is out of scope for the phase. So [claimedFixtureIds] is empty
 * and the test passes at 0-of-0 while printing that fact. The moment the lane publishes a `tc-string`
 * fixture this test fails and names it, which is the intended hand-off: the fix is to delete the
 * provisional array behind [TcFixtureCorpus.cases] and feed the shared fixtures through that seam,
 * not to add an id to the set below.
 */
class TcStringFixtureClaimTest {
	private val json = Json { ignoreUnknownKeys = true }

	/**
	 * Fixture ids this build actually runs.
	 *
	 * Empty because there is nothing to claim. Do not grow this list to make the test pass -- if it
	 * ever names an id with no fixture behind it, the second assertion fails.
	 */
	private val claimedFixtureIds: Set<String> = emptySet()

	@Test
	fun `this build claims every tc-string fixture the protocol directory publishes`() {
		val directory = fixtureDirectory()
		val fixtures = json.parseToJsonElement(File(directory, INDEX_FILE).readText())
			.jsonObject["fixtures"]!!
			.jsonArray
			.map { it.jsonObject }

		val kinds = fixtures
			.map { it["kind"]?.jsonPrimitive?.contentOrNull ?: "<missing>" }
			.groupingBy { kind -> kind }
			.eachCount()
			.entries
			.sortedBy { entry -> entry.key }
			.joinToString(", ") { entry -> "${entry.key}=${entry.value}" }

		val tcStrings = fixtures.filter { it["kind"]?.jsonPrimitive?.contentOrNull == KIND }
		val ids = tcStrings.map { it["id"]?.jsonPrimitive?.contentOrNull ?: "<missing>" }
		val unclaimed = ids.filterNot { claimedFixtureIds.contains(it) }

		println(
			"TC STRING FIXTURES ($INDEX_FILE): total=${fixtures.size} kinds[$kinds] " +
				"$KIND total=${tcStrings.size} claimed=${tcStrings.size - unclaimed.size} unclaimed=${unclaimed.size}",
		)

		assertEquals(
			emptyList(),
			unclaimed,
			"$KIND fixtures are published and this build runs none of them. Wire them through " +
				"TcFixtureCorpus.cases() and delete the provisional array there.",
		)
		// A claim with nothing behind it is the same lie told from the other direction.
		val phantom = claimedFixtureIds.filterNot { ids.contains(it) }
		assertTrue(phantom.isEmpty(), "$claimedFixtureIds are claimed but $directory holds no such $KIND fixture")
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

	private companion object {
		private const val INDEX_FILE = "index.json"
		private const val KIND = "tc-string"
	}
}
