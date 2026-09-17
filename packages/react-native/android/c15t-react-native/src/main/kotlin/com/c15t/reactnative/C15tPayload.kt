package com.c15t.reactnative

import com.c15t.core.CommitIntent
import com.c15t.core.CommitResult
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelOverrides
import com.c15t.core.store.C15tJson
import com.c15t.core.transport.C15tProtocol
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

	/** Wire value for the kernel's publisher test mode, which it models as a boolean. */
	const val TEST_MODE_GPC = "gpc"

	/** Reported when the core was never installed, so nothing can be recorded. */
	const val REASON_NOT_BOOTSTRAPPED = "not-bootstrapped"

	/** Reported for an intent this build cannot read. */
	const val REASON_INVALID_INTENT = "invalid-intent"

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
	 * The core's own encoder produces the body, so the wire and the stored envelope
	 * cannot drift apart. Two fields are then conformed to the JavaScript types, both
	 * because the kernel models them more loosely than the protocol does:
	 * `overrides.language` is never null on the wire, since the protocol resolves to
	 * exactly one translation bundle and a missing language falls back to the device
	 * locale and then to `en`; and `overrides.test` is a string there rather than a
	 * boolean, so the kernel's flag is reported as [TEST_MODE_GPC] rather than `true`.
	 */
	fun snapshot(
		snapshot: ConsentSnapshot,
		fallbackLanguage: String = DEFAULT_LANGUAGE,
	): String {
		val encoded = C15tJson.storage.encodeToString(ConsentSnapshot.serializer(), snapshot)
		val wire = C15tJson.wire.parseToJsonElement(encoded).jsonObject
		val overrides = wire["overrides"] as? JsonObject ?: JsonObject(emptyMap())
		val language = optString(overrides["language"]) ?: fallbackLanguage.ifBlank { DEFAULT_LANGUAGE }
		val test: JsonElement = when (optBoolean(overrides["test"])) {
			true -> JsonPrimitive(TEST_MODE_GPC)
			else -> JsonNull
		}
		val conformedOverrides = LinkedHashMap<String, JsonElement>(overrides.size)
		for ((key, value) in overrides) {
			if (key != "language" && key != "test") {
				conformedOverrides[key] = value
			}
		}
		conformedOverrides["language"] = JsonPrimitive(language)
		conformedOverrides["test"] = test

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
	 * @param raw the JSON document from `setOverrides`.
	 * @param current the overrides in effect, normally from the live snapshot.
	 * @return the record to apply, or `null` when [raw] is not an override document.
	 */
	fun parseOverrides(
		raw: String?,
		current: KernelOverrides,
	): KernelOverrides? {
		val body = parseObject(raw) ?: return null
		val known = setOf("country", "region", "language", "test")
		if (body.keys.none { it in known }) {
			// Not an override document. Applying it would wipe a language the app is
			// relying on, which is a worse outcome than ignoring a bad call.
			return null
		}
		return KernelOverrides(
			country = if (body.containsKey("country")) optString(body["country"]) else current.country,
			region = if (body.containsKey("region")) optString(body["region"]) else current.region,
			language = if (body.containsKey("language")) optString(body["language"]) else current.language,
			test = when {
				!body.containsKey("test") -> current.test
				body["test"] === JsonNull -> null
				else -> optBoolean(body["test"]) ?: body["test"]?.let { true }
			},
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
