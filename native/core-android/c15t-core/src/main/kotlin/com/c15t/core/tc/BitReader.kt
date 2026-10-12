package com.c15t.core.tc

/**
 * A cursor over the bit string one TC String segment decodes to.
 *
 * Every field in the TCF v2 core segment sits at a fixed offset for a fixed number of bits, so
 * reading a segment is a position plus four reads. Nothing here interprets a field: the callers
 * in [TcCoreSegment] and [TcPublisherSegment] own which field lands where, and this object owns
 * only "take n bits, as a number / a flag / two letters / a bit string".
 *
 * Reads are unsigned. A 36-bit decisecond timestamp reaches 6.8e11 and a 16-bit vendor id
 * reaches 65535, so [readInt] returns a `Long` and every narrowing is the caller's, at a width
 * it has already checked against `lib/mjs/encoder/BitLength.js`.
 *
 * A read past the end throws rather than coming back short. The reference reaches past the end
 * with `String.prototype.substr` and then fails inside `IntEncoder` with `invalid bit length`,
 * which rejects the same strings for the same reason but names nothing; the offset and the
 * count are in the message here because a truncated TC string off another CMP is the ordinary
 * real-world case, and the log has to say which field ran out.
 *
 * @see BitWriter, the same rules pointed the other way.
 */
class BitReader(private val bits: String) {
	/** The bit the next read starts at. Every offset table for this format is absolute, so this is the number a test pins. */
	var position: Int = 0
		private set

	/** Bits left between [position] and the end of the string. */
	val remaining: Int
		get() = bits.length - position

	/** The bits after the cursor. After a complete read that is only base64url padding. */
	val remainingBits: String
		get() = bits.substring(position)

	/**
	 * Read [bitCount] bits as an unsigned number.
	 *
	 * @throws TcDecodingException if the field runs past the end or is wider than a `Long`.
	 */
	fun readInt(bitCount: Int): Long {
		if (bitCount > MAX_UNSIGNED_BITS) {
			// 63 bounds the type, not the format: the widest field in TCF v2 is the 36-bit date.
			throw TcDecodingException("cannot read a $bitCount-bit unsigned field at bit $position")
		}
		val field = readBits(bitCount)
		return field.toLongOrNull(radix = 2)
			?: throw TcDecodingException("bits at $position are not a binary field")
	}

	/** Read one bit as a flag. Parity with `BooleanEncoder`, where only `1` is true. */
	fun readFlag(): Boolean = readBits(1) == "1"

	/**
	 * Read [bitCount] bits as a two-letter code, the `LangEncoder` rule: the field is halved and
	 * each half is a letter's distance from `A`.
	 *
	 * A half wider than six bits cannot name a letter. `LangEncoder` checks that on the way out
	 * but not on the way in, so a hand-edited 12-bit field past `ZZ` decodes there and throws
	 * here; both directions check here.
	 */
	fun readLetters(bitCount: Int): String {
		if (bitCount <= 0 || bitCount % 2 != 0) {
			throw TcDecodingException("a two-letter field needs an even bit count, got $bitCount")
		}
		val field = readBits(bitCount)
		val half = bitCount / 2
		return buildString(2) {
			append(letterOf(field.substring(0, half)))
			append(letterOf(field.substring(half)))
		}
	}

	/**
	 * Read a fixed bitfield of [bitCount] bits and return the ids it sets, leftmost bit first.
	 * This is `FixedVectorEncoder`: purposes and special features are always this shape, and only
	 * the vendor lists move between a bitfield and ranges.
	 */
	fun readFixedIds(bitCount: Int): List<Int> {
		val field = readBits(bitCount)
		return field.mapIndexedNotNull { index, bit -> if (bit == '1') index + 1 else null }
	}

	/** Read [bitCount] bits verbatim, for a section whose layout its own header decides. */
	fun readBits(bitCount: Int): String {
		if (bitCount < 0) {
			throw TcDecodingException("cannot read a negative number of bits")
		}
		if (bitCount > remaining) {
			throw TcDecodingException(
				"TC string segment is truncated: $bitCount bits needed at bit $position, $remaining left",
			)
		}
		val field = bits.substring(position, position + bitCount)
		position += bitCount
		return field
	}

	/**
	 * The bits between two recorded positions, oldest first.
	 *
	 * A vendor section has to hand its payload back verbatim -- see [TcVectorSection] for why a
	 * normalised copy is a different string -- and the payload's length is only known after it has
	 * been walked. So the walker notes where it started, reads through, and lifts the span here.
	 */
	fun bitsBetween(from: Int, until: Int): String {
		if (from < 0 || until < from || until > position) {
			throw TcDecodingException("cannot lift bits $from..$until with the cursor at $position")
		}
		return bits.substring(from, until)
	}

	private fun letterOf(half: String): Char {
		val distance = half.toIntOrNull(radix = 2)
			?: throw TcDecodingException("letter field holds \"$half\"")
		if (distance > LAST_LETTER_VALUE) {
			throw TcDecodingException("a two-letter field holds a value past Z")
		}
		return 'A' + distance
	}

	internal companion object {
		/** The widest unsigned value a `Long` carries: 63 bits, against a 36-bit format maximum. */
		internal const val MAX_UNSIGNED_BITS = 63

		private const val LAST_LETTER_VALUE = 25
	}
}
