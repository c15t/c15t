package com.c15t.core.tc

/**
 * The segment a TC String dot-segment is, from the 3-bit `SegmentType` that opens it.
 *
 * The ids are the IAB's, not this build's: `0` is the core string, which is why the core
 * segment carries no SegmentType field at all -- the spec reserves the first 6 bits of the
 * encoding version instead, and the first three of those read back as 0. See
 * `lib/mjs/model/SegmentIDs.js` for the same table in the oracle.
 *
 * [VENDORS_ALLOWED] is the out-of-band segment. It is absent from the enum table printed in
 * the v2 formats document, which lists only 0, 1 and 3; `SegmentIDs.ID_TO_KEY` has it at 2,
 * and the oracle wins, as it always does here.
 */
enum class TcSegmentType(val id: Int) {
	/** Transparency and consent: version, timestamps, purposes, vendor lists, restrictions. */
	CORE(0),

	/** Which vendors the user was shown. Mandatory from TCF v2.3. */
	VENDORS_DISCLOSED(1),

	/** Which vendors the publisher permits to use an out-of-band legal basis. */
	VENDORS_ALLOWED(2),

	/** The publisher's own purposes, plus its custom purposes. */
	PUBLISHER_TC(3),
	;

	companion object {
		/** Width of the SegmentType field that selects one of these. */
		const val BITS = 3

		/**
		 * Resolve [id], or null when nothing claims it.
		 *
		 * Null is the answer the format asks for. The reference misses its map and throws a
		 * `TypeError` -- not a DecodingError, which is why a CMP feeding back a string with a
		 * segment type from a later revision gets a crash rather than a rejection -- and skipping
		 * the segment quietly would drop content. The caller keeps the bits instead: see
		 * [TcSection.Unknown].
		 */
		fun fromIdOrNull(id: Int): TcSegmentType? = entries.firstOrNull { it.id == id }
	}
}
