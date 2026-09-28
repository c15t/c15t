package com.c15t.core

import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentLocation
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.PromptPurpose
import com.c15t.core.model.PromptRequirement
import com.c15t.core.store.C15tJson
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.wire.SnapshotWire
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Pin the JSON the bridge hands JavaScript, key by key.
 *
 * The fixture runner checks this shape against 23 kernel-authored expectations, which
 * catches a rename only in a state a fixture happens to reach. This file checks the
 * emitted artifact directly: a state no fixture exercises still has to carry
 * `subjectId`, and the names the core keeps internally still have to stay out of it.
 *
 * The stored half gets its own assertion too, because the direction matters: the
 * envelope is the one document a device keeps for itself, and an app that upgrades must
 * still read what it wrote before the upgrade.
 */
class SnapshotWireTest {
	private val json = Json { ignoreUnknownKeys = false; explicitNulls = true }

	@Test
	fun `the four kernel owned objects carry the kernel's key names`() {
		val wire = SnapshotWire.toJsonElement(choiceSnapshot())

		assertEquals(setOf("subjectId", "externalId"), wire.getValue("subject").jsonObject.keys)
		assertEquals(
			setOf("countryCode", "regionCode"),
			wire.getValue("location").jsonObject.keys,
			"the kernel's location object is `countryCode`/`regionCode` and nothing else",
		)
		assertEquals(setOf("kind", "reason"), wire.getValue("promptRequirement").jsonObject.keys)

		val choice = wire.getValue("explicitChoice").jsonObject
		assertEquals(setOf("version", "categories"), choice.keys)
		assertEquals(3L, choice.getValue("version").jsonPrimitive.long)

		val categories = choice.getValue("categories").jsonObject
		assertEquals(listOf("functionality", "marketing", "measurement"), categories.keys.toList())
		categories.forEach { (category, receipt) ->
			val body = receipt.jsonObject
			assertEquals(setOf("value", "confirmedAt", "basis"), body.keys, "$category receipt")
			assertEquals(ACTION_AT, body.getValue("confirmedAt").jsonPrimitive.long, "$category receipt")
			val basis = body.getValue("basis").jsonObject
			assertEquals(setOf("kind", "fingerprint"), basis.keys, "$category receipt basis")
			assertEquals("choice-v1", basis.getValue("kind").jsonPrimitive.content)
			assertEquals(CHOICE_FINGERPRINT, basis.getValue("fingerprint").jsonPrimitive.content)
		}
		assertTrue(categories.getValue("marketing").jsonObject.getValue("value").jsonPrimitive.boolean)
		assertFalse(categories.getValue("measurement").jsonObject.getValue("value").jsonPrimitive.boolean)
	}

	@Test
	fun `none of the core's own names for those four objects reaches the wire`() {
		val wire = SnapshotWire.toJsonElement(choiceSnapshot())

		SnapshotWire.RETIRED_WIRE_OBJECT_KEYS.forEach { (objectName, retired) ->
			val ownedObject = wire.getValue(objectName)
			if (ownedObject is JsonNull) {
				return@forEach
			}
			val present = ownedObject.jsonObject.keys.intersect(retired)
			assertTrue(
				present.isEmpty(),
				"$objectName carries ${present.sorted()}, which is how this core spells it internally " +
					"and what JavaScript never asked for",
			)
		}

		// The three renames a UI reads, asserted as the values themselves rather than as
		// absent keys, so a projection that drops the fact instead of renaming it fails.
		assertEquals("sub_01H", wire.getValue("subject").jsonObject.getValue("subjectId").jsonPrimitive.content)
		assertEquals("DE", wire.getValue("location").jsonObject.getValue("countryCode").jsonPrimitive.content)
		assertEquals("BE", wire.getValue("location").jsonObject.getValue("regionCode").jsonPrimitive.content)
		assertEquals("choice", wire.getValue("promptRequirement").jsonObject.getValue("kind").jsonPrimitive.content)
		assertEquals("missing", wire.getValue("promptRequirement").jsonObject.getValue("reason").jsonPrimitive.content)

		val encoded = SnapshotWire.encodeToString(choiceSnapshot())
		assertFalse(encoded.contains("\"subjectId\":null"), "subjectId must never go out empty: $encoded")
	}

