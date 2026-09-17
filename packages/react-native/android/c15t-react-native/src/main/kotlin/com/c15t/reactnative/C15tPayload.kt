package com.c15t.reactnative

import com.c15t.core.CommitIntent
import com.c15t.core.CommitResult
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.store.C15tJson
import com.c15t.core.transport.C15tProtocol
import com.c15t.core.wire.SnapshotWire
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put

/**
 * Outcome of reading a `NativeOverridesInput` document.
 *
 * Refusal carries the sentence the host hears, because the two ways a document fails
 * need different fixes: a document that is not an override set at all is a bad call,
 * while one that names a retired field is a host app still speaking the old protocol.
 * Answering the second with the first message would send the integrator looking in the
 * wrong file.
 */
sealed interface OverridesRead {
	/** The document was readable. Apply [overrides] as a replacement. */
	data class Applied(val overrides: KernelOverrides) : OverridesRead

	/** The document was refused, with the [code] and [message] the host receives. */
	data class Refused(val code: String, val message: String) : OverridesRead
}

/**
 * The JSON the bridge speaks, with no React Native types anywhere in it.
 *
 * Field names come from `src/protocol` on the JavaScript side, which owns the wire
 * format. Keeping the encoders and decoders free of `com.facebook.react` imports is
 * what lets the whole boundary be unit tested on a plain JVM, and it keeps one
 * encoding shared by the module and the tests instead of two that can disagree.
 */
object C15tPayload {
	/** Protocol this native build speaks. */
	const val PROTOCOL_VERSION = 1L

	/** Oldest protocol this native build accepts from a JavaScript package. */
	const val MIN_SUPPORTED_PROTOCOL_VERSION = 1L

	/** Newest protocol this native build accepts from a JavaScript package. */
	const val MAX_SUPPORTED_PROTOCOL_VERSION = 1L

	/** Language used when neither the app nor the backend resolved one. */
	const val DEFAULT_LANGUAGE = "en"

	/** Reported when the core was never installed, so nothing can be recorded. */
	const val REASON_NOT_BOOTSTRAPPED = "not-bootstrapped"

	/** Reported for an intent this build cannot read. */
	const val REASON_INVALID_INTENT = "invalid-intent"

	/** Rejection code for a `setOverrides` document this build cannot read. */
	const val REJECT_OVERRIDES = "C15T_OVERRIDES_REJECTED"

	/**
	 * Rejection code for a `setOverrides` document that names a retired field.
	 *
	 * Separate from [REJECT_OVERRIDES] on purpose: a host that sees the retired code
	 * has one line to change, while the generic code means the document itself is
	 * malformed.
	 */
	const val REJECT_OVERRIDES_RETIRED = "C15T_OVERRIDES_RETIRED"

	/** What a host hears when no core exists, naming both ways to fix it. */
	const val MESSAGE_NOT_BOOTSTRAPPED =
		"c15t has no backend configured, so the consent core was not started. Declare " +
			"com.c15t.PORTAL_URL in the manifest, or call C15t.bootstrap() yourself " +
			"before React Native initializes."

	/** The override keys `NativeOverridesInput` declares, in wire order. */
	private val OVERRIDE_INPUT_KEYS = setOf("country", "region", "language", "gpc")

	/** The key `NativeOverrides` always carries, even when the core has no value. */
	private val OVERRIDE_NULL_KEYS = listOf("country", "region", "gpc")

	/**
	 * Field names a host app may still send that this build does not model.
	 *
	 * `native/CONTRACT.md` first described a `test` override and an `msa` privacy
	 * signal. Neither exists in the kernel: publisher test mode is a client option
	 * that never reaches a save body, and v3 has no `msa` signal. `KernelOverrides`
	 * has no member for either, so accepting the document would drop what the caller
	 * asked for and leave the app believing a mode was on that nothing turned on.
	 * [com.c15t.core.store.RetiredWireFields] refuses the same names in a stored
	 * envelope; this refuses them on the way in, and says which one.
	 */
	private val RETIRED_OVERRIDE_NAMES = listOf("test", "msa")

