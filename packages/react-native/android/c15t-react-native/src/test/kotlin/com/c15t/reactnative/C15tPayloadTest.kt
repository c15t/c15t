package com.c15t.reactnative

import com.c15t.core.CommitIntent
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.KernelOverrides
import com.c15t.core.store.C15tStore
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The wire contract on the Android side, proven against the shapes in
 * `packages/react-native/src/protocol`.
 */
class C15tPayloadTest {
	private val json = Json { ignoreUnknownKeys = true }

	@Test
	fun `getBootstrap answers deny-all when the store is empty`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()

		val payload = parse(C15tPayload.bootstrap(kernel.snapshot(), kernel.hasStoredSnapshot))

		assertEquals(1L, payload["protocolVersion"]!!.jsonPrimitive.content.toLong())
		assertEquals(1L, payload["minSupportedProtocolVersion"]!!.jsonPrimitive.content.toLong())
		assertEquals(1L, payload["maxSupportedProtocolVersion"]!!.jsonPrimitive.content.toLong())
		assertFalse(
			"nothing was stored, so the handshake must not claim a cached snapshot",
			payload["hasStoredSnapshot"]!!.jsonPrimitive.boolean,
		)
		assertFalse("the handshake carries the version, not the snapshot", payload.containsKey("effectivePermissions"))

		val snapshot = parse(C15tPayload.snapshot(kernel.snapshot()))
		assertFalse(snapshot["ready"]!!.jsonPrimitive.boolean)
		assertTrue(snapshot["policyPending"]!!.jsonPrimitive.boolean)
		val permissions = snapshot["effectivePermissions"]!!.jsonObject
		assertTrue(permissions["necessary"]!!.jsonPrimitive.boolean)
		for (category in listOf("functionality", "experience", "measurement", "marketing")) {
			assertFalse("$category must be denied on an empty store", permissions[category]!!.jsonPrimitive.boolean)
		}
	}

	@Test
	fun `getBootstrap reports a stored snapshot on the next launch`() {
		val backend = MemoryStore()
		bridgeKernel(C15tStore(backend)).bootstrap()

		val relaunched = bridgeKernel(C15tStore(backend))
		relaunched.bootstrap()

		val payload = parse(C15tPayload.bootstrap(relaunched.snapshot(), relaunched.hasStoredSnapshot))
		assertTrue(payload["hasStoredSnapshot"]!!.jsonPrimitive.boolean)
		assertTrue("the generated subject must survive the relaunch", relaunched.snapshot().subject != null)
		assertEquals(
			relaunched.snapshot().subject!!.id,
			payload["subjectId"]!!.jsonPrimitive.content,
		)
	}

	@Test
	fun `the snapshot wire form keeps the reserved keys and never a null language`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()

		val snapshot = parse(C15tPayload.snapshot(kernel.snapshot(), fallbackLanguage = "de"))

		assertTrue("the iab slot stays present", snapshot.containsKey("iab"))
		assertTrue("the reserved slot is JSON null", snapshot["iab"] is JsonNull)
		assertTrue(snapshot.containsKey("optOutDirectives"))
		val overrides = snapshot["overrides"]!!.jsonObject
		assertEquals("de", overrides["language"]!!.jsonPrimitive.content)
		assertTrue("an unset test mode is null on the wire, not absent", overrides["test"] is JsonNull)
	}

	@Test
	fun `publisher test mode crosses as a string`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()
		kernel.setOverrides(KernelOverrides(test = true), merge = false)

		val overrides = parse(C15tPayload.snapshot(kernel.snapshot()))["overrides"]!!.jsonObject

		assertEquals(C15tPayload.TEST_MODE_GPC, overrides["test"]!!.jsonPrimitive.content)
	}

	@Test
	fun `a commit result reports confirmed as the category names it recorded`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()

		val result = kernel.save(CommitIntent.Explicit(mapOf(ConsentCategory.MEASUREMENT to true, ConsentCategory.MARKETING to false)))
		val payload = parse(C15tPayload.commitResult(result, kernel.snapshot()))

		assertTrue(payload["ok"]!!.jsonPrimitive.boolean)
		assertEquals(result.revision, payload["revision"]!!.jsonPrimitive.content.toLong())
		assertTrue(payload["queued"]!!.jsonPrimitive.boolean)
		val confirmed = payload["confirmed"]!!.jsonArray.map { it.jsonPrimitive.content }
		assertEquals(setOf("measurement", "marketing"), confirmed.toSet())
		assertFalse("the reason key stays absent for a successful commit", payload.containsKey("reason"))
	}

	@Test
	fun `an unreadable intent is refused rather than rounded to an action`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()
		val before = kernel.snapshot().revision

		for (raw in listOf("", "{", "{\"action\":\"explode\"}", "{\"action\":\"explicit\"}", "[1,2]", "null")) {
			assertNull("must refuse: $raw", C15tPayload.parseCommitIntent(raw))
		}
		assertNull(
			"necessary is not a choice anyone can grant",
			C15tPayload.parseCommitIntent("{\"action\":\"explicit\",\"consents\":{\"necessary\":true}}"),
		)
		assertEquals("a refused intent must not mutate the snapshot", before, kernel.snapshot().revision)
	}

	@Test
	fun `the three intents parse to the kernel's own actions`() {
		assertTrue(C15tPayload.parseCommitIntent("{\"action\":\"all\"}") is CommitIntent.All)
		assertTrue(C15tPayload.parseCommitIntent("{\"action\":\"necessary\"}") is CommitIntent.Necessary)
		val explicit = C15tPayload.parseCommitIntent("{\"action\":\"explicit\",\"consents\":{\"measurement\":false}}")
		assertTrue(explicit is CommitIntent.Explicit && explicit.consents.values.toList() == listOf(false))
	}

	@Test
	fun `omitted overrides keep their value and explicit nulls clear it`() {
		val current = KernelOverrides(country = "DE", region = "BE", language = "de", test = true)

		val cleared = C15tPayload.parseOverrides("{\"country\":null}", current)!!
		assertNull(cleared.country)
		assertEquals("BE", cleared.region)
		assertEquals("de", cleared.language)
		assertEquals(true, cleared.test)

		val set = C15tPayload.parseOverrides("{\"region\":\"US-HI\",\"test\":false}", current)!!
		assertEquals("DE", set.country)
		assertEquals("US-HI", set.region)
		assertEquals(false, set.test)
	}

	@Test
	fun `a document that is not an override set is ignored`() {
		val current = KernelOverrides(language = "de")
		assertNull(C15tPayload.parseOverrides("{}", current))
		assertNull(C15tPayload.parseOverrides("{\"nonsense\":1}", current))
		assertNull(C15tPayload.parseOverrides("not json", current))
	}

	private fun parse(raw: String): JsonObject = json.parseToJsonElement(raw).jsonObject
}
