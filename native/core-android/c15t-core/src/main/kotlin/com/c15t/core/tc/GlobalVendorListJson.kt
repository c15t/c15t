package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Reads `/init`'s `gvl` key, and hands the same document back out for a bridge.
 *
 * The acceptance rules are `packages/iab/src/tcf/fetch-gvl.ts`'s, field for field. That is the
 * client half of the web, and the half that decides whether a device ends up holding a list at all:
 * the backend embeds `gvl` only when the matched policy's model is `iab`
 * (`packages/backend/src/http/init.ts`), and the client then refuses the list unless
 * `vendorListVersion`, `purposes` and `vendors` are present and `tcfPolicyVersion` is a safe integer
 * of at least 1. Everything else on the document is tolerated, exactly as it is there.
 *
 * Why those keys and not the whole schema, when the backend validated the document against
 * `globalVendorListSchema` before embedding it: these four are the ones a reader cannot work around.
 * `purposes` and `vendors` are what a disclosure is drawn from, `vendorListVersion` is the number a
 * TC String writes into `VendorListVersion`, and `tcfPolicyVersion` is where a TC String derives
 * `TcfPolicyVersion` from rather than from configuration -- which is why [TcVendorList] takes both
 * from the list. A list missing one of them cannot be encoded against, and a device that kept a
 * partial one would be reading its dialog out of a document it should never have accepted. The rest
 * of the schema is display data, and a missing `descriptionLegal` is no reason to tell a subject
 * nothing about a thousand vendors.
 *
 * Refusal is silent, on purpose. `fetchGVL` throws and every caller treats a thrown fetch as "no
 * list today"; contract rule 5 says a native core may not invent a permission from an unreadable
 * wire value, and it never says the core must stop serving the policy it did read. A device on a
 * list-less `/init` therefore behaves exactly as a device whose backend has IAB switched off: the
 * categories, the prompt, and every save body still work, and nothing new can fail.
 * [com.c15t.core.transport.MappedInit.gvl] answers null for both the absent and the refused case,
 * the kernel latches, and so a refused list cannot take back a list the device already had either.
 */
object GlobalVendorListJson {
	/**
	 * Format for a body that leaves this process: the RN bridge. Nothing stored uses it.
	 *
	 * `encodeDefaults = false` is a shape decision and not tidiness. The web document leaves its
	 * `v.optional(...)` fields out and its readers cope with the absence -- `vendor.purposes || []`
	 * in `dialog-data.ts` -- so a body that wrote `"purposes": []` for every vendor that never
	 * declared purposes would be asserting something about that vendor the list never said. Under
	 * this format a null optional key is not written at all, and `gvlSpecificationVersion` and
	 * `lastUpdated`, which the acceptance rules above do not require, come back only if the served
	 * document carried them.
	 *
	 * The projection is also the only place the difference can land. The envelope stores a typed
	 * model and not these bytes, and a typed field holds one value for a served `null` and for a
	 * missing key; `cookieMaxAgeSeconds` is the only key a real document writes that way, and the
	 * schema calls it optional, so both readings mean the same thing to every reader on either
	 * side. `a served null drops only its own key` grades that collapse and its limits.
	 *
	 * The other thing that does not survive is a record shaped so this model cannot name it, and there
	 * the answer is the whole list rather than one key -- where `fetchGVL` keeps a list whose display
	 * half is unreadable and lets `dialog-data.ts` render whatever falls out. That tightening is
	 * unreachable on the path this SDK is fed: `packages/backend/src/http/gvl.ts` parses the upstream
	 * document against `globalVendorListSchema` before embedding it, so the backend cannot embed a
	 * `stacks` that turned out to be a string. Reading such a document partly is the alternative, and
	 * it is worse -- a record dropped on the way through is a vendor the encoder then treats as
	 * unknown, which empties an honest vendor's signals rather than losing a label. Refusing to serve
	 * a document this build cannot read whole is what contract rule 5 asks for; guessing at a display
	 * record is not. Both differences are graded by name in [GlobalVendorListShapeTest] rather than
	 * left as prose.
	 */
	private val wire: Json = Json {
		encodeDefaults = false
		explicitNulls = false
		ignoreUnknownKeys = true
	}

	/**
	 * The list an `/init` success body carried, or null when it carried none worth holding.
	 *
	 * Never throws. A `gvl` that is absent, not an object, missing a key the acceptance rules ask
	 * for, or shaped so this model cannot name it all answer null, which is the same answer as "IAB
	 * is off". A caller holding a list must not clear it on this null -- the latch that keeps that
	 * promise is in [com.c15t.core.C15tKernel.runInit].
	 */
	fun fromInitBody(body: JsonObject?): GlobalVendorList? = read(body?.get(GVL_KEY))

