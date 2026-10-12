package com.c15t.core.tc

/**
 * The bits of one TC String segment, in the order the segment writes them.
 *
 * The mirror of [BitReader] and the only way anything reaches [Base64Url.encodeBits]. It
 * accumulates a string of `0` and `1` characters rather than bytes because the segment widths
 * are not byte-aligned: the core segment ends on a 12-bit restriction count, and the reference
 * implementation is a string builder too, which is what makes the two comparable field by field.
 *
 * Every append checks the value against the width before writing it. `IntEncoder` in the
 * reference throws an `EncodingError` for a value that does not fit, and a codec that quietly
 * truncated instead would emit a string that decodes to a different consent state, which is the
 * one failure mode a consent tool cannot have.
 */
class BitWriter {
	private val bits = StringBuilder()

	/** Bits written so far, which is the offset the next field lands at. */
	val length: Int
		get() = bits.length

	/** Append [value] as an unsigned [bitCount]-bit field. */
	fun appendInt(value: Long, bitCount: Int): BitWriter {
		// BitReader's ceiling is reused so a field this class can write is one it can read back.
		if (bitCount <= 0 || bitCount > BitReader.MAX_UNSIGNED_BITS) {
			throw TcEncodingException("cannot write a $bitCount-bit field")
		}
		if (value < 0L) {
			throw TcEncodingException("$value does not fit in $bitCount unsigned bits")
		}
		val field = value.toString(radix = 2)
		if (field.length > bitCount) {
			throw TcEncodingException("$value is too large for $bitCount bits")
		}
		bits.append("0".repeat(bitCount - field.length))
		bits.append(field)
		return this
	}

	/** Append one flag bit, `1` for true. */
	fun appendFlag(value: Boolean): BitWriter {
		bits.append(if (value) '1' else '0')
		return this
	}

	/** Append [letters], two `A`-`Z` characters, as one half-field per character. */
	fun appendLetters(letters: String, bitCount: Int): BitWriter {
		if (bitCount <= 0 || bitCount % 2 != 0) {
			throw TcEncodingException("a two-letter field needs an even bit count, got $bitCount")
		}
		if (letters.length != 2) {
			throw TcEncodingException("expected a two-letter code, got \"$letters\"")
		}
		val half = bitCount / 2
		// Uppercased first, as LangEncoder does: a caller that got its code from a locale tag has it
		// lowercase, and the field is uppercase.
		letters.uppercase().forEach { character ->
			val distance = character.code - 'A'.code
			if (distance !in 0..LAST_LETTER_VALUE) {
				throw TcEncodingException("\"$letters\" is not a two-letter A-Z code")
			}
			if (distance > (1L shl half) - 1) {
				throw TcEncodingException("$character does not fit in $half bits")
			}
			appendInt(distance.toLong(), half)
		}
		return this
	}

	/**
	 * Append a fixed bitfield of [bitCount] bits with [ids] set, leftmost bit first, which is
	 * how the reference writes purposes and special features.
	 */
	fun appendFixedIds(ids: Collection<Int>, bitCount: Int): BitWriter {
		ids.forEach { id ->
			if (id < 1 || id > bitCount) {
				throw TcEncodingException("id $id is outside a $bitCount-bit fixed field")
			}
		}
		val set = ids.toSet()
		repeat(bitCount) { index ->
			bits.append(if (set.contains(index + 1)) '1' else '0')
		}
		return this
	}

	/** Append [value] verbatim, for a payload this class has no layout opinion about. */
	fun appendBits(value: String): BitWriter {
		value.forEach { character ->
			if (character != '0' && character != '1') {
				throw TcEncodingException("bit string holds \"$character\" at offset ${bits.length}")
			}
		}
		bits.append(value)
		return this
	}

	/** The accumulated bits, for [Base64Url.encodeBits]. */
	fun toBits(): String = bits.toString()

	private companion object {
		const val LAST_LETTER_VALUE = 25
	}
}
