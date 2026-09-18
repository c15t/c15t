package com.c15t.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Consent model the runtime enforces.
 *
 * `iab` is a rule this core reads and evaluates: the categories it governs stay denied
 * until a valid explicit choice grants them, which is what the evaluator in `@c15t/core`
 * already does for `iab` and for `opt-in` alike. See [runtimeModel] for what the snapshot
 * reports while one is in force.
 */
@Serializable
enum class ConsentModel(val wireName: String) {
	@SerialName("opt-in")
	OPT_IN("opt-in"),

	@SerialName("opt-out")
	OPT_OUT("opt-out"),

	@SerialName("iab")
	IAB("iab"),

	@SerialName("none")
	NONE("none"),
	;

	/**
	 * The model this device reports while a rule of this kind is in force.
	 *
	 * Port of `deriveModel` in `packages/core/src/policy.ts`, with the web's `iabEnabled`
	 * argument answered for good: an IAB rule runs as `iab` on the web only once
	 * `@c15t/iab` is installed, and a device has nothing to install in that place. It has no
	 * registered CMP ID to put in a TC String, no per-vendor vector to assert, and no
	 * `IABTCF_*` bus to publish, so a snapshot reading `iab` would promise the vendor-side
	 * record this build cannot produce. The web's own answer for that situation is the
	 * honest one: the categories behave as `opt-in`, so the snapshot reports `opt-in` and so
	 * does the `jurisdictionModel` of a save built from it. The resolution still names the
	 * matched IAB policy, so nothing about which rule matched is hidden.
	 *
	 * A report, not a permission. Every category decision still reads the real rule on
	 * [com.c15t.core.policy.EvaluationPolicy.model].
	 */
	val runtimeModel: ConsentModel
		get() = if (this == IAB) OPT_IN else this

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
