package com.c15t.core.wire

import com.c15t.core.model.ConsentLocation
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.PromptPurpose
import com.c15t.core.model.PromptRequirement
import com.c15t.core.store.C15tJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject

/**
 * The snapshot as the React Native boundary reads it: the kernel's key names.
 *
 * `native/CONTRACT.md` says four objects on the snapshot belong to `@c15t/core` down
 * to their spelling, because the snapshot crosses to JavaScript as a JSON string and a
 * renamed key is invisible to a type declaration. Kotlin names those four its own way
 * -- `subject.id`, `location.country`/`region`, the notice/acknowledge/purpose triple,
 * `explicitChoice.consents` -- and those names stay correct everywhere they are stored.
 * This object is the one place allowed to translate them, and the only thing that may
 * cross the bridge with them changed.
 *
 * What it does not do:
 *
 * - Rename a stored field. [com.c15t.core.store.SnapshotEnvelope] is written with
 *   [ConsentSnapshot]'s own serializer, so an installed app still reads the envelope a
 *   previous build wrote. The projection here runs on the way out, never on the way in,
 *   and nothing reads it back.
 * - Decide anything. Every value comes from the snapshot it is handed; the four objects
 *   are re-spelled, never recomputed.
 *
 * The encoding rules -- every key present, nulls written explicitly -- are
 * [C15tJson.storage]'s, deliberately: the boundary and the envelope must disagree only
 * about the four names this object owns, not about which keys exist.
 *
 * @see com.c15t.core.store.SnapshotEnvelope for the stored spelling, which stays the
 * core's own business.
 */
object SnapshotWire {
	/** The snapshot fields whose key names come from the kernel. */
	private const val SUBJECT = "subject"
	private const val LOCATION = "location"
	private const val PROMPT_REQUIREMENT = "promptRequirement"
	private const val EXPLICIT_CHOICE = "explicitChoice"

	// subject
	private const val SUBJECT_ID = "subjectId"
	private const val EXTERNAL_ID = "externalId"

	// location
	private const val COUNTRY_CODE = "countryCode"
	private const val REGION_CODE = "regionCode"

	// promptRequirement
	private const val KIND = "kind"
	private const val REASON = "reason"
	private const val KIND_CHOICE = "choice"
	private const val KIND_NOTICE = "notice"
	private const val KIND_NONE = "none"
	private const val REASON_MISSING = "missing"
	private const val REASON_POLICY_CHANGED = "policy-changed"

	// explicitChoice
	private const val VERSION = "version"
	private const val CATEGORIES = "categories"
	private const val VALUE = "value"
	private const val CONFIRMED_AT = "confirmedAt"
	private const val BASIS = "basis"
	private const val FINGERPRINT = "fingerprint"
	private const val BASIS_CHOICE_V1 = "choice-v1"
	private const val BASIS_LEGACY_V2 = "legacy-v2"

	/**
	 * The key names the kernel uses inside each of the four objects.
	 *
	 * The writer spells these with the private constants above; they are public so a
	 * reader on either side of the bridge can assert against one list rather than carry
	 * its own copy of the vocabulary.
	 */
	val KERNEL_OBJECT_KEYS: Map<String, Set<String>> = mapOf(
		SUBJECT to setOf(SUBJECT_ID, EXTERNAL_ID),
		LOCATION to setOf(COUNTRY_CODE, REGION_CODE),
		PROMPT_REQUIREMENT to setOf(KIND, REASON),
		EXPLICIT_CHOICE to setOf(VERSION, CATEGORIES),
	)

	/**
	 * Names this build uses inside those objects that must never appear on the wire.
	 *
	 * `language` is under [LOCATION] because the language in effect belongs to
	 * `overrides.language`, where a device locale can supply it, and the kernel's
	 * location object has no key for it. Every name here is right where it is stored.
	 */
	val RETIRED_WIRE_OBJECT_KEYS: Map<String, Set<String>> = mapOf(
		SUBJECT to setOf("id"),
		LOCATION to setOf("country", "region", "language"),
		PROMPT_REQUIREMENT to setOf("notice", "acknowledge", "purpose"),
		EXPLICIT_CHOICE to setOf("consents", "action", "actionAt", FINGERPRINT),
	)

	/**
	 * Project [snapshot] into the object the bridge hands JavaScript.
	 *
	 * Every other key is carried through untouched, so an object the core owns keeps the
	 * core's shape.
	 *
	 * @param snapshot the live snapshot, from [com.c15t.core.C15t.snapshot] or a kernel.
	 * @returns a JSON object with all 22 snapshot keys, four of them re-spelled.
	 */
	fun toJsonElement(snapshot: ConsentSnapshot): JsonObject {
		val encoded = C15tJson.storage
			.encodeToJsonElement(ConsentSnapshot.serializer(), snapshot)
			.jsonObject
		// A LinkedHashMap replacement keeps each key where the model put it, so the
		// projection moves names and not layout. Key order carries no meaning on this
		// wire; keeping it stable just makes a diff of two payloads readable.
		val wire = LinkedHashMap<String, JsonElement>(encoded)
		wire[SUBJECT] = subjectOf(snapshot.subject)
		wire[LOCATION] = locationOf(snapshot.location)
		wire[PROMPT_REQUIREMENT] = promptOf(snapshot.promptRequirement)
		wire[EXPLICIT_CHOICE] = choiceOf(snapshot.explicitChoice)
		return JsonObject(wire)
	}

