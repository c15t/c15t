package com.c15t.core.tc

/**
 * How a list of ids is packed inside a vendor section.
 *
 * One bit, two possibilities, and the polarity is worth writing down because both readings look
 * plausible and only one is right: `1` is a range, `0` is a bitfield. The formats document names
 * the field `IsRangeEncoding` and states "1 Range 0 BitField"; `VectorEncodingType` in the oracle
 * agrees, with `FIELD = 0` and `RANGE = 1`.
 */
enum class TcVectorEncoding(val bitValue: Int) {
	/** One bit per id from 1 to maxId, leftmost first. */
	FIXED_BITFIELD(0),

	/** NumEntries, then that many (isRange, start[, end]) triples. */
	RANGE(1),
	;

	companion object {
		/** Resolve the 1-bit encoding flag. */
		fun fromBitValue(value: Int): TcVectorEncoding = entries.firstOrNull { it.bitValue == value }
			?: throw TcDecodingException("unknown vendor-section encoding type $value")
	}
}

/**
 * One inclusive id range as it appears in a range section.
 *
 * `start == end` is a single id, which is what `IsARange = 0` writes: one 16-bit id and no end.
 */
data class TcIdRange(val start: Int, val end: Int)

/**
 * A vendor id section: `MaxVendorId`, `IsRangeEncoding`, and the payload they describe.
 *
 * The payload is kept as the bits that were read rather than as a normalised set, and that is the
 * design decision worth stating. Range encoding has no canonical form: vendors 5 to 9 may be
 * written as one range entry or as `(5,6) (7) (8,9)`, and both decode to the same five vendors.
 * Keep the bits and re-emitting a decoded string is exact; keep only the set and re-encoding
 * silently rewrites somebody else's bytes. [ofIds] is where a *new* list gets the reference's
 * smaller-of-two choice, so normalising happens when this build is the author and never when it
 * is the reader.
 *
 * Nothing here caps at 40 or 45 ids. `MaxVendorId` is 16 bits, so the ceiling is 65535 and the
 * live GVL is at 1214 vendors. The 45 that appears in the arithmetic below is the width of the
 * cheapest possible range encoding, not a limit on the section.
 *
 * @property maxId The section's `MaxVendorId`, the highest id its payload can reach.
 * @property encoding Which of the two packings [payloadBits] is in.
 * @property payloadBits The bitfield or range entries, exactly as read.
 */