	@Test
	fun `every other snapshot key is carried through untouched`() {
		val snapshot = choiceSnapshot()
		val wire = SnapshotWire.toJsonElement(snapshot)
		val stored = json.parseToJsonElement(
			C15tJson.storage.encodeToString(ConsentSnapshot.serializer(), snapshot)
		).jsonObject

		val ownedByKernel = SnapshotWire.KERNEL_OBJECT_KEYS.keys
		val names = wire.keys.toList()
		assertEquals(stored.keys.toList(), names, "the wire moves a key the model does not declare")
		assertEquals(22, names.size, "the snapshot carries 22 keys, `iab` included")
		names.filterNot { it in ownedByKernel }.forEach { name ->
			assertEquals(stored.getValue(name), wire.getValue(name), "$name was rewritten on the way out")
		}
	}

	@Test
	fun `the prompt pair says what is owed and nothing when nothing is`() {
		val pairs = listOf(
			PromptRequirement(notice = true, acknowledge = true, purpose = PromptPurpose.INITIAL) to
				"""{"kind":"choice","reason":"missing"}""",
			PromptRequirement(notice = true, acknowledge = false, purpose = PromptPurpose.INITIAL) to
				"""{"kind":"notice","reason":"missing"}""",
			PromptRequirement(notice = true, acknowledge = false, purpose = PromptPurpose.UPDATE) to
				"""{"kind":"notice","reason":"policy-changed"}""",
			// The choice prompt subsumes the notice, so the kernel names the outer debt.
			PromptRequirement(notice = false, acknowledge = true, purpose = PromptPurpose.UPDATE) to
				"""{"kind":"choice","reason":"policy-changed"}""",
			PromptRequirement.NONE to """{"kind":"none"}""",
		)

		pairs.forEach { (prompt, expected) ->
			val actual = SnapshotWire.toJsonElement(snapshot(prompt = prompt))
				.getValue("promptRequirement")
			assertEquals(
				json.parseToJsonElement(expected),
				actual,
				"a ${prompt.purpose ?: "no"} prompt the core describes as notice=${prompt.notice} " +
					"acknowledge=${prompt.acknowledge}",
			)
		}
	}

	@Test
	fun `an absent optional stays absent and an empty location keeps both keys`() {
		val bare = SnapshotWire.toJsonElement(
			snapshot(
				subject = null,
				location = ConsentLocation(country = null, region = null, language = "de"),
				prompt = PromptRequirement.NONE,
			),
		)

		assertEquals(JsonNull, bare.getValue("subject"))
		assertEquals(JsonNull, bare.getValue("explicitChoice"))
		assertEquals(setOf("countryCode", "regionCode"), bare.getValue("location").jsonObject.keys)
		assertEquals(JsonNull, bare.getValue("location").jsonObject.getValue("countryCode"))
		assertEquals(
			JsonNull,
			bare.getValue("location").jsonObject.getValue("regionCode"),
			"the kernel's LocationContext writes both keys, so a reader never branches on presence",
		)

		val withExternal = SnapshotWire.toJsonElement(snapshot(subject = ConsentSubject(id = "sub_01H", externalId = "u-9")))
			.getValue("subject")
			.jsonObject
		assertEquals(setOf("subjectId", "externalId"), withExternal.keys)

		// `identityProvider` is optional on the kernel's subject, and this core has
		// nothing to put in it, so an empty key would be a lie about a signed-in user.
		val withoutExternal = SnapshotWire.toJsonElement(snapshot(subject = ConsentSubject(id = "sub_01H")))
			.getValue("subject")
			.jsonObject
		assertEquals(setOf("subjectId"), withoutExternal.keys)
	}

