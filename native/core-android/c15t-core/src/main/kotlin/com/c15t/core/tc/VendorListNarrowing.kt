package com.c15t.core.tc

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * The publisher's vendor scope, applied to a list that arrived whole.
 *
 * c15t sends the scope upstream rather than filtering after the fact: `gvlRequestUrl` in
 * `packages/backend/src/http/gvl.ts` puts `vendorIds` on the GVL request, `narrowToVendorIds` in that
 * file then runs the filter over the document that came back before it is cached, and
 * `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts` runs it over a list that reached the
 * browser by another route so server-resolved state and a client fetch disclose the same partners.
 * The filter has to run somewhere, and a device holding the complete list is one careless render away
 * from disclosing every GVL vendor to a subject who was only ever shown a publisher's own partners.
 *
 * The prune stops at `vendors`, which is what both web functions do and is not an oversight about the
 * rest of the document. Purposes, special purposes, features, special features, stacks, data
 * categories and the two version numbers describe the framework rather than the audience: a list
 * narrowed to three vendors still has to be able to say what purpose 7 means and which
 * `tcfPolicyVersion` its TC String is graded against. Thinning the unreferenced ones for tidiness
 * would also install a second, silent reading rule -- `processPurposes` in
 * `packages/iab/src/headless/dialog-data.ts` walks the served `purposes` record to draw the purposes
 * leg of a dialog, and a copy of it pruned here would change what that dialog claims independently of
 * the scope anybody configured.
 *
 * An empty scope means "no scope configured", not "show nobody". That is the web's reading twice
 * over: `narrowGVLToVendors` hands the list back for `vendorIds.length === 0`, and `gvlRequestUrl`
 * does not append the parameter for an empty list at all, so the document on the wire is the whole
 * one. A host that means no vendors has to say so somewhere other than here. This is the fail-open
 * half of the pair, which is why [narrowVendorListElement] and this function read the empty case the
 * same way and say so out loud rather than leaving it to a caller's memory.
 */
fun GlobalVendorList.narrowToVendorIds(vendorIds: Collection<Int>?): GlobalVendorList {
	if (vendorIds.isNullOrEmpty()) {
		return this
	}
	val allowed = vendorIds.toSet()
	return copy(vendors = vendors.filterKeys { id -> id in allowed })
}

/**
 * [GlobalVendorList.narrowToVendorIds] for bytes that have not been decoded: a served vendor-list
 * document, in the shape [GlobalVendorListJson] reads it or a bridge forwards it.
 *
 * The element form exists because narrowing is not always a decision a caller gets to make after a
 * decode. `GlobalVendorListJson.read` refuses a document this build cannot name whole, and a body
 * forwarded on to JavaScript never goes through a decode at all, so a caller that holds the raw `gvl`
 * value and wants one scope applied needs the answer at this level. The backend stands in the same
 * spot: it narrows `parsed.output` before `cache.set`, precisely so a wide list cannot survive in the
 * cache under a key that promises a scoped one.
 *
 * Nothing is pruned, and the input comes back as the same instance, when the scope is null or empty --
 * for the reason above -- and when there is no `vendors` record to prune: [element] null, a JSON
 * `null`, a string, an array, an object with no `vendors` key, or one whose `vendors` is not an
 * object. Identity is the point rather than an optimisation: it keeps "did this call rewrite my
 * bytes?" off every caller's list of questions.
 *
 * Whether a document is worth holding is not this function's decision, so no part of the acceptance
 * rules is re-checked here. [GlobalVendorListJson.read] owns that, and re-deriving it would make the
 * two paths disagree: a document refused downstream is null either way, while a document skipped here
 * because it failed a test it was never handed leaves the tier of bytes a caller forwarded unscoped.
 *
 * The surviving keys are the ones the served keys name, compared as written. A GVL's numbered
 * records are objects keyed by a number written as a string, and both web filters build the allowlist
 * with `vendorIds.map(String)` and test it against the keys `Object.entries` hands them; this compares
 * the same two things, so a key served as `"042"`, or with a space in front of it, is not a vendor the
 * scope names and is pruned away. An entry's own `id` field never gets a vote, which is the key's
 * authority recorded at the top of [GlobalVendorList] and again on `toTcVendor` in
 * `TcVendorListFromGvl.kt`: an entry that reads a different number in its body than the key it lives
 * under cannot use a scope as the occasion to rename itself into somebody else's disclosure.
 *
 * An id the served document does not carry contributes nothing, and no entry is written to satisfy
 * the scope -- inventing a vendor out of a number a publisher configured is contract rule 5 with a
 * friendlier face, and a fabricated entry would reach [toTcVendorList] as declarations no company
 * ever published. Siblings keep their position and value untouched, `vendors` keeps the served order
 * of what survives, and the pruned record can legitimately come back empty, which is the same answer
 * the web's filter gives and reads as no vendors downstream. Untouched values are shared and not
 * copied, which costs nothing because a [JsonElement] is immutable.
 */
fun narrowVendorListElement(element: JsonElement?, vendorIds: Collection<Int>?): JsonElement? {
	if (vendorIds.isNullOrEmpty()) {
		return element
	}
	val document = element as? JsonObject ?: return element
	val vendors = document[VENDORS_KEY] as? JsonObject ?: return element
	val allowed = vendorIds.mapTo(HashSet(vendorIds.size)) { id -> id.toString() }
	val pruned = JsonObject(vendors.filterKeys { key -> key in allowed })
	return JsonObject(document + (VENDORS_KEY to pruned))
}

/** The one record this file narrows. Its siblings are served data and stay as they arrived. */
private const val VENDORS_KEY = "vendors"
