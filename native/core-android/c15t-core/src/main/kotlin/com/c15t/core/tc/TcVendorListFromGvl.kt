package com.c15t.core.tc

/**
 * The served vendor list, as the thing the encoder already knows how to prune against.
 *
 * [TcVendorList] exists because the codec needs three facts and nothing else: the two version
 * numbers a core segment writes, and which basis each vendor claims. A `/init` that carries a `gvl`
 * has those facts on it, so the served document and a hand-in list are two sources of one shape, and
 * the whole of this file is the conversion between them. [TcSemanticPreEncoder] is not involved and
 * changes nothing: it asks [TcVendorList.vendor] one question per positive signal, and a list built
 * from a served GVL answers that question the same way a list a test wrote does. That is the point --
 * `SemanticPreEncoder.js` reaches the declarations through `gvl.vendors.getById(id)` whichever route
 * the document took, and a mobile list that pruned one route harder than the other would write a
 * string the framework calls invalid on exactly the path where a real vendor list is involved.
 *
 * The web's equivalent of this function is `new GVL(gvlData)` in `generateTCString`
 * (`packages/iab/src/tcf/tc-string.ts`), which is the only way the reference gets a vendor list into
 * `TCModel` at all.
 */
fun GlobalVendorList.toTcVendorList(): TcVendorList = TcVendorList(
	vendorListVersion = vendorListVersion.toEncoderNumber(),
	tcfPolicyVersion = tcfPolicyVersion.toEncoderNumber(),
	vendors = vendors.map { (id, entry) -> entry.toTcVendor(id) },
	// The served document has no `language` field: it is chosen by URL, and
	// `packages/backend/src/http/gvl.ts` fetches `<endpoint>/<primary-subtag>.json`. The reference is
	// in the same position and resolves it the same way -- `generateTCString` constructs
	// `new GVL(gvlData)` without a language, and `GVL` leaves `language` at
	// `GVL.DEFAULT_LANGUAGE`, which is the value `SemanticPreEncoder` then writes into the string. So
	// a string authored from a served DE list says DE in the document and EN in the bytes, on web too.
	language = TcVendorList.DEFAULT_LANGUAGE,
)

/**
 * The vendor this list's key [id] names, as the encoder reads it.
 *
 * The id comes from the key and not from the entry's own `id` field, because the web takes it from
 * the key: `GVL` overwrites `vendor.id` with `Number.parseInt(id, 10)` while it converts the record,
 * and `mapGvlVendor` in `dialog-data.ts` does `id: Number(vendorId)` for the dialog's copy. An entry
 * whose body disagrees with its key is therefore not a vendor with two names, it is the key's vendor,
 * and reading the body would let it claim a signal belonging to somebody else.
 */
private fun GvlVendorEntry.toTcVendor(id: Int): TcVendor = TcVendor(
	id = id,
	purposes = purposes.toEncoderIds(),
	legIntPurposes = legIntPurposes.toEncoderIds(),
	specialPurposes = specialPurposes.toEncoderIds(),
	flexiblePurposes = flexiblePurposes.toEncoderIds(),
	// Absent means an active vendor, and an empty string means the same thing, because the reference
	// tests this field only for truthiness. [TcVendor.isDeleted] is where that is kept.
	deletedDate = deletedDate,
)

/**
 * A declared purpose list, as ids.
 *
 * A null list reads as no declaration rather than as a withdrawal, which is what the web's
 * `vendor.purposes || []` says, and is the answer the encoder needs: no declaration means the basis
 * is not claimed, so a positive signal for it is cleared. Note that this is the opposite direction of
 * risk from inventing a purpose -- an empty list costs the vendor its bit, which is fail-closed, and a
 * invented one spends the subject's consent on a basis nobody declared.
 *
 * Ids outside `Int` are dropped instead of wrapped. A serving bug that put 4294967298 where a purpose
 * belongs must not arrive as purpose 2, which is a basis a real vendor really did declare.
 */
private fun List<Long>?.toEncoderIds(): List<Int> = this?.mapNotNull { it.toIntInRangeOrNull() } ?: emptyList()

/** A version number, for the two fields [TcVendorList] carries. See [toEncoderIds] for the range rule. */
private fun Long.toEncoderNumber(): Int = toIntInRangeOrNull() ?: 0

/** [this] as an `Int`, or null when it does not fit in one, so nothing reaches an id field wrapped. */
private fun Long.toIntInRangeOrNull(): Int? =
	if (this in Int.MIN_VALUE..Int.MAX_VALUE) this.toInt() else null

/**
 * Author [this] against [vendorList] instead of the list it carries.
 *
 * The one change [TcStringEncoder.encode] sees is the list: `vendorListVersion` and
 * `tcfPolicyVersion` come along with it, which is the invariant
 * `TcVendorList`'s own documentation calls out -- pruning against one list while advertising another
 * is a state the type has no way to write. There is no fourth encode parameter to add, and the
 * hand-in route the shared fixtures use is untouched.
 */
fun TcConsentInput.withServedVendorList(vendorList: GlobalVendorList): TcConsentInput =
	copy(vendorList = vendorList.toTcVendorList())