	/**
	 * [fromInitBody]'s one-step half: a document that is already the list, as the web's own
	 * `fetchGVL` has it after it unwraps `payload.gvl`.
	 */
	fun read(element: JsonElement?): GlobalVendorList? {
		val document = element as? JsonObject ?: return null
		if (!isAcceptable(document)) {
			return null
		}
		return try {
			wire.decodeFromJsonElement(GlobalVendorList.serializer(), document)
		} catch (_: Exception) {
			// The keys the reference asks for are present and answerable, and something deeper is not
			// a document: a `purposes` that turned out to be an array, a vendor key that is not a
			// number, a name that is a number. Refusing the whole list is contract rule 5. Keeping
			// the half that parsed would mean encoding a TC String against a vendor list this build
			// read only part of, and a half-read list is how a signal gets written for a company the
			// subject was never shown.
			null
		}
	}

	/**
	 * `fetchGVL`'s acceptance test, read off the raw document rather than the decoded model.
	 *
	 * Both conditions are about the document the producer wrote: `!gvl.vendorListVersion` is
	 * truthiness, so a list claiming version zero is refused there and must be refused here, and
	 * `Number.isSafeInteger(gvl.tcfPolicyVersion)` asks about the written value before any model gets
	 * a chance to widen or round it.
	 */
	private fun isAcceptable(document: JsonObject): Boolean {
		val listVersion = document.wholeNumberOrNull(VENDOR_LIST_VERSION_KEY) ?: return false
		if (listVersion == 0L) {
			return false
		}
		if (document["purposes"] !is JsonObject) {
			return false
		}
		if (document["vendors"] !is JsonObject) {
			return false
		}
		val policyVersion = document.wholeNumberOrNull(TCF_POLICY_VERSION_KEY) ?: return false
		return policyVersion >= MINIMUM_TCF_POLICY_VERSION
	}

	/**
	 * The served document again, in the shape it arrived in.
	 *
	 * This is the body a bridge sends. Every key name in it is `globalVendorListSchema`'s, the
	 * numbered records stay objects keyed by id rather than becoming arrays, and keys the document
	 * left out stay out -- see [GlobalVendorList] for why a mobile-only spelling is not on the table.
	 */
	fun toJsonElement(vendorList: GlobalVendorList): JsonObject =
		wire.encodeToJsonElement(GlobalVendorList.serializer(), vendorList) as JsonObject

	/** [toJsonElement] as text, for a bridge that forwards a string. */
	fun toJson(vendorList: GlobalVendorList): String =
		wire.encodeToString(GlobalVendorList.serializer(), vendorList)

	/** `/init`'s key for the list, which [fromInitBody] reads. */
	const val GVL_KEY = "gvl"

	/**
	 * The floor `fetchGVL` refuses below.
	 *
	 * `Number.isSafeInteger(x) && x >= 1`: TCF policy revisions count up from 1 and there is no
	 * revision zero to grade a string against, and the safe-integer half is [wholeNumberOrNull].
	 */
	const val MINIMUM_TCF_POLICY_VERSION = 1L

	private const val VENDOR_LIST_VERSION_KEY = "vendorListVersion"
	private const val TCF_POLICY_VERSION_KEY = "tcfPolicyVersion"

	/**
	 * A JSON number read as a whole number, or null when it is not one.
	 *
	 * `Number.isSafeInteger` is the reference's test because a JavaScript number past 2^53 has
	 * stopped being an integer, so the range check stays even though a `Long` would hold the value
	 * exactly: accepting what the reference refuses would keep a list the web threw away, and every
	 * number this check gates is a version number nowhere near the limit anyway.
	 *
	 * A quoted number reads as absent, which is what the reference does with one: `"5"` is truthy, so
	 * it passes the `!gvl.vendorListVersion` half, and then fails `Number.isSafeInteger`, so the
	 * document is refused. Parsing it as a number here would accept a list the web discards.
	 */
	private fun JsonObject.wholeNumberOrNull(key: String): Long? {
		val primitive = this[key] as? JsonPrimitive ?: return null
		if (primitive.isString) {
			return null
		}
		val content = primitive.contentOrNull ?: return null
		val value = content.toDoubleOrNull() ?: return null
		if (!value.isFinite() || value != Math.floor(value)) {
			return null
		}
		return if (value in -MAX_SAFE_INTEGER..MAX_SAFE_INTEGER) value.toLong() else null
	}

	/** `2^53 - 1`, the largest integer the reference's own check admits. */
	private const val MAX_SAFE_INTEGER = 9_007_199_254_740_991.0
}
