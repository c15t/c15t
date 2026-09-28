package com.c15t.core.model

import kotlinx.serialization.Serializable

/**
 * Every category the c15t runtime knows about, in stable display order.
 *
 * Mirrors `CONSENT_CATEGORIES` in `packages/core/src/consent-record/types.ts`.
 * `necessary` is never a subject choice; it is always granted.
 */
enum class ConsentCategory(val wireName: String) {
	NECESSARY("necessary"),
	FUNCTIONALITY("functionality"),
	EXPERIENCE("experience"),
	MEASUREMENT("measurement"),
	MARKETING("marketing"),
	;

	/** `true` for the four categories a subject can decide on. */
	val optional: Boolean
		get() = this != NECESSARY

	companion object {
		/** Canonical (sorted) optional order used for hashing and wire maps. */
		val OPTIONAL: List<ConsentCategory> = listOf(EXPERIENCE, FUNCTIONALITY, MARKETING, MEASUREMENT)

		/** Parse a wire category name, returning `null` for unknown values. */
		fun fromWireName(value: String?): ConsentCategory? {
			if (value == null) {
				return null
			}
			return entries.firstOrNull { it.wireName == value }
		}
	}
}

/**
 * Boolean permission map over every category.
 *
 * This is the snapshot's `effectivePermissions`: the map gates consume. It is
 * immutable so a snapshot can be published with a single atomic write and read
 * without copying.
 */
@Serializable
data class ConsentState(
	val necessary: Boolean = true,
	val functionality: Boolean = false,
	val experience: Boolean = false,
	val measurement: Boolean = false,
	val marketing: Boolean = false,
) {
	/** Read the permission for [category]. */
	operator fun get(category: ConsentCategory): Boolean = when (category) {
		ConsentCategory.NECESSARY -> necessary
		ConsentCategory.FUNCTIONALITY -> functionality
		ConsentCategory.EXPERIENCE -> experience
		ConsentCategory.MEASUREMENT -> measurement
		ConsentCategory.MARKETING -> marketing
	}

	/** Return a copy with one category changed. */
	fun with(
		category: ConsentCategory,
		value: Boolean,
	): ConsentState = when (category) {
		ConsentCategory.NECESSARY -> copy(necessary = value)
		ConsentCategory.FUNCTIONALITY -> copy(functionality = value)
		ConsentCategory.EXPERIENCE -> copy(experience = value)
		ConsentCategory.MEASUREMENT -> copy(measurement = value)
		ConsentCategory.MARKETING -> copy(marketing = value)
	}

	/** Optional categories currently allowed, in canonical order. */
	val allowedOptional: List<ConsentCategory>
		get() = ConsentCategory.OPTIONAL.filter { this[it] }

	companion object {
		/** `necessary` only. The state every fail-closed path returns. */
		val DENY_ALL = ConsentState(
			necessary = true,
			functionality = false,
			experience = false,
			measurement = false,
			marketing = false,
		)

		/** Every category allowed. Only reachable through an `opt-out`/`none` policy. */
		val ALLOW_ALL = ConsentState(
			necessary = true,
			functionality = true,
			experience = true,
			measurement = true,
			marketing = true,
		)
	}
}