	/**
	 * Retired keys that must never reach the wire.
	 *
	 * The core's encoder cannot produce these today, and a stored envelope carrying
	 * them is refused before a snapshot is built. This is the last gate in front of
	 * JavaScript, kept because a retired name on the wire would read as a real field.
	 */
	private val RETIRED_WIRE_KEYS = setOf("test", "msa")

	private const val MAX_ECHO_CHARS = 200

	/**
	 * The `BootstrapPayload` handshake, read once per provider mount.
	 *
	 * @param snapshot the current snapshot, which carries the subject id.
	 * @param hasStoredSnapshot whether hydration found a stored envelope.
	 * @param sdkVersion native SDK version, also sent as `x-c15t-version`.
	 */
	fun bootstrap(
		snapshot: ConsentSnapshot,
		hasStoredSnapshot: Boolean,
		sdkVersion: String = C15tProtocol.DEFAULT_SDK_VERSION,
	): String = encode(
		buildJsonObject {
			put("protocolVersion", PROTOCOL_VERSION)
			put("minSupportedProtocolVersion", MIN_SUPPORTED_PROTOCOL_VERSION)
			put("maxSupportedProtocolVersion", MAX_SUPPORTED_PROTOCOL_VERSION)
			put("nativeSdkVersion", sdkVersion)
			putElement("subjectId", snapshot.subject?.id)
			put("hasStoredSnapshot", hasStoredSnapshot)
		},
	)

	/**
	 * The `ConsentSnapshot` wire form.
	 *
	 * [SnapshotWire] produces the body, so the four objects the kernel owns the key names
	 * of -- `subject`, `location`, `promptRequirement`, `explicitChoice` -- go out with the
	 * kernel's spelling rather than this core's. The boundary is a JSON string, so a key
	 * renamed on this side is invisible to the TypeScript that reads it: the declared type
	 * says `subject.subjectId`, the device sends `subject.id`, and the app reads
	 * `undefined` with nothing failing anywhere.
	 *
	 * The stored envelope therefore disagrees with this payload on exactly those four
	 * objects, deliberately: the envelope is the device's own format and an installed app
	 * has to keep reading the bytes it wrote before the upgrade, while this is the kernel's
	 * format because it crosses into JavaScript as text. Do not "fix" the disagreement.
	 *
	 * Two fields are then conformed to the JavaScript types, both
	 * because the kernel models them more loosely than the protocol does:
	 * `overrides.language` is never null on the wire, since the protocol resolves to
	 * exactly one translation bundle and a missing language falls back to the device
	 * locale and then to `en`; and every override the protocol declares as
	 * `T | null` is present as an explicit null, so a JavaScript reader never has to
	 * branch on presence.
	 *
	 * `privacySignals.gpc` goes out untouched as the `detected` / `override` /
	 * `active` triple the core computes. It is what makes a GPC denial explainable
	 * from the payload alone: `active` is the reason a category is denied, and
	 * `override` says whether the app or the device caused it.
	 */
	fun snapshot(
		snapshot: ConsentSnapshot,
		fallbackLanguage: String = DEFAULT_LANGUAGE,
	): String {
		val wire = SnapshotWire.toJsonElement(snapshot)
		val overrides = wire["overrides"] as? JsonObject ?: JsonObject(emptyMap())
		val language = optString(overrides["language"]) ?: fallbackLanguage.ifBlank { DEFAULT_LANGUAGE }

		val conformedOverrides = LinkedHashMap<String, JsonElement>(overrides.size + OVERRIDE_NULL_KEYS.size)
		for ((key, value) in overrides) {
			if (key !in RETIRED_WIRE_KEYS) {
				conformedOverrides[key] = value
			}
		}
		conformedOverrides["language"] = JsonPrimitive(language)
		for (key in OVERRIDE_NULL_KEYS) {
			if (!conformedOverrides.containsKey(key)) {
				conformedOverrides[key] = JsonNull
			}
		}

		val conformed = LinkedHashMap<String, JsonElement>(wire.size)
		for ((key, value) in wire) {
			if (key != "overrides") {
				conformed[key] = value
			}
		}
		conformed["overrides"] = JsonObject(conformedOverrides)
		return encode(JsonObject(conformed))
	}