class TcVectorSection(
	val maxId: Int,
	val encoding: TcVectorEncoding,
	val payloadBits: String,
) {
	/** Bits this section occupies, which is how the field after it finds its offset. */
	val bitLength: Int
		get() = MAX_ID_BITS + ENCODING_BITS + payloadBits.length

	/**
	 * The range entries, in the order they were written.
	 *
	 * @throws TcDecodingException if this section is a bitfield, or an entry is truncated.
	 */
	val rangeEntries: List<TcIdRange>
		get() {
			if (encoding != TcVectorEncoding.RANGE) {
				throw TcDecodingException("a ${encoding.name} section carries no range entries")
			}
			val reader = BitReader(payloadBits)
			val count = reader.readInt(NUM_ENTRIES_BITS).toInt()
			return List(count) {
				val isRange = reader.readFlag()
				val start = reader.readInt(ID_BITS).toInt()
				if (isRange) {
					TcIdRange(start, reader.readInt(ID_BITS).toInt())
				} else {
					TcIdRange(start, start)
				}
			}
		}

	/**
	 * The ids the section sets, ascending.
	 *
	 * An entry whose end is below its start contributes nothing, which is what the reference does:
	 * `VendorVectorEncoder.decode` runs `for (j = firstId; j <= secondId; j++)` and so adds nothing
	 * for a reversed pair. `PurposeRestrictionVectorEncoder` in the same library throws on that
	 * shape instead, so the two halves disagree; this follows the vendor encoder, and the
	 * divergence is pinned by a test rather than left as an opinion.
	 */
	val ids: List<Int>
		get() = when (encoding) {
			TcVectorEncoding.FIXED_BITFIELD -> payloadBits.mapIndexedNotNull { index, bit ->
				if (bit == '1') {
					index + 1
				} else {
					null
				}
			}

			TcVectorEncoding.RANGE -> rangeEntries
				.flatMap { entry -> if (entry.end < entry.start) emptyList() else (entry.start..entry.end).toList() }
				.distinct()
		}

	/** Write this section at [writer]'s position, exactly as it was read. */
	fun write(writer: BitWriter) {
		writer.appendInt(maxId.toLong(), MAX_ID_BITS)
		writer.appendInt(encoding.bitValue.toLong(), ENCODING_BITS)
		writer.appendBits(payloadBits)
	}

	companion object {
		/** `BitLength.maxId`. */
		const val MAX_ID_BITS = 16

		/** `BitLength.encodingType`. */
		const val ENCODING_BITS = 1

		/** `BitLength.numEntries`. */
		const val NUM_ENTRIES_BITS = 12

		/** `BitLength.singleOrRange`. */
		const val RANGE_FLAG_BITS = 1

		/** `BitLength.vendorId`. */
		const val ID_BITS = 16

		/** maxId + encodingType: the part every section carries before its payload. */
		const val HEADER_BITS = MAX_ID_BITS + ENCODING_BITS

		/**
		 * Read a section, leaving the reader parked on whatever follows it.
		 *
		 * A bitfield payload is exactly maxId bits wide and a range payload is 12 bits plus its
		 * entries, so the header alone says where the next field begins. That is the whole reason
		 * `MaxVendorId` exists, as the formats document puts it: "this indicates the last ID of the
		 * section so that a decoder will know when it has reached the end".
		 */
		fun read(reader: BitReader): TcVectorSection {
			val maxId = reader.readInt(MAX_ID_BITS).toInt()
			val encoding = TcVectorEncoding.fromBitValue(reader.readInt(ENCODING_BITS).toInt())
			val payloadBits = if (encoding == TcVectorEncoding.FIXED_BITFIELD) {
				reader.readBits(maxId)
			} else {
				val start = reader.position
				val count = reader.readInt(NUM_ENTRIES_BITS).toInt()
				repeat(count) {
					if (reader.readFlag()) {
						reader.readInt(ID_BITS)
					}
					reader.readInt(ID_BITS)
				}
				reader.bitsBetween(start, reader.position)
			}
			return TcVectorSection(maxId, encoding, payloadBits)
		}

		/**
		 * Build a section for [ids] the way the reference would, taking the smaller packing.
		 *
		 * The rule is `VendorVectorEncoder.encode`'s, reduced to arithmetic: a range section costs
		 * 45 bits before it holds a single id (16 + 16 for an id pair, 1 for its flag, 12 for the
		 * entry count), so under that many vendors a bitfield always wins, and over it the walk
		 * stops opening ranges the moment they stop being cheaper than maxId bits of bitfield.
		 *
		 * Deliberately absent is the GVL filtering `SemanticPreEncoder` applies on the way to the
		 * same function on the web side. That is web's decision to make and this build's to not
		 * guess at.
		 */
		fun ofIds(ids: Collection<Int>): TcVectorSection {
			val sorted = ids.toSortedSet()
			if (sorted.any { it < 1 }) {
				throw TcEncodingException("vendor ids start at 1")
			}
			if (sorted.any { it > MAX_ID_CEILING }) {
				throw TcEncodingException("vendor id ${sorted.max()} does not fit in $MAX_ID_BITS bits")
			}
			val maxId = sorted.maxOrNull() ?: 0
			if (maxId == 0) {
				// Nothing to say: a zero maxId, a bitfield flag, no payload. 17 bits, and what the
				// reference emits for an empty Vector.
				return TcVectorSection(0, TcVectorEncoding.FIXED_BITFIELD, "")
			}

			val bitFieldLength = HEADER_BITS + maxId
			// 16 + 16 + 1 + 12: an id pair, its flag, and the count that opens the section.
			val minimumRangeLength = (ID_BITS * 2) + RANGE_FLAG_BITS + NUM_ENTRIES_BITS
			var rangeLength = HEADER_BITS + NUM_ENTRIES_BITS
			var rangeIsSmaller = false
			var openStart = 0
			val ranges = mutableListOf<TcIdRange>()

			for (index in 1..maxId) {
				rangeIsSmaller = maxId > minimumRangeLength && rangeLength < bitFieldLength
				if (rangeIsSmaller && sorted.contains(index)) {
					if (!sorted.contains(index + 1)) {
						// The run ends here, so close it. A run that never opened held one id and was
						// charged only an id, never a flag -- the reference charges a lone id 16 bits
						// here while buildRangeEncoding writes 17, and reproducing that off-by-one is
						// what makes the two agree on which encoding to pick.
						rangeLength += ID_BITS
						ranges += if (openStart == 0) TcIdRange(index, index) else TcIdRange(openStart, index)
						openStart = 0
					} else if (openStart == 0) {
						rangeLength += RANGE_FLAG_BITS + ID_BITS
						openStart = index
					}
				}
			}

			val writer = BitWriter()
			return if (rangeIsSmaller) {
				writer.appendInt(ranges.size.toLong(), NUM_ENTRIES_BITS)
				ranges.forEach { range ->
					val isRange = range.end != range.start
					writer.appendFlag(isRange)
					writer.appendInt(range.start.toLong(), ID_BITS)
					if (isRange) {
						writer.appendInt(range.end.toLong(), ID_BITS)
					}
				}
				TcVectorSection(maxId, TcVectorEncoding.RANGE, writer.toBits())
			} else {
				writer.appendFixedIds(sorted, maxId)
				TcVectorSection(maxId, TcVectorEncoding.FIXED_BITFIELD, writer.toBits())
			}
		}

		private const val MAX_ID_CEILING = (1 shl MAX_ID_BITS) - 1
	}
}
