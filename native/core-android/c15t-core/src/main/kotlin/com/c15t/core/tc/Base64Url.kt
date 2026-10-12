package com.c15t.core.tc

/**
 * The base64url alphabet TC Strings use, and the padding rule that goes with it.
 *
 * This is not standard base64: `-` and `_` stand in for `+` and `/`, and there is no `=`
 * padding character. The part worth the ceremony is that [encodeBits] pads the *bit string* to
 * a multiple of 24 bits before it groups six bits per character, which is the least common
 * multiple of the alphabet's basis (6) and a byte (8). It is why a 231-bit core segment becomes
 * 40 characters and not 39, and why a 259-bit one becomes 44 and not 44-and-a-bit.
 *
 * Matching that exactly is a byte-parity requirement and not a stylistic one: an encoder that
 * pads only up to the next multiple of 6 produces a valid-looking, decodable, *different*
 * string for the same consent state. The reference implementation pads the same way
 * (`Base64Url.LCM = 24` in `lib/mjs/encoder/Base64Url.js`), which is what makes the two
 * interchangeable on real strings.
 */
object Base64Url {
	/** The alphabet. Positions 62 and 63 are `-` and `_`, which is the whole difference from base64. */
	const val DICT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"

	/** Bits per character: log2 of the alphabet size. */
	const val BITS_PER_CHARACTER = 6

	/** lcm(6, 8). [encodeBits] zero-pads to this, matching `Base64Url.LCM` in the reference. */
	const val PADDING_BITS = 24

	/**
	 * Encode a bit string, zero-padding the tail to a multiple of [PADDING_BITS].
	 *
	 * @throws TcEncodingException if [bits] is empty or holds anything but `0` and `1`.
	 */
	fun encodeBits(bits: String): String {
		if (bits.isEmpty()) {
			throw TcEncodingException("refusing to base64url-encode an empty bit string")
		}
		bits.forEach { character ->
			if (character != '0' && character != '1') {
				throw TcEncodingException("a bit string holds \"$character\"")
			}
		}
		val remainder = bits.length % PADDING_BITS
		val padded = if (remainder == 0) bits else bits + "0".repeat(PADDING_BITS - remainder)
		return buildString(padded.length / BITS_PER_CHARACTER) {
			var index = 0
			while (index < padded.length) {
				append(DICT[padded.substring(index, index + BITS_PER_CHARACTER).toInt(radix = 2)])
				index += BITS_PER_CHARACTER
			}
		}
	}

	/**
	 * Decode base64url text into its bit string, six bits per character.
	 *
	 * The trailing padding bits come back with the rest, which is what the reference does and
	 * what makes it harmless: every segment reader stops at the last field it wants, so the
	 * padding is never looked at. It is also why a string whose padding bits are *not* zero
	 * still decodes, and cannot be re-encoded to the same bytes -- see
	 * `TcStringRoundTripTest`, where that case is named rather than tolerated quietly.
	 *
	 * @throws TcDecodingException if [encoded] is empty or holds a character outside [DICT].
	 */
	fun decodeToBits(encoded: String): String {
		if (encoded.isEmpty()) {
			throw TcDecodingException("empty base64url segment")
		}
		return buildString(encoded.length * BITS_PER_CHARACTER) {
			encoded.forEach { character ->
				val value = DICT.indexOf(character)
				if (value < 0) {
					throw TcDecodingException("\"$character\" is outside the base64url alphabet")
				}
				append(value.toString(radix = 2).padStart(BITS_PER_CHARACTER, '0'))
			}
		}
	}
}