	/**
	 * [toJsonElement] as the string a synchronous module method returns.
	 *
	 * @param snapshot the live snapshot.
	 * @returns the JSON the JavaScript protocol parses.
	 */
	fun encodeToString(snapshot: ConsentSnapshot): String =
		C15tJson.storage.encodeToString(JsonObject.serializer(), toJsonElement(snapshot))

	/** `subjectId`, never `id`. An absent optional stays absent, as the kernel writes it. */
	private fun subjectOf(subject: ConsentSubject?): JsonElement {
		if (subject == null) {
			return JsonNull
		}
		return buildJsonObject {
			put(SUBJECT_ID, JsonPrimitive(subject.id))
			subject.externalId?.let { externalId -> put(EXTERNAL_ID, JsonPrimitive(externalId)) }
		}
	}

	/**
	 * `countryCode`/`regionCode`. Both keys are always there, holding null; `language`
	 * is not there at all, because the kernel's location object has no key for it.
	 */
	private fun locationOf(location: ConsentLocation?): JsonElement {
		if (location == null) {
			return JsonNull
		}
		return buildJsonObject {
			put(COUNTRY_CODE, nullable(location.country))
			put(REGION_CODE, nullable(location.region))
		}
	}

	/**
	 * The `{ kind, reason }` pair the kernel carries.
	 *
	 * `acknowledge` is the per-category decision, so it wins the pair: a policy that
	 * owes a choice owes the notice underneath it, and the kernel names the outer
	 * obligation. A prompt that owes nothing carries no `reason` key, which is what
	 * `PromptRequirement`'s `{ kind: "none" }` arm means.
	 */
	private fun promptOf(prompt: PromptRequirement): JsonElement = buildJsonObject {
		val kind = when {
			prompt.acknowledge -> KIND_CHOICE
			prompt.notice -> KIND_NOTICE
			else -> KIND_NONE
		}
		put(KIND, JsonPrimitive(kind))
		if (kind != KIND_NONE) {
			put(REASON, JsonPrimitive(reasonOf(prompt.purpose)))
		}
	}

	/**
	 * The kernel's reason for this core's `purpose`.
	 *
	 * `initial` means nothing was ever recorded, which is the kernel's `missing`.
	 * `update` means a record exists and no longer covers the policy, and this core does
	 * not keep apart the two reasons the kernel has for that: a receipt that lapsed, and
	 * a fingerprint that moved. It reports `policy-changed`, the arm that stays true
	 * whatever the evaluator found about age, and no fixture decides it.
	 */
	private fun reasonOf(purpose: PromptPurpose?): String = when (purpose) {
		null, PromptPurpose.INITIAL -> REASON_MISSING
		PromptPurpose.UPDATE -> REASON_POLICY_CHANGED
	}

	/**
	 * One receipt per category, which is what the kernel's `ExplicitChoice` holds.
	 *
	 * This core records one action time and one fingerprint for the whole commit, so
	 * every category in it repeats both. `action` has no counterpart and is dropped: the
	 * save body is where an all/necessary/custom answer travels.
	 */
	private fun choiceOf(choice: ExplicitChoice?): JsonElement {
		if (choice == null) {
			return JsonNull
		}
		return buildJsonObject {
			put(VERSION, JsonPrimitive(choice.version))
			put(CATEGORIES, buildJsonObject {
				choice.consents.toSortedMap().forEach { (category, value) ->
					put(category, buildJsonObject {
						put(VALUE, JsonPrimitive(value))
						put(CONFIRMED_AT, JsonPrimitive(choice.actionAt))
						put(BASIS, basisOf(choice.fingerprint))
					})
				}
			})
		}
	}

	/**
	 * Which policy contract a receipt was confirmed against.
	 *
	 * `choice-v1` binds to the choice-prompt fingerprint. A receipt with none cannot be
	 * bound to a contract this build knows, so it goes out as `legacy-v2`, the arm for a
	 * confirmation carrying no choice-v1 fingerprint. Either way a reader compares it
	 * against a fingerprint it does not have and asks again, which is the fail-closed
	 * answer.
	 */
	private fun basisOf(fingerprint: String?): JsonElement = buildJsonObject {
		if (fingerprint.isNullOrEmpty()) {
			put(KIND, JsonPrimitive(BASIS_LEGACY_V2))
		} else {
			put(KIND, JsonPrimitive(BASIS_CHOICE_V1))
			put(FINGERPRINT, JsonPrimitive(fingerprint))
		}
	}

	/** Write a null rather than omit the key, so the pair keeps both names. */
	private fun nullable(value: String?): JsonElement =
		if (value == null) JsonNull else JsonPrimitive(value)
}
