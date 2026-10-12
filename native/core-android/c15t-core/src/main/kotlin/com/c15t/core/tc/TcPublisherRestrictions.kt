package com.c15t.core.tc

/**
 * What a publisher's constraint does to a vendor's declared legal basis.
 *
 * The 2-bit enum is the IAB's and value 3 is reserved-but-undefined; [TcPurposeRestriction] keeps
 * the raw int rather than forcing one of these onto it, because a string from another CMP holding
 * a 3 is that CMP's statement and dropping it to null is a silent edit of someone's consent state.
 */
enum class TcRestrictionType(val bitValue: Int) {
	/** The publisher flatly disallows this purpose for this vendor, whatever the vendor declared. */
	NOT_ALLOWED(0),

	/** Flip a vendor's legitimate-interest declaration to requiring consent. */
	REQUIRE_CONSENT(1),

	/** Flip a vendor's consent declaration to requiring legitimate interest. */
	REQUIRE_LI(2),
	;

	companion object {
		/** The declared type, or null for a value outside the enum. */
		fun fromBitValueOrNull(value: Int): TcRestrictionType? = entries.firstOrNull { it.bitValue == value }
	}
}

/**
 * One publisher constraint: a purpose, what to do about it, and the vendors it applies to.
 *
 * @property ranges The `RangeEntry` sections verbatim, so [vendorIds] and a re-emit both stay honest.
 */
data class TcPurposeRestriction(
	val purposeId: Int,
	val restrictionTypeValue: Int,
	val ranges: List<TcIdRange>,
) {
	/** The declared type, or null when the string carries a value the format has not defined. */
	val restrictionType: TcRestrictionType?
		get() = TcRestrictionType.fromBitValueOrNull(restrictionTypeValue)

	/** The vendors under this constraint, ascending. */
	val vendorIds: List<Int>
		get() = ranges
			.flatMap { entry -> if (entry.end < entry.start) emptyList() else (entry.start..entry.end).toList() }
			.distinct()
}

/**
 * The core segment's Publisher Restrictions section.
 *
 * Layout, in the order `FieldSequence.js` gives it and `BitLength.js` gives widths:
 *
 * ```text
 * NumPubRestrictions       12 bits   required, even when it is 0
 *   PurposeId               6 bits
 *   RestrictionType         2 bits
 *   NumEntries             12 bits
 *     IsARange              1 bit    the formats doc's name; the oracle calls it singleOrRange
 *     StartOrOnlyVendorId  16 bits
 *     EndVendorId          16 bits   omitted when IsARange = 0
 * ```
 *
 * The section is count-driven, not terminator-driven: NumPubRestrictions says how many entries
 * follow and each entry's NumEntries says how many ranges follow it. Two descriptions of this
 * section that circulate -- an "isFixed" flag on the restriction, and a 0 terminator ending the
 * section -- do not appear in either authority. The 1-bit flag is per range entry and is named
 * IsARange; the section ends where its count says it ends.
 *
 * @property bitLength Bits the section occupied, which is how the caller knows where the core
 * segment ended. Non-zero even for an absent section, because the 12-bit count is mandatory.
 */
class TcPublisherRestrictions(
	val restrictions: List<TcPurposeRestriction>,
	val bitLength: Int,
) {
	/** True when the string carried no constraints, which is the common case. */
	val isEmpty: Boolean
		get() = restrictions.isEmpty()

	companion object {
		/** `BitLength.numRestrictions`. */
		const val NUM_RESTRICTIONS_BITS = 12

		/** `BitLength.purposeId`. */
		const val PURPOSE_ID_BITS = 6

		/** `BitLength.restrictionType`. */
		const val RESTRICTION_TYPE_BITS = 2

		/** `BitLength.numEntries`. */
		const val NUM_ENTRIES_BITS = 12

		/** `BitLength.singleOrRange`. */
		const val RANGE_FLAG_BITS = 1

		/** `BitLength.vendorId`. */
		const val VENDOR_ID_BITS = 16

		/** The 12-bit count, which a core segment always carries even with nothing to say. */
		val EMPTY = TcPublisherRestrictions(emptyList(), NUM_RESTRICTIONS_BITS)

		/**
		 * Read the section.
		 *
		 * A range whose end sits below its start throws. The reference throws here too
		 * (`Invalid RangeEntry: endVendorId ... is less than ...`), which is the opposite of what
		 * its own vendor-vector decoder does with the same shape, and both are kept as they are.
		 */
		fun read(reader: BitReader): TcPublisherRestrictions {
			val start = reader.position
			val count = reader.readInt(NUM_RESTRICTIONS_BITS).toInt()
			val restrictions = List(count) {
				val purposeId = reader.readInt(PURPOSE_ID_BITS).toInt()
				val restrictionType = reader.readInt(RESTRICTION_TYPE_BITS).toInt()
				val entries = reader.readInt(NUM_ENTRIES_BITS).toInt()
				val ranges = List(entries) {
					val isRange = reader.readFlag()
					val startId = reader.readInt(VENDOR_ID_BITS).toInt()
					if (!isRange) {
						TcIdRange(startId, startId)
					} else {
						val endId = reader.readInt(VENDOR_ID_BITS).toInt()
						if (endId < startId) {
							throw TcDecodingException(
								"publisher restriction range $startId..$endId counts backwards",
							)
						}
						TcIdRange(startId, endId)
					}
				}
				TcPurposeRestriction(purposeId, restrictionType, ranges)
			}
			return TcPublisherRestrictions(restrictions, reader.position - start)
		}
	}
}
