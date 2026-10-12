package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * The alphabet, and the padding rule that decides how long a segment comes out.
 *
 * Every expected value is worked out in the comment above it, so the claim can be checked without
 * running anything.
 */
class Base64UrlTest {
	@Test
	fun `the alphabet is base64 with the two url substitutions`() {
		assertEquals(64, Base64Url.DICT.length, "a 64-value alphabet is what makes a character 6 bits")
		// Positions 62 and 63 are the whole difference from base64, which uses '+' and '/'.
		assertEquals('-', Base64Url.DICT[62])
		assertEquals('_', Base64Url.DICT[63])
		// And the first two, because a typo at the front is invisible from the back.
		assertEquals('A', Base64Url.DICT[0])
		assertEquals('B', Base64Url.DICT[1])
	}

	@Test
	fun `one character is six bits read big-endian`() {
		// 000000 = 0  -> DICT[0]  = 'A'
		assertEquals("AAAA", Base64Url.encodeBits("000000"))
		// 000001 = 1  -> DICT[1]  = 'B'
		assertEquals("BAAA", Base64Url.encodeBits("000001"))
		// 010000 = 16 -> DICT[16] = 'Q'
		assertEquals("QAAA", Base64Url.encodeBits("010000"))
		// 111111 = 63 -> DICT[63] = '_'
		assertEquals("_AAA", Base64Url.encodeBits("111111"))
		// 111110 = 62 -> DICT[62] = '-'
		assertEquals("-AAA", Base64Url.encodeBits("111110"))
		// 100001 = 33 -> DICT[33]: lowercase starts at 26, so 26 + 7 -> 'h'
		assertEquals("hAAA", Base64Url.encodeBits("100001"))
	}

	@Test
	fun `the tail is padded to a multiple of twenty-four bits and not of six`() {
		// lcm(6, 8) = 24. Six bits of payload is therefore four characters and not one, and a writer
		// that padded to the next multiple of 6 would emit a shorter, still-decodable, *different*
		// string for the same consent state. Every length below is payload bits, then the padding
		// that rounds it up to 24, then that divided by 6.
		assertEquals(4, Base64Url.encodeBits("111111").length) //  6 -> 24 -> 4
		assertEquals(4, Base64Url.encodeBits("1".repeat(18)).length) // 18 -> 24 -> 4
		assertEquals(4, Base64Url.encodeBits("1".repeat(24)).length) // 24 -> 24 -> 4, no padding
		assertEquals(8, Base64Url.encodeBits("1".repeat(25)).length) // 25 -> 48 -> 8
		// A core segment holding one consented vendor is 231 bits: 231 % 24 = 15, so 9 zeros of
		// padding, 240 bits, 40 characters. Padding to 6 would have answered 39.
		assertEquals(40, Base64Url.encodeBits("1".repeat(231)).length)
		// 237 % 24 = 21, so 3 zeros, 240 bits, 40 characters: the same length as 231 by a different
		// route, which is the trap in reading length as a proxy for content.
		assertEquals(40, Base64Url.encodeBits("1".repeat(237)).length)
	}

	@Test
	fun `decode turns each character back into its six bits`() {
		assertEquals("000000", Base64Url.decodeToBits("A"))
		assertEquals("000001", Base64Url.decodeToBits("B"))
		// Two is 000010, and the leading zeros are exactly why decode cannot parse a number per
		// character and rejoin them: "2" alone would lose four of the six.
		assertEquals("000010", Base64Url.decodeToBits("C"))
		assertEquals("111110", Base64Url.decodeToBits("-"))
		assertEquals("111111", Base64Url.decodeToBits("_"))
		// 33 -> 'h', as above.
		assertEquals("100001", Base64Url.decodeToBits("h"))
	}

	@Test
	fun `round trip through base64url keeps every bit`() {
		val bits = "000010" + "0".repeat(30) + "1" + "0111111111"
		// 6 + 30 + 1 + 10 = 47 bits. 47 % 24 = 23, so one zero of padding takes it to 48 and decode
		// hands all 48 back. That one bit is owned by no field, which is why TcStringDecoder forgives
		// a tail of up to five bits only when every one of them is zero.
		assertEquals(47, bits.length)
		assertEquals(bits + "0", Base64Url.decodeToBits(Base64Url.encodeBits(bits)))
	}

	@Test
	fun `anything outside the alphabet is refused`() {
		// '+' and '/' are base64's, from a string that got encoded somewhere it should not have been.
		assertFailsWith<TcDecodingException> { Base64Url.decodeToBits("AB+C") }
		assertFailsWith<TcDecodingException> { Base64Url.decodeToBits("AB/C") }
		// '=' padding is base64's too, and read here it would mean six bits that nobody wrote.
		assertFailsWith<TcDecodingException> { Base64Url.decodeToBits("AAA=") }
		// An empty segment is what an empty TC string splits into. The reference refuses it as well.
		assertFailsWith<TcDecodingException> { Base64Url.decodeToBits("") }
		assertFailsWith<TcEncodingException> { Base64Url.encodeBits("") }
		assertFailsWith<TcEncodingException> { Base64Url.encodeBits("012") }
	}
}
