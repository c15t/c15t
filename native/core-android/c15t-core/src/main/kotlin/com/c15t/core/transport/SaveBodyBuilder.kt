package com.c15t.core.transport

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.SavePayload
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

/**
 * Builds the `POST /subjects` body.
 *
 * Port of `buildSubjectPostBody` in
 * `packages/core/src/transports/subject-body.ts`. Two representations of the same
 * act travel together on purpose:
 *
 * - `preferences` is the complete explicit map after the act, `necessary` plus
 * every category holding a receipt. It is never the effective permissions: a GPC
 * mask or a strict scope can deny a category the subject granted, and recording
 * the masked value would rewrite what the subject chose.
 * - `choice` carries only the categories this act confirmed, each with the
 * confirmation time and the policy basis it was made under, so a queued replay
 * resubmits identical receipts.
 *
 * Member order matches the TypeScript source exactly, so a body this build emits
 * is byte-comparable against the shared `native/protocol` fixtures.
 */
object SaveBodyBuilder {
	/**
	 * @param payload the queued action.
	 * @param domain the domain field, resolved by the caller.
	 */
	fun build(
		payload: SavePayload,
		domain: String,
	): JsonObject = buildJsonObject {
		put("consentAction", payload.consentAction.wireName)
		put("domain", domain)
		payload.user?.externalId?.let { put("externalSubjectId", it) }
		// The action time captured once by the core; a queued replay reuses it so
		// the backend derives the same consent id.
		put("givenAt", payload.givenAt)
		payload.user?.identityProvider?.let { put("identityProvider", it) }
		put("jurisdictionModel", payload.model.wireName)
		payload.user?.properties?.takeIf { it.isNotEmpty() }?.let { props ->
			putJsonObject("metadata") {
				putJsonObject("userProperties") {
					for ((key, value) in props) {
						put(key, value)
					}
				}
			}
		}
		payload.policySnapshotToken?.let { put("policySnapshotToken", it) }
		putJsonObject("preferences") {
			for ((category, value) in explicitPreferences(payload)) {
				put(category, value)
			}
		}
		put("subjectId", payload.subjectId)
		put("type", "cookie_banner")
		payload.uiSource?.let { put("uiSource", it.wireName) }
		confirmedChoice(payload)?.let { put("choice", it) }
		// No `tcString`. An `iab` rule is read and evaluated, but a TC String opens with a
		// CMP ID IAB Europe assigned, and this build holds no registered one: it reads
		// neither `cmpId` nor the vendor vectors a string would assert off `/init`, and
		// `packages/iab/src/tcf/cmp-defaults.ts` refuses to invent a default. `@c15t/core`
		// leaves the key off the body in the same position, with its IAB module absent.
		// The decision assertion goes on flat, not nested, and only when nothing
		// else already binds the write to a policy revision. `buildDecisionAssertion`
		// in `@c15t/core` returns nothing whenever a `policySnapshotToken` is
		// present, because the token is the stronger claim.
		for ((field, value) in decisionAssertion(payload)) {
			put(field, value)
		}
	}

	/** The complete explicit map: `necessary` plus every category with a receipt. */
	private val PREFERENCE_ORDER = listOf(
		ConsentCategory.FUNCTIONALITY,
		ConsentCategory.EXPERIENCE,
		ConsentCategory.MEASUREMENT,
		ConsentCategory.MARKETING,
	)

	private fun explicitPreferences(payload: SavePayload): Map<String, Boolean> {
		val preferences = LinkedHashMap<String, Boolean>()
		preferences["necessary"] = true
		val choice = payload.choice ?: return preferences
		for (category in PREFERENCE_ORDER) {
			// Insertion order follows OPTIONAL_CONSENT_CATEGORIES in @c15t/core.
			val wire = category.wireName
			if (choice.consents.containsKey(wire)) {
				preferences[wire] = choice.consents.getValue(wire)
			}
		}
		return preferences
	}

	/**
	 * Receipts for exactly the confirmed categories, or `null` when the payload
	 * holds no receipt or confirmed nothing, in which case the key is absent.
	 */
	private fun confirmedChoice(payload: SavePayload): JsonObject? {
		val choice = payload.choice ?: return null
		if (choice.consents.isEmpty() || payload.confirmed.categories.isEmpty()) {
			return null
		}
		val categories = LinkedHashMap<String, JsonObject>()
		for (wire in payload.confirmed.categories.keys) {
			val value = choice.consents[wire] ?: continue
			categories[wire] = buildJsonObject {
				putJsonObject("basis") {
					choice.fingerprint?.let { put("fingerprint", it) }
					put("kind", "choice-v1")
				}
				put("confirmedAt", choice.actionAt)
				put("value", value)
			}
		}
		if (categories.isEmpty()) {
			return null
		}
		return buildJsonObject {
			put("categories", JsonObject(categories))
			put("version", 3)
		}
	}

	/**
	 * The flat `policyId`/`fingerprint`/`country`/`region`/`language`/`gpc` claim a
	 * tokenless write carries, or an empty map when it must not be sent.
	 *
	 * Port of `buildDecisionAssertion`. A token already pins the write to a policy
	 * revision, so the claim adds nothing beside it. A null `policyId` says "nothing
	 * matched", which is a complete claim by itself; a non-null one has to bring the
	 * fingerprint it vouches for. `gpc` belongs in here with the rest: the backend
	 * recomputes the decision from these fields, and a save that dropped it reads as
	 * a decision made against a stale policy.
	 */
	private fun decisionAssertion(payload: SavePayload): Map<String, JsonElement> {
		val inputs = payload.decisionInputs ?: return emptyMap()
		if (payload.policySnapshotToken != null) {
			return emptyMap()
		}
		val policyId = inputs.policyId
		if (policyId != null && (policyId.isBlank() || inputs.fingerprint == null)) {
			return emptyMap()
		}
		return linkedMapOf(
			"policyId" to (policyId?.let(::JsonPrimitive) ?: JsonNull),
			"fingerprint" to (inputs.fingerprint?.let(::JsonPrimitive) ?: JsonNull),
			"country" to (inputs.country?.let(::JsonPrimitive) ?: JsonNull),
			"region" to (inputs.region?.let(::JsonPrimitive) ?: JsonNull),
			"language" to JsonPrimitive(inputs.language),
			"gpc" to JsonPrimitive(inputs.gpc),
		)
	}
}
