package com.c15t.core.transport

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.SavePayload
import kotlinx.serialization.json.JsonObject
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
}
