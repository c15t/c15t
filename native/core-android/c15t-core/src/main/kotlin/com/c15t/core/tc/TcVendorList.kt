package com.c15t.core.tc

/**
 * What one vendor declares about itself in a vendor list.
 *
 * Only the purpose lists and the withdrawal date, because those are the only facts about a vendor
 * that change the bytes of a TC String. Names, features, special features, data disclosures and the
 * purposes' descriptions are display data: the string carries ids and bits and nothing a vendor
 * publishes about itself.
 *
 * The four lists are the legal-basis question the encoder needs. [purposes] are the purposes this
 * vendor claims under consent, [legIntPurposes] under legitimate interest, and [flexiblePurposes]
 * the subset of those two whose basis a publisher may switch through a purpose restriction.
 * [specialPurposes] matters on its own because of the June 2021 policy change: a vendor that
 * declares only special purposes must still carry a legitimate-interest bit once it has been
 * disclosed. See [TcSemanticPreEncoder].
 *
 * @property deletedDate The date this vendor was withdrawn from the list, or null while it is an
 * active vendor. A withdrawn vendor keeps its entry -- lists are append-only history -- but a
 * positive signal for it is not a real signal, so the encoder drops it. The reference tests this
 * field for truthiness, which is why a blank string counts as not deleted here too.
 */
data class TcVendor(
	val id: Int,
	val purposes: List<Int> = emptyList(),
	val legIntPurposes: List<Int> = emptyList(),
	val specialPurposes: List<Int> = emptyList(),
	val flexiblePurposes: List<Int> = emptyList(),
	val deletedDate: String? = null,
) {
	/** Whether this vendor was withdrawn from the list. */
	val isDeleted: Boolean
		get() = !deletedDate.isNullOrEmpty()
}

/**
 * The vendor list a TC String is written against.
 *
 * This is not a GVL and does not behave like one. It resolves nothing over the network, holds no
 * purpose or feature definitions, caches nothing, and carries no readiness promise -- on device the
 * kernel already has the vendor list from `/init` by the time there is consent to record, so the
 * codec is handed the declarations rather than fetching them. That is also why [TcConsentInput]
 * makes a vendor list a required argument: the reference encoder throws
 * `EncodingError('Unable to encode TCModel without a GVL')` at exactly this absence, and a required
 * parameter turns that into a compile error instead of a failure at the moment a string is written.
 *
 * [vendorListVersion] and [tcfPolicyVersion] live here rather than on [TcConsentInput], which is the
 * division the Swift core settled on and the one the fixtures' own `input.vendorList` uses. The two
 * numbers describe the list, not the consent, and keeping them here means pruning against one list
 * while advertising another is a state this shape has no way to write. They stay plain numbers
 * handed in rather than values read off a fetched GVL, because a handed-in record is all the shared
 * fixtures can support.
 *
 * @property vendorListVersion Which vendor list this one is, written straight into the core
 * segment's VendorListVersion. `TCModel`'s getter prefers the GVL over any stored value, so on the
 * web there is no way to write a string against one list while naming another; a live string built
 * against GVL 177 says 177 whatever the caller intended.
 * @property tcfPolicyVersion The policy revision this list was published under, into TcfPolicyVersion
 * likewise. Derived from the list on the web -- `TCModel.js` reads `gvl.tcfPolicyVersion` -- and
 * today's live GVL says 5, so a codec that hardcoded something older would name a policy that no
 * current publisher generates.
 * @property language The two-letter code this list's own purpose translations are written in. The
 * reference overwrites the model's consent language with this on the way to the encoder, which is
 * why [TcSemanticPreEncoder] does the same: the string must describe the purposes in the language
 * the user actually read. Defaults to the reference's `GVL.DEFAULT_LANGUAGE`.
 */
data class TcVendorList(
	val vendorListVersion: Int,
	val tcfPolicyVersion: Int,
	val vendors: List<TcVendor>,
	val language: String = DEFAULT_LANGUAGE,
) {
	/**
	 * Indexed once because the pruning pass asks one question per positive signal -- does vendor N
	 * exist, and does it declare this basis -- and rescanning a list of over a thousand vendors for
	 * each answer would make the cost of writing one string quadratic in the size of the list.
	 */
	private val byId: Map<Int, TcVendor> = vendors.associateBy { it.id }

	/** The vendor that [id] names, or null when this list does not carry it. */
	fun vendor(id: Int): TcVendor? = byId[id]

	companion object {
		/** `GVL.DEFAULT_LANGUAGE` in the reference: an unset language still writes EN. */
		const val DEFAULT_LANGUAGE = "EN"
	}
}
