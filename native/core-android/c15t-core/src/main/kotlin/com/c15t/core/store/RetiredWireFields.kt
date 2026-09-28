package com.c15t.core.store

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Guard against stored envelopes written before the protocol was corrected.
 *
 * `native/CONTRACT.md` first described overrides with a `test` field and privacy
 * signals as a `gpc`/`msa` boolean pair. Neither exists in the kernel, so a device
 * holding an envelope in that shape has stored something this build cannot name.
 * Reinterpreting is the wrong answer: `test` was never a GPC override, and a
 * boolean `gpc` cannot say whether the app or the device caused it. Serving a
 * permission derived from a guessed field is what contract rule 5 forbids.
 *
 * The storage codec refuses any key it does not model, so these names are already
 * unreadable on shape alone. [assertReadable] stays because the failure has to say
 * which build wrote the payload and why it is being dropped rather than name an
 * unexpected token, and because it catches the retired shape one step earlier, before
 * a decoder has decided which half of the object to keep. It throws, and [C15tStore]
 * turns that into `null`, which the kernel answers with deny-all and `policyPending`
 * until the next `/init` resolves a real policy. The subject id lives in its own
 * preference key, so this does not cost the device its identity.
 *
 * The write queue is deliberately not screened. A queued payload's retired
 * `overrides.test` never reached the wire, and the queued `decisionInputs.gpc` is
 * spelled the same in both shapes, so dropping a stored consent action to police it
 * would be a worse outcome than replaying the same bytes.
 */
object RetiredWireFields {
	/** Throw when [raw] carries a field this build no longer models. */
	fun assertReadable(json: Json, raw: String) {
		val root = json.parseToJsonElement(raw) as? JsonObject ?: return
		val retired = retiredIn(root)
		if (retired.isNotEmpty()) {
			throw IllegalArgumentException(
				"stored value carries the retired field(s) ${retired.joinToString()} , which this " +
					"build does not reinterpret: a snapshot written by an older build cannot be " +
					"read; consent resets to deny-all and the next /init resolves it again"
			)
		}
	}

	/**
	 * Paths under [root] that name a retired field.
	 *
	 * The stored root is a [SnapshotEnvelope], so the fields to look for live one
	 * level down under `snapshot`. Both levels are checked: a caller that hands over a
	 * bare snapshot gets the same answer as the store handing over the envelope, and a
	 * retired name is refused wherever it sits.
	 */
	fun retiredIn(root: JsonObject): List<String> = buildList {
		addAll(namesIn(root))
		(root["snapshot"] as? JsonObject)?.let { snapshot ->
			for (name in namesIn(snapshot)) {
				add("snapshot.$name")
			}
		}
	}

	/** Retired field names in an object that is, or holds, a snapshot. */
	private fun namesIn(obj: JsonObject): List<String> = buildList {
		(obj["overrides"] as? JsonObject)?.takeIf { "test" in it }?.let { add("overrides.test") }
		val signals = obj["privacySignals"] as? JsonObject
		if (signals != null) {
			if ("msa" in signals) {
				add("privacySignals.msa")
			}
			// A bare boolean `gpc` is the retired shape; the current one is an object.
			if ((signals["gpc"] as? JsonPrimitive)?.contentOrNull?.toBooleanStrictOrNull() != null) {
				add("privacySignals.gpc")
			}
		}
	}
}
