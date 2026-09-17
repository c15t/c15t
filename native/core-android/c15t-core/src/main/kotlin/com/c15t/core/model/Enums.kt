package com.c15t.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Consent model the runtime enforces.
 *
 * The `iab` model is out of scope for this phase: a wire value of `iab` is not
 * representable here, so the strict policy reader rejects it and the core fails
 * closed instead of guessing permissions.
 */
@Serializable
enum class ConsentModel(val wireName: String) {
	@SerialName("opt-in")
	OPT_IN("opt-in"),

	@SerialName("opt-out")
	OPT_OUT("opt-out"),

	@SerialName("none")
	NONE("none"),
	;

	companion object {
		/** Parse a wire model name, returning `null` for unknown values. */
		fun fromWireName(value: String?): ConsentModel? = entries.firstOrNull { it.wireName == value }
	}
}

/** Which UI surface the adapter should render. `null` means undecided. */
@Serializable
enum class ActiveUI(val wireName: String) {
	@SerialName("none")
	NONE("none"),

	@SerialName("banner")
	BANNER("banner"),

	@SerialName("dialog")
	DIALOG("dialog"),
	;

	companion object {
		/** Parse a wire value, returning `null` for unknown values. */
		fun fromWireName(value: String?): ActiveUI? = entries.firstOrNull { it.wireName == value }
	}
}

/** The action a consent commit represents. */
@Serializable
enum class ConsentAction(val wireName: String) {
	@SerialName("all")
	ALL("all"),

	@SerialName("necessary")
	NECESSARY("necessary"),

	@SerialName("custom")
	CUSTOM("custom"),
	;

	companion object {
		/** Parse a wire value, returning `null` for unknown values. */
		fun fromWireName(value: String?): ConsentAction? = entries.firstOrNull { it.wireName == value }
	}
}

/** Why the current prompt is being shown. */
@Serializable
enum class PromptPurpose(val wireName: String) {
	@SerialName("initial")
	INITIAL("initial"),

	@SerialName("update")
	UPDATE("update"),
	;

	companion object {
		/** Parse a wire value, returning `null` for unknown values. */
		fun fromWireName(value: String?): PromptPurpose? = entries.firstOrNull { it.wireName == value }
	}
}
