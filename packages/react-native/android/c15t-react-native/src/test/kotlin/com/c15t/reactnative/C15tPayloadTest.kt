package com.c15t.reactnative

import com.c15t.core.CommitIntent
import com.c15t.core.CommitResult
import com.c15t.core.NativeConfig
import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentLocation
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelIabState
import com.c15t.core.model.PromptPurpose
import com.c15t.core.model.PromptRequirement
import com.c15t.core.store.C15tStore
import com.c15t.core.tc.GlobalVendorList
import com.c15t.core.tc.GvlLocalizedEntry
import com.c15t.core.tc.GvlVendorEntry
import com.c15t.core.wire.SnapshotWire
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
	fun `the snapshot wire form keeps every declared key and never a null language`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()

		val snapshot = parse(C15tPayload.snapshot(kernel.snapshot(), fallbackLanguage = "de"))

		assertTrue("the iab key stays present", snapshot.containsKey("iab"))
		assertTrue(
			"a device that was never served a list writes null rather than inventing an empty one",
			snapshot["iab"] is JsonNull,
		)
		assertTrue(snapshot.containsKey("optOutDirectives"))
		val overrides = snapshot["overrides"]!!.jsonObject
		assertEquals("de", overrides["language"]!!.jsonPrimitive.content)
		assertEquals(
			"an unset gpc override is null on the wire, not absent",
			JsonNull,
			overrides["gpc"],
		)
	}

	/**
	 * A drawer that renders partner names reads `iab.gvl`, and Android used to hand it
	 * `null`: the core kept the served list behind a kernel accessor while Swift put it
	 * on the snapshot, so the same build named vendors on iOS and showed an empty pane
	 * on Android.
	 *
	 * `VendorListRetentionTest` grades the core for the same regression. This grades the
	 * artifact this module hands JavaScript, because the payload builder copies the wire
	 * keys one by one, and a copy loop that leaves one out is invisible to every type on
	 * the receiving side -- the list arrives under no name at all, the app reads
	 * `undefined`, and nothing fails.
	 */
	@Test
	fun `a served vendor list crosses the bridge inside the iab slot`() {
		val list = GlobalVendorList(
			purposes = mapOf(1 to GvlLocalizedEntry(id = 1, name = "Store and/or access information on a device")),
			vendors = mapOf(755 to GvlVendorEntry(id = 755, name = "Vendor Seven Fifty-Five", purposes = listOf(1))),
			vendorListVersion = 177,
			tcfPolicyVersion = 5,
		)

		val iab = parse(C15tPayload.snapshot(ConsentSnapshot(iab = KernelIabState(list))))
			.getValue("iab")
			.jsonObject

		assertEquals(
			"the kernel's `KernelIABState` carries `gvl` and nothing beside it",
			setOf("gvl"),
			iab.keys,
		)
		val document = iab["gvl"]!!.jsonObject
		assertEquals(
			"the version a disclosure is labelled with",
			177L,
			document["vendorListVersion"]!!.jsonPrimitive.content.toLong(),
		)
		assertEquals(
			"the partner name a drawer draws has to survive the trip",
			"Vendor Seven Fifty-Five",
			document["vendors"]!!.jsonObject["755"]!!.jsonObject["name"]!!.jsonPrimitive.content,
		)
		assertNull(
			"the document keeps the served shape, so a key this list never carried stays absent",
			document["dataCategories"],
		)
	}

	@Test
	fun `the gpc signal crosses as the detected override active triple`() {
		// A caller that sees marketing denied has to be able to say why. `active` is
		// what the evaluator honored, and `override` says whether the app or the
		// device caused it, so the payload answers the question on its own.
		val kernel = bridgeKernel(
			C15tStore(MemoryStore()),
			config = NativeConfig(
				portalUrl = "https://test.c15t.app",
				overrides = KernelOverrides(gpc = true),
				detectedGpc = false,
			),
		)
		kernel.bootstrap()

		val signals = parse(C15tPayload.snapshot(kernel.snapshot()))["privacySignals"]!!.jsonObject
		val gpc = signals["gpc"]!!.jsonObject

		assertFalse("the device reported nothing", gpc["detected"]!!.jsonPrimitive.boolean)
		assertTrue("the app overrode the signal", gpc["override"]!!.jsonPrimitive.boolean)
		assertTrue("the override is what the evaluator honored", gpc["active"]!!.jsonPrimitive.boolean)
		assertFalse("msa is not a v3 signal", signals.containsKey("msa"))
	}

	@Test
	fun `an un-overridden signal reports a null override rather than a false one`() {
		val kernel = bridgeKernel(C15tStore(MemoryStore()))
		kernel.bootstrap()

		val gpc = parse(C15tPayload.snapshot(kernel.snapshot()))["privacySignals"]!!.jsonObject["gpc"]!!.jsonObject

		assertFalse(gpc["detected"]!!.jsonPrimitive.boolean)
		assertEquals("no override is not the same answer as an override to false", JsonNull, gpc["override"])
		assertFalse(gpc["active"]!!.jsonPrimitive.boolean)
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
	fun `a refusal from the core reaches JavaScript under the reason it names`() {
		// Whether a save without a policy is refused or queued is the core's call, and
		// the two platforms answer it differently. What the bridge must never do is
		// soften the code it was given, because that code is the whole explanation a
		// caller gets.
		val result = CommitResult(
			ok = false,
			revision = 4,
			confirmed = emptyMap(),
			queued = false,
			delivered = false,
			error = KernelError("not-bootstrapped", "C15t.bootstrap() has not run"),
		)

		val payload = parse(C15tPayload.commitResult(result, ConsentSnapshot()))

		assertFalse(payload["ok"]!!.jsonPrimitive.boolean)
		assertTrue("a refused commit reports no revision", payload["revision"] is JsonNull)
		assertEquals("not-bootstrapped", payload["reason"]!!.jsonPrimitive.content)
	}

	@Test
	fun `an accepted commit carries no reason at all`() {
		val result = CommitResult(
			ok = true,
			revision = 4,
			confirmed = mapOf("marketing" to true),
			queued = true,
			delivered = false,
		)

		val payload = parse(C15tPayload.commitResult(result, ConsentSnapshot()))

		assertTrue(payload["ok"]!!.jsonPrimitive.boolean)
		assertEquals(4L, payload["revision"]!!.jsonPrimitive.content.toLong())
		assertFalse("reason is a failure-only key", payload.containsKey("reason"))
	}

	@Test
	fun `the not-bootstrapped shape carries the reason the protocol names`() {
		val payload = parse(C15tPayload.notBootstrapped())

		assertFalse(payload["ok"]!!.jsonPrimitive.boolean)
		assertTrue(payload["revision"] is JsonNull)
		assertEquals("not-bootstrapped", payload["reason"]!!.jsonPrimitive.content)
		assertFalse("nothing was queued, because there was no core to queue it to", payload["queued"]!!.jsonPrimitive.boolean)
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
		val current = KernelOverrides(country = "DE", region = "BE", language = "de", gpc = true)

		val cleared = applied("""{"country":null,"gpc":null}""", current)
		assertNull(cleared.country)
		assertEquals("BE", cleared.region)
		assertEquals("de", cleared.language)
		assertNull("an explicit null clears the gpc override", cleared.gpc)

		val set = applied("""{"region":"US-HI","gpc":false}""", current)
		assertEquals("DE", set.country)
		assertEquals("US-HI", set.region)
		assertEquals(false, set.gpc)
	}

	@Test
	fun `a gpc that is neither a boolean nor null is refused`() {
		// The signal decides whether a standing directive applies, so a value this
		// build cannot read must not become either answer.
		val refused = C15tPayload.parseOverrides(
			"""{"gpc":"yes"}""",
			KernelOverrides(language = "de", gpc = null),
		)

		assertTrue("expected a refusal, got $refused", refused is OverridesRead.Refused)
		refused as OverridesRead.Refused
		assertEquals(C15tPayload.REJECT_OVERRIDES, refused.code)
		assertTrue(refused.message.contains("gpc"))
	}

	@Test
	fun `a document that is not an override set is refused`() {
		val current = KernelOverrides(language = "de")

		for (raw in listOf("{}", """{"nonsense":1}""", "not json")) {
			val refused = C15tPayload.parseOverrides(raw, current)
			assertTrue("expected a refusal for: $raw", refused is OverridesRead.Refused)
			assertEquals(C15tPayload.REJECT_OVERRIDES, (refused as OverridesRead.Refused).code)
		}
	}

	@Test
	fun `a retired override arriving over the bridge is refused by name`() {
		// `test` was never a GPC override, and there is no msa signal in v3. Reading
		// past either would leave the app believing a mode was on that nothing turned
		// on, which is the silence this refusal exists to break.
		for (raw in listOf("""{"test":true}""", """{"test":"gpc","language":"de"}""", """{"msa":false}""")) {
			val refused = C15tPayload.parseOverrides(raw, KernelOverrides(language = "de"))

			assertTrue("expected a refusal for: $raw", refused is OverridesRead.Refused)
			refused as OverridesRead.Refused
			assertEquals(C15tPayload.REJECT_OVERRIDES_RETIRED, refused.code)
			assertTrue(
				"the message must name the retired field so the host knows what to delete",
				refused.message.contains("test") || refused.message.contains("msa"),
			)
			assertTrue(
				"and the field that replaces it",
				refused.message.contains("gpc"),
			)
		}
	}

	@Test
	fun `a stored envelope carrying the retired override is not served`() {
		val backend = MemoryStore()
		bridgeKernel(C15tStore(backend)).bootstrap()
		sealWithRetiredOverride(backend, key = "test", value = "gpc")

		val relaunched = bridgeKernel(C15tStore(backend))
		relaunched.bootstrap()

		assertFalse(
			"the bridge must not report a snapshot it could not read",
			relaunched.hasStoredSnapshot,
		)
		val snapshot = parse(C15tPayload.snapshot(relaunched.snapshot()))
		assertFalse("a refused read fails closed", snapshot["ready"]!!.jsonPrimitive.boolean)
		assertTrue(snapshot["policyPending"]!!.jsonPrimitive.boolean)
		val overrides = snapshot["overrides"]!!.jsonObject
		assertFalse("a retired name never reaches JavaScript", overrides.containsKey("test"))
		assertTrue("and the live override set still carries every key", overrides.containsKey("gpc"))
	}

	/**
	 * The four objects the kernel owns the spelling of, asserted on the payload the bridge
	 * hands JavaScript.
	 *
	 * The fixture runner in `native/core-android` proves this shape against 23 snapshots the
	 * TypeScript kernel wrote. This pins the artifact instead of the model, because the bug
	 * lived here: the core's own encoder produced the body, its names rode along, and a JSON
	 * string hides a rename from every type on the receiving side. The snapshot is built by
	 * hand so all four objects are full at once -- a kernel with nothing stored answers nulls
	 * for three of them, which is exactly the state that let four renames pass 23 fixtures.
	 */
	@Test
	fun `the snapshot payload spells the kernel's four objects the kernel's way`() {
		val payload = parse(C15tPayload.snapshot(richSnapshot(), fallbackLanguage = "de"))

		val subject = payload["subject"]!!.jsonObject
		assertEquals("sub_01H", subject["subjectId"]!!.jsonPrimitive.content)
		assertEquals("user-42", subject["externalId"]!!.jsonPrimitive.content)

		val location = payload["location"]!!.jsonObject
		assertEquals("DE", location["countryCode"]!!.jsonPrimitive.content)
		assertEquals("BE", location["regionCode"]!!.jsonPrimitive.content)
		assertFalse("the language in effect belongs to overrides, not location", location.containsKey("language"))

		val prompt = payload["promptRequirement"]!!.jsonObject
		assertEquals(setOf("kind", "reason"), prompt.keys)
		assertEquals("choice", prompt["kind"]!!.jsonPrimitive.content)
		assertEquals("missing", prompt["reason"]!!.jsonPrimitive.content)

		val choice = payload["explicitChoice"]!!.jsonObject
		assertEquals(setOf("version", "categories"), choice.keys)
		assertEquals(3L, choice["version"]!!.jsonPrimitive.content.toLong())
		val receipt = choice["categories"]!!.jsonObject["measurement"]!!.jsonObject
		assertEquals(setOf("value", "confirmedAt", "basis"), receipt.keys)
		assertTrue(receipt["value"]!!.jsonPrimitive.boolean)
		assertEquals(ACTION_AT.toString(), receipt["confirmedAt"]!!.jsonPrimitive.content)
		val basis = receipt["basis"]!!.jsonObject
		assertEquals("choice-v1", basis["kind"]!!.jsonPrimitive.content)
		assertEquals(CHOICE_FINGERPRINT, basis["fingerprint"]!!.jsonPrimitive.content)

		// The bridge rewrites `overrides` after the projection; it must not undo it.
		assertEquals("de", payload["overrides"]!!.jsonObject["language"]!!.jsonPrimitive.content)
		assertNoCoreSpellings(payload)
	}

	@Test
	fun `no core spelling of those four objects survives the bridge`() {
		val emitted = C15tPayload.snapshot(richSnapshot())

		// Presence proves a rename landed; this is the half that would have failed the
		// build when the four drifted, because a payload carrying both the old key and the
		// new one still reads fine in TypeScript.
		assertNoCoreSpellings(parse(emitted))

		// Three retired names are unique to the core's spelling anywhere on this payload, so
		// they are worth a string check that catches them at any depth. `country`, `region`,
		// `language` and `fingerprint` are not: `overrides` legitimately carries the first
		// three, and the kernel's own choice basis carries the last.
		for (retired in listOf("\"consents\"", "\"actionAt\"", "\"acknowledge\"")) {
			assertFalse("$retired is what this core calls it, not the wire", emitted.contains(retired))
		}
	}

	/**
	 * Assert that none of the four kernel-owned objects carries a name this core uses
	 * internally for it.
	 *
	 * One level deep, on purpose: the kernel's `choice-v1` basis has a `fingerprint` of its
	 * own, and a deeper walk would have to know every object the kernel owns to tell that
	 * from drift.
	 */
	private fun assertNoCoreSpellings(payload: JsonObject) {
		SnapshotWire.RETIRED_WIRE_OBJECT_KEYS.forEach { (name, retired) ->
			val value = payload[name]
			if (value == null || value is JsonNull) {
				return@forEach
			}
			val carried = value.jsonObject.keys.intersect(retired)
			assertTrue(
				"$name carries ${carried.sorted()}, which is what this core calls them internally",
				carried.isEmpty(),
			)
		}
	}

	/** A snapshot with every kernel-owned object filled in, which a cold kernel never is. */
	private fun richSnapshot(): ConsentSnapshot = ConsentSnapshot(
		revision = 5,
		policyPending = false,
		ready = true,
		promptRequirement = PromptRequirement(
			notice = true,
			acknowledge = true,
			purpose = PromptPurpose.INITIAL,
		),
		explicitChoice = ExplicitChoice(
			consents = mapOf("measurement" to true, "marketing" to false),
			action = ConsentAction.CUSTOM,
			actionAt = ACTION_AT,
			fingerprint = CHOICE_FINGERPRINT,
		),
		subject = ConsentSubject(id = "sub_01H", externalId = "user-42"),
		location = ConsentLocation(country = "DE", region = "BE", language = "de"),
		overrides = KernelOverrides(country = "DE", region = "BE", language = "de"),
		evaluatedAt = ACTION_AT,
	)

	private companion object {
		const val ACTION_AT = 1_770_000_000_000L
		const val CHOICE_FINGERPRINT = "a35ac43b3d435b98441c5c39ccb3879d59d813fd9185d5fa9e3cfc08385412a9"
	}

	private fun applied(
		raw: String,
		current: KernelOverrides,
	): KernelOverrides {
		val read = C15tPayload.parseOverrides(raw, current)
		assertTrue("expected the document to apply: $raw", read is OverridesRead.Applied)
		return (read as OverridesRead.Applied).overrides
	}

	private fun parse(raw: String): JsonObject = json.parseToJsonElement(raw).jsonObject
}
