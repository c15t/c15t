package com.c15t.core.tc

/**
 * The Publisher TC segment: the publisher's own purposes, and its custom ones.
 *
 * The publisher's purposes are its own signal, separate from the framework purposes in the core
 * segment, and a vendor is told not to rely on them unless it has an agreement with the publisher.
 * Mobile decodes them because other CMPs write them; mobile does not author them, because c15t's
 * web codec never populates them and there is nothing on the consent snapshot to put them in.
 *
 * Layout, after the 3-bit SegmentType:
 *
 * ```text
 * PubPurposesConsent          24 bits   @ 3
 * PubPurposesLITransparency   24 bits   @27
 * NumCustomPurposes            6 bits   @51
 * CustomPurposesConsent   NumCustomPurposes bits   @57
 * CustomPurposesLI        NumCustomPurposes bits   @57 + NumCustomPurposes
 * ```
 *
 * The two custom vectors are positional, not id-set: their width is NumCustomPurposes and the
 * leftmost bit is custom purpose 1. That is why NumCustomPurposes has to travel with them -- a
 * decoded string that says 0 and carries nothing is consistent, and a model that carried custom
 * purpose 3 with a count of 0 could not be written by anything, which is exactly the case the
 * oracle refuses by throwing.
 *
 * @property numCustomPurposes The declared width of the two custom vectors, 0 to 63.
 */
data class TcPublisherSegment(
	val publisherConsents: List<Int>,
	val publisherLegitimateInterests: List<Int>,
	val numCustomPurposes: Int,
	val publisherCustomConsents: List<Int>,
	val publisherCustomLegitimateInterests: List<Int>,
) {
	/** Write the segment body, without its 3-bit SegmentType. */
	fun write(writer: BitWriter) {
		writer.appendFixedIds(publisherConsents, PURPOSE_BITS)
		writer.appendFixedIds(publisherLegitimateInterests, PURPOSE_BITS)
		writer.appendInt(numCustomPurposes.toLong(), NUM_CUSTOM_PURPOSES_BITS)
		if (numCustomPurposes > 0) {
			// A custom id past the declared width would be unreadable by the next decoder, and
			// appendFixedIds already refuses an id outside the field.
			writer.appendFixedIds(publisherCustomConsents, numCustomPurposes)
			writer.appendFixedIds(publisherCustomLegitimateInterests, numCustomPurposes)
		}
	}

	companion object {
		/** `BitLength.publisherConsents` and `BitLength.publisherLegitimateInterests`. */
		const val PURPOSE_BITS = 24

		/** `BitLength.numCustomPurposes`. */
		const val NUM_CUSTOM_PURPOSES_BITS = 6

		/**
		 * Read the segment body from a reader already positioned past its SegmentType.
		 *
		 * @throws TcDecodingException if the segment ends before the two custom vectors do.
		 */
		fun read(reader: BitReader): TcPublisherSegment {
			val consents = reader.readFixedIds(PURPOSE_BITS)
			val legitimateInterests = reader.readFixedIds(PURPOSE_BITS)
			val numCustom = reader.readInt(NUM_CUSTOM_PURPOSES_BITS).toInt()
			// The reference skips the read entirely when the count is 0 rather than reading zero
			// bits, which matters because BitReader would otherwise be asked for an empty field.
			val customConsents = if (numCustom > 0) reader.readFixedIds(numCustom) else emptyList()
			val customLi = if (numCustom > 0) reader.readFixedIds(numCustom) else emptyList()
			return TcPublisherSegment(consents, legitimateInterests, numCustom, customConsents, customLi)
		}
	}
}
