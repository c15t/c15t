package com.c15t.core.tc

/**
 * The pass the reference runs between being handed a model and writing bytes,
 * `encoder/SemanticPreEncoder.js`.
 *
 * It exists because a TC String is a legal record that leaves the device. Vendors and ad SDKs read
 * `IABTCF_TCString` and act on it, and a string that asserts a signal the framework does not allow
 * is not merely untidy: it is a string a recipient is entitled to treat as invalid and deny against.
 * So the reference edits the model on the way out, and any codec that wants to agree with web has to
 * edit in the same three places or produce a string that is both different from web's and less valid
 * than web's. All three are here:
 *
 * 1. the consent language is replaced with the vendor list's;
 * 2. purposes that can never rest on legitimate interest have their LI bit cleared;
 * 3. a positive vendor signal the vendor list gives no declared basis for is cleared.
 *
 * This is for authoring only. [TcStringEncoder.encode] over a [TcString] re-emits what was decoded
 * and runs nothing here -- pruning a string this codec merely read would turn a reader into a
 * rewriting CMP, and a round trip would stop being a round trip.
 */
internal object TcSemanticPreEncoder {
	/**
	 * Purposes that may never carry a legitimate-interest signal.
	 *
	 * Copied from the reference's one-line `purposeLegitimateInterests.unset([1, 3, 4, 5, 6])`, and
	 * with the same reason attached to it: purpose 1 (access device information) is never available
	 * under legitimate interest, and as of TCF v2.2 neither are purposes 3 through 6. It is a
	 * constant rather than a lookup -- no vendor list is consulted, so it applies to a string written
	 * against any list, at any version, including a stub.
	 */
	val purposesNeverLegitimateInterest: Set<Int> = setOf(1, 3, 4, 5, 6)

	/**
	 * Reduce [input] to the consent state that is lawful to write.
	 *
	 * Only four of the fields a TC String carries can be answered differently by this pass, so only
	 * those four come back. Everything else -- the cmp ids, the country code, the purpose consents,
	 * the disclosed vendors, the two versions -- goes to the writer from the caller's own input, and
	 * [input] is never mutated. The caller's consent state is the caller's; what the reference does
	 * with `tcModel.clone()` before editing, this does by returning a value.
	 */
	fun prepare(input: TcConsentInput): TcPreparedConsent = TcPreparedConsent(
		consentLanguage = languageOf(input.vendorList),
		purposeLegitimateInterests = input.purposeLegitimateInterests
			.filterNot { it in purposesNeverLegitimateInterest },
		vendorConsents = pruneVendorSignals(input, input.vendorConsents, TcVendor::purposes),
		vendorLegitimateInterests =
			pruneVendorSignals(
				input,
				input.vendorLegitimateInterests,
				TcVendor::legIntPurposes,
				isLegitimateInterest = true,
			),
	)

	/**
	 * `gvl.language.slice(0, 2).toUpperCase()`, applied every time a string is written.
	 *
	 * The reference does not consult the model's language at all, so a CMP that set one is
	 * overruled. That is a real behaviour rather than a quirk and it has a vector of its own:
	 * `tc-string-parity-consent-language-from-vendor-list` hands the encoder an app that says EN
	 * against a list that says DE, and the bytes say DE. Keeping this substitution inside the codec
	 * is what stops it from being caller discipline that one integration forgets.
	 */
	private fun languageOf(vendorList: TcVendorList): String =
		vendorList.language.take(LANGUAGE_CODE_LENGTH).uppercase()

	/**
	 * Drop the positive vendor signals in [ids] that [vendorList] does not back.
	 *
	 * [declared] selects the field the vendor list uses to claim purposes under the basis this
	 * vector is written under -- `purposes` for vendor consents, `legIntPurposes` for vendor
	 * legitimate interests -- which is the reference's `vendor[gvlVendorKey]` index written as a
	 * property reference. [isLegitimateInterest] is that same key carried as an argument, because the
	 * special-purposes carve-out below is written for the legitimate-interest basis and only that
	 * basis.
	 */
	private fun pruneVendorSignals(
		input: TcConsentInput,
		ids: List<Int>,
		declared: (TcVendor) -> List<Int>,
		isLegitimateInterest: Boolean = false,
	): List<Int> = ids.filter { vendorId ->
		val vendor = input.vendorList.vendor(vendorId)
		when {
			// A signal for a vendor this list has never heard of refers to nobody. Same for one
			// withdrawn from the list: the id still resolves to history, not to a vendor.
			vendor == null || vendor.isDeleted -> false
			declared(vendor).isNotEmpty() -> true
			// June 2021: a vendor that declares special purposes takes its LI bit even without
			// declaring a single ordinary LI purpose, because that bit is how the framework
			// represents them. The reference reaches this through two branches that differ only in
			// whether `purposes` is empty or populated, and since a length is nothing else, between
			// them they cover every vendor -- so the union is the single test below, and both halves
			// of it are pinned in TcSemanticPreEncoderTest. `legIntPurposes` is already known empty
			// here: this branch is reached through `declared`, which is that field.
			isLegitimateInterest && vendor.specialPurposes.isNotEmpty() -> true
			// Nothing left, so the reference has one more question: is the string service-specific,
			// and if so do this vendor's flexible purposes plus a publisher restriction add up to an
			// override that permits this basis? Both roads end at unset from here. Globally-scoped
			// strings skip the question entirely, because purpose restrictions only apply to
			// service-specific ones. Service-specific strings ask it, and then read
			// `publisherRestrictions.getRestrictions(vendorId)` for a REQUIRE_CONSENT or REQUIRE_LI
			// entry -- which for this codec is always empty. TcConsentInput has no field that could
			// carry a restriction, so the override the reference is looking for cannot be expressed,
			// `isValid` stays false, and the bit is cleared. Anyone who later adds restriction
			// authorising has to revisit this branch, not just this comment.
			else -> false
		}
	}

	/** Two six-bit characters, which is all the 12-bit ConsentLanguage field can hold. */
	private const val LANGUAGE_CODE_LENGTH = 2
}

/**
 * The four fields of a TC String that [TcSemanticPreEncoder] can answer differently from the way
 * [TcConsentInput] stated them. Listed exhaustively, so that adding a fifth is a change here and not
 * a field quietly edited in place somewhere in [TcStringEncoder].
 */
internal data class TcPreparedConsent(
	val consentLanguage: String,
	val purposeLegitimateInterests: List<Int>,
	val vendorConsents: List<Int>,
	val vendorLegitimateInterests: List<Int>,
)
