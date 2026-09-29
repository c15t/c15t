package com.c15t.core.tc

/**
 * A section that follows the core segment, after its own 3-bit SegmentType.
 *
 * Kept as a sealed type rather than four nullable fields on [TcString] so the order the string
 * arrived in survives decoding. Order is part of the bytes: the formats document says the sections
 * after the core "may appear in any order because each includes a segment ID", so a decoder that
 * normalised them into fixed slots would be free to emit a different string than it read.
 */
sealed interface TcSection {
	/** The SegmentType id written in front of this section's body. */
	val segmentTypeId: Int

	/** The SegmentType this build models, or null for one it carries through without reading. */
	val type: TcSegmentType?
		get() = TcSegmentType.fromIdOrNull(segmentTypeId)

	/** Vendors disclosed to the user. Mandatory from TCF v2.3. */
	data class VendorsDisclosed(val vendors: TcVectorSection) : TcSection {
		override val segmentTypeId: Int
			get() = TcSegmentType.VENDORS_DISCLOSED.id
	}

	/** Vendors the publisher permits to rely on an out-of-band legal basis. */
	data class VendorsAllowed(val vendors: TcVectorSection) : TcSection {
		override val segmentTypeId: Int
			get() = TcSegmentType.VENDORS_ALLOWED.id
	}

	/** The publisher's own purposes and custom purposes. */
	data class PublisherTransparency(val publisher: TcPublisherSegment) : TcSection {
		override val segmentTypeId: Int
			get() = TcSegmentType.PUBLISHER_TC.id
	}

	/**
	 * A segment whose id this build has no model for, held as the bits after its SegmentType.
	 *
	 * The formats document enumerates 0, 1 and 3; the oracle reserves 2 for out-of-band vendors
	 * allowed; anything else is a segment type from a revision this predates. The documented duty is
	 * to tolerate a segment the decoder does not model -- refusing the string would make another
	 * CMP's addition fatal to this one -- and the way to tolerate it without losing it is to keep the
	 * bits, parse nothing, and hand them back unchanged.
	 */
	data class Unknown(override val segmentTypeId: Int, val bodyBits: String) : TcSection
}

/**
 * A decoded TC String: one core segment plus whatever sections followed it.
 *
 * A string is dot-separated segments, and the shape the framework uses in practice is
 * `[Core].[DisclosedVendors].[PublisherTC]` -- the Publisher TC optional, and Disclosed Vendors
 * mandatory from TCF v2.3 onward. This holds all of it, in the order it arrived.
 *
 * @property core The core segment, which every TC String must carry and which must come first.
 * @property sections The dot-segments after the core, in the order they were written.
 */
data class TcString(
	val core: TcCoreSegment,
	val sections: List<TcSection>,
) {
	/** Vendors disclosed to the user, or null when the string carries no such section. */
	val vendorsDisclosed: TcVectorSection?
		get() = sections.filterIsInstance<TcSection.VendorsDisclosed>().firstOrNull()?.vendors

	/** Vendors allowed to use an out-of-band legal basis, or null when absent. */
	val vendorsAllowed: TcVectorSection?
		get() = sections.filterIsInstance<TcSection.VendorsAllowed>().firstOrNull()?.vendors

	/** The publisher's own purposes, or null when the string carries no Publisher TC segment. */
	val publisher: TcPublisherSegment?
		get() = sections.filterIsInstance<TcSection.PublisherTransparency>().firstOrNull()?.publisher

	/** Sections this build read but cannot interpret, kept so a re-emit loses nothing. */
	val unknownSections: List<TcSection.Unknown>
		get() = sections.filterIsInstance<TcSection.Unknown>()
}