	/**
	 * The `CommitResult` for [result].
	 *
	 * `confirmed` is a list of category names on the wire, so the kernel's map becomes
	 * its keys: a recorded denial is a receipt in the same way an acceptance is, and
	 * the JavaScript side reads only the names.
	 *
	 * A rejection's `error.code` is copied to `reason`, which is how
	 * `CommitFailureReason` reaches JavaScript. `not-bootstrapped` arrives here when
	 * the core went away between the module's check and the save.
	 */
	fun commitResult(
		result: CommitResult,
		snapshot: ConsentSnapshot,
	): String = encode(
		buildJsonObject {
			put("ok", result.ok)
			if (result.ok) {
				put("revision", result.revision)
			} else {
				put("revision", JsonNull)
			}
			put("confirmed", JsonArray(result.confirmed.keys.map { JsonPrimitive(it) }))
			putElement("subjectId", snapshot.subject?.id)
			put("queued", result.queued)
			put("delivered", result.delivered)
			result.error?.let { put("reason", it.code) }
		},
	)

	/** The failure shape for an intent that could not be read. */
	fun invalidIntent(raw: String?): String = encode(
		buildJsonObject {
			put("ok", false)
			put("revision", JsonNull)
			put("confirmed", JsonArray(emptyList()))
			put("subjectId", JsonNull)
			put("queued", false)
			put("reason", REASON_INVALID_INTENT)
			put("detail", (raw ?: "").take(MAX_ECHO_CHARS))
		},
	)

	/** The failure shape for a core that was never installed. */
	fun notBootstrapped(): String = encode(
		buildJsonObject {
			put("ok", false)
			put("revision", JsonNull)
			put("confirmed", JsonArray(emptyList()))
			put("subjectId", JsonNull)
			put("queued", false)
			put("reason", REASON_NOT_BOOTSTRAPPED)
		},
	)

	/**
	 * The `TrackingAuthorizationPayload` both tracking calls resolve with.
	 *
	 * One field, because the arm is the whole answer. There is no consent field here and
	 * there never will be: this carries what the platform said, and on Android what it
	 * says is that it has no question.
	 */
	fun trackingAuthorization(status: C15tTrackingAuthorization): String = encode(
		buildJsonObject {
			put("status", status.wireValue)
		},
	)

	/** A `snapshot` event: the new revision and the dirty flag, nothing else. */
	fun snapshotEvent(revision: Long): String = encode(
		buildJsonObject {
			put("revision", revision)
			put("dirty", true)
		},
	)

	/** An `initialized` event, emitted once when the first policy resolves. */
	fun initializedEvent(revision: Long): String = encode(
		buildJsonObject {
			put("revision", revision)
			put("dirty", true)
			put("ready", true)
			put("policyPending", false)
		},
	)

	/** An `error` event, in the `NativeSnapshotError` shape. */
	fun errorEvent(error: KernelError): String = encode(
		buildJsonObject {
			put("code", error.code)
			put("message", error.message)
		},
	)

	/**
	 * Read a `CommitIntent`.
	 *
	 * Anything unreadable, or outside the three actions, returns `null` and the caller
	 * answers [REASON_INVALID_INTENT]. A commit is evidence, so a malformed one is
	 * refused rather than rounded to the nearest action.
	 */
	fun parseCommitIntent(raw: String?): CommitIntent? {
		val body = parseObject(raw) ?: return null
		return when (optString(body["action"])) {
			"all" -> CommitIntent.All
			"necessary" -> CommitIntent.Necessary
			"explicit" -> {
				val consents = body["consents"] as? JsonObject ?: return null
				val parsed = LinkedHashMap<ConsentCategory, Boolean>(consents.size)
				for ((name, value) in consents) {
					val category = ConsentCategory.fromWireName(name) ?: return null
					val granted = optBoolean(value) ?: return null
					if (!category.optional) {
						// `necessary` is nobody's choice, so an intent offering it is not
						// one this build should apply.
						return null
					}
					parsed[category] = granted
				}
				CommitIntent.Explicit(parsed)
			}

			else -> null
		}
	}