	@Test
	fun `a receipt with no fingerprint binds to no contract`() {
		val choice = ExplicitChoice(
			consents = mapOf("marketing" to true),
			action = ConsentAction.CUSTOM,
			actionAt = ACTION_AT,
			fingerprint = null,
		)
		val basis = SnapshotWire.toJsonElement(snapshot(choice = choice))
			.getValue("explicitChoice").jsonObject.getValue("categories").jsonObject
			.getValue("marketing").jsonObject.getValue("basis").jsonObject

		assertEquals(setOf("kind"), basis.keys)
		assertEquals("legacy-v2", basis.getValue("kind").jsonPrimitive.content)
	}

	@Test
	fun `the stored envelope keeps the core's own names`() {
		val snapshot = choiceSnapshot()
		val envelope = SnapshotEnvelope(snapshot = snapshot)
		val written = C15tJson.storage.encodeToString(SnapshotEnvelope.serializer(), envelope)

		// Names inside a stored envelope are the core's business, and an installed app
		// reads what the previous build wrote. `RetiredWireFields` shows what happens to
		// an envelope this build cannot name: the device comes back as a fresh install.
		val stored = json.parseToJsonElement(written).jsonObject.getValue("snapshot").jsonObject
		assertEquals("sub_01H", stored.getValue("subject").jsonObject.getValue("id").jsonPrimitive.content)
		assertEquals("DE", stored.getValue("location").jsonObject.getValue("country").jsonPrimitive.content)
		assertTrue("language" in stored.getValue("location").jsonObject.keys)
		assertTrue("purpose" in stored.getValue("promptRequirement").jsonObject.keys)
		assertTrue("consents" in stored.getValue("explicitChoice").jsonObject.keys)
		assertFalse("subjectId" in written, "the envelope is not the wire")

		assertEquals(
			snapshot,
			C15tJson.storage.decodeFromString(SnapshotEnvelope.serializer(), written).snapshot,
			"the projection changed what a round trip through the store preserves",
		)
	}

	private fun choiceSnapshot(): ConsentSnapshot = snapshot(
		prompt = PromptRequirement(notice = true, acknowledge = true, purpose = PromptPurpose.INITIAL),
		choice = ExplicitChoice(
			consents = mapOf("functionality" to true, "marketing" to true, "measurement" to false),
			action = ConsentAction.CUSTOM,
			actionAt = ACTION_AT,
			fingerprint = CHOICE_FINGERPRINT,
		),
	)

	private fun snapshot(
		subject: ConsentSubject? = ConsentSubject(id = "sub_01H", externalId = "u-9"),
		location: ConsentLocation? = ConsentLocation(country = "DE", region = "BE", language = "de"),
		prompt: PromptRequirement = PromptRequirement.NONE,
		choice: ExplicitChoice? = null,
	): ConsentSnapshot = ConsentSnapshot(
		revision = 7,
		policyPending = false,
		ready = true,
		model = ConsentModel.OPT_IN,
		promptRequirement = prompt,
		effectivePermissions = ConsentState(necessary = true, functionality = true),
		explicitChoice = choice,
		resolution = PolicyResolution(
			status = PolicyResolution.STATUS_MATCHED,
			policyId = "pol_1",
			fingerprint = "9f2c",
		),
		policySnapshotToken = "tok_1",
		subject = subject,
		location = location,
		overrides = KernelOverrides(country = "DE", region = "BE", language = "de", gpc = null),
		nextDeadline = ACTION_AT + 86_400_000L,
		evaluatedAt = ACTION_AT,
		error = KernelError(code = "transport", message = "one save queued"),
	)

	private companion object {
		const val ACTION_AT = 1_770_000_000_000L
		const val CHOICE_FINGERPRINT = "a35ac43b3d435b98441c5c39ccb3879d59d813fd9185d5fa9e3cfc08385412a9"
	}
}
