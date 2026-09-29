package com.c15t.core.tc

/**
 * Reads a TC String into a [TcString].
 *
 * A string is dot-separated base64url segments, and each segment after the first opens with a
 * 3-bit SegmentType. The first does not: the format spends the first 6 bits on its own version
 * number, and because that version is 2 the first three bits read back as 0, which is the same
 * value the core segment's absent SegmentType would hold. That coincidence is load-bearing --
 * `TCString.decode` in the oracle exploits it, and so does this.
 *
 * Where this is stricter than the oracle, it is on purpose and it is written down at the point it
 * happens: an unknown SegmentType is a [TcDecodingException] rather than a `TypeError` off a map
 * miss; a repeated section is refused rather than quietly overwritten by the later one; a v1
 * string is refused rather than read against a v2 table; and bits left over at the end of a
 * segment are a failure unless they are base64url padding, where the oracle looks past them.
 */
object TcStringDecoder {
	/**
	 * Decode [encoded], which may be a whole TC String or any prefix of its dot-segments.
	 *
	 * @throws TcDecodingException for anything this format does not describe, including an empty
	 * string, a character outside the base64url alphabet, a v1 core, an unknown segment type, a
	 * repeated section, a segment without a core to open it, and a truncated segment.
	 */
	fun decode(encoded: String): TcString {
		val dotSegments = encoded.split('.')
		var core: TcCoreSegment? = null
		val sections = mutableListOf<TcSection>()

		dotSegments.forEachIndexed { index, segment ->
			val bits = Base64Url.decodeToBits(segment)
			// 3 bits, and the comment in TCString.decode is right that only the first three of the
			// six encoding-version bits are ever a segment type.
			val typeId = BitReader(bits).readInt(TcSegmentType.BITS).toInt()
			if (typeId == TcSegmentType.CORE.id) {
				if (index != 0) {
					throw TcDecodingException("a core segment sits at position $index, and the format puts it first")
				}
				core = TcCoreSegment.read(bits)
			} else {
				val reader = BitReader(bits)
				reader.readInt(TcSegmentType.BITS)
				val type = TcSegmentType.fromIdOrNull(typeId)
				if (type == null) {
					// Everything after the 3-bit id, verbatim. Nothing is parsed, so nothing is
					// misread, and the bytes survive a decode/encode pair.
					sections += TcSection.Unknown(typeId, reader.remainingBits)
				} else {
					sections += when (type) {
						TcSegmentType.VENDORS_DISCLOSED -> TcSection.VendorsDisclosed(TcVectorSection.read(reader))
						TcSegmentType.VENDORS_ALLOWED -> TcSection.VendorsAllowed(TcVectorSection.read(reader))
						TcSegmentType.PUBLISHER_TC -> TcSection.PublisherTransparency(TcPublisherSegment.read(reader))
						// The core branch above took this one, and a string with two cores never gets
						// here. Exhaustive so a new modelled type cannot slip past without a reader.
						TcSegmentType.CORE -> throw TcDecodingException("two core segments")
					}
					rejectLeftoverBits(reader, type.name)
				}
			}
		}

		if (core == null) {
			throw TcDecodingException("TC string carries no core segment")
		}
		val duplicated = sections.mapNotNull { it.type }.groupingBy { it }.eachCount()
			.filterValues { it > 1 }.keys
		if (duplicated.isNotEmpty()) {
			// The oracle lets the later section win, which drops the earlier one without a word.
			// Two disclosed-vendor sections in one string is a producer bug, and a decoder that
			// picks one is making a consent decision.
			throw TcDecodingException("TC string repeats the ${duplicated.joinToString()} section")
		}
		return TcString(core = core, sections = sections)
	}

	/**
	 * Fail when a segment ends with bits no field claimed.
	 *
	 * [Base64Url.encodeBits] zero-pads a segment to a multiple of 24 bits, so a legal tail is up to
	 * 23 bits wide and every one of them has to be zero. Both halves of that matter, and the spec's
	 * own worked example is the proof: its Disclosed Vendors segment carries 99 bits of fields in 20
	 * characters, so 21 of its bits are padding. A check capped at five -- one character's worth --
	 * rejects that string, which is how this bound got written down instead of assumed.
	 */
	internal fun rejectLeftoverBits(reader: BitReader, segmentName: String) {
		if (reader.remaining > Base64Url.PADDING_BITS - 1) {
			throw TcDecodingException(
				"$segmentName segment leaves ${reader.remaining} unread bits at bit ${reader.position}",
			)
		}
		if (reader.remainingBits.contains('1')) {
			throw TcDecodingException("$segmentName segment has a set bit in its base64url padding")
		}
	}
}