	/**
	 * Read a `NativeOverridesInput` into a complete override record.
	 *
	 * The JavaScript side distinguishes omitted from explicit null: omitted keeps the
	 * current value, null clears it. [KernelOverrides] cannot express the difference,
	 * because both are a null member, so the merge happens here and the caller applies
	 * the result as a replacement.
	 *
	 * Two documents are refused rather than approximated. One that names no override
	 * at all is not an override document, and applying it would wipe a language the app
	 * relies on. One that names a retired field is a host still on the old protocol,
	 * and guessing past it would leave that app believing an override is in force.
	 *
	 * @param raw the JSON document from `setOverrides`.
	 * @param current the overrides in effect, normally from the live snapshot.
	 * @return [OverridesRead.Applied] with the record to apply, or
	 *   [OverridesRead.Refused] naming what the host has to change.
	 */
	fun parseOverrides(
		raw: String?,
		current: KernelOverrides,
	): OverridesRead {
		val body = parseObject(raw)
			?: return OverridesRead.Refused(
				REJECT_OVERRIDES,
				"the overrides document could not be read, so nothing was changed",
			)

		val retired = RETIRED_OVERRIDE_NAMES.filter { body.containsKey(it) }
		if (retired.isNotEmpty()) {
			return OverridesRead.Refused(
				REJECT_OVERRIDES_RETIRED,
				"the overrides document carries the retired field(s) " + retired.joinToString() +
					", which this build does not reinterpret: publisher test mode is a client " +
					"option and not an override, and v3 has no msa privacy signal. Send country, " +
					"region, language, and gpc instead; nothing was changed.",
			)
		}

		if (body.keys.none { it in OVERRIDE_INPUT_KEYS }) {
			return OverridesRead.Refused(
				REJECT_OVERRIDES,
				"the overrides document names none of country, region, language, or gpc, so " +
					"nothing was changed",
			)
		}

		if (body.containsKey("gpc") && body["gpc"] !== JsonNull && optBoolean(body["gpc"]) == null) {
			// `gpc` decides whether a standing directive applies, so a value this build
			// cannot read is refused rather than turned into either answer.
			return OverridesRead.Refused(
				REJECT_OVERRIDES,
				"the overrides document carries a gpc that is neither true, false, nor null, " +
					"so nothing was changed",
			)
		}

		return OverridesRead.Applied(
			KernelOverrides(
				country = if (body.containsKey("country")) optString(body["country"]) else current.country,
				region = if (body.containsKey("region")) optString(body["region"]) else current.region,
				language = if (body.containsKey("language")) optString(body["language"]) else current.language,
				gpc = when {
					!body.containsKey("gpc") -> current.gpc
					body["gpc"] === JsonNull -> null
					else -> optBoolean(body["gpc"])
				},
			),
		)
	}

	private fun encode(body: JsonObject): String = C15tJson.storage.encodeToString(JsonObject.serializer(), body)

	private fun parseObject(raw: String?): JsonObject? {
		if (raw.isNullOrBlank()) {
			return null
		}
		return try {
			C15tJson.wire.parseToJsonElement(raw).jsonObject
		} catch (_: Exception) {
			null
		}
	}

	private fun optString(element: JsonElement?): String? = (element as? JsonPrimitive)
		?.takeIf { it.isString }
		?.content

	private fun optBoolean(element: JsonElement?): Boolean? = (element as? JsonPrimitive)?.booleanOrNull

	private fun JsonObjectBuilder.putElement(
		key: String,
		value: String?,
	) {
		if (value == null) {
			put(key, JsonNull)
		} else {
			put(key, value)
		}
	}
}
