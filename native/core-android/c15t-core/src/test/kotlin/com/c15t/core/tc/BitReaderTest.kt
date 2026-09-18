package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * The four reads and their writer, each against a bit position worked out in the comment.
 *
 * These are the primitives everything in `com.c15t.core.tc` is built from, so they are tested
 * against arithmetic rather than against the reference: if a read is off by one here, every offset
 * table in this package is off by one, and the failure has to point at the primitive.
 */
class BitReaderTest {
	@Test
	fun `readInt takes an unsigned field and moves the cursor by its width`() {
		// 231 bits of nothing, with three fields laid in at the offsets the core segment uses.
		val bits = StringBuilder("0".repeat(231))
			// Version at bit 0, 6 bits: 000010 = 2
			.replaceRange(0, 6, "000010")
			// CmpId at bit 78, 12 bits: 000000101010 = 42
			.replaceRange(78, 90, "000000101010")
			// MaxVendorId at bit 213, 16 bits: 0000000000001100 = 12
			.replaceRange(213, 229, "0000000000001100")
			.toString()
		val reader = BitReader(bits)

		assertEquals(0, reader.position)
		// @0 x6  = 000010 = 2
		assertEquals(2L, reader.readInt(6))
		assertEquals(6, reader.position, "a 6-bit read has to leave the cursor at 6")

		// Skip to 78 by reading the 72 bits between: created(36)@6 + lastUpdated(36)@42.
		assertEquals(0L, reader.readInt(36), "@6 x36 Created is all zero here")
		assertEquals(42, reader.position)
		assertEquals(0L, reader.readInt(36), "@42 x36 LastUpdated is all zero here")
		assertEquals(78, reader.position)
		// @78 x12 = 000000101010 = 32 + 8 + 2 = 42
		assertEquals(42L, reader.readInt(12))
		assertEquals(90, reader.position)

		// Jump the rest of the fixed head: consentScreen(6)@102, consentLanguage(12)@108,
		// vendorListVersion(12)@120, policyVersion(6)@132, two flags @138/@139,
		// specialFeatureOptIns(12)@140, purposes(24)@152, purposesLI(24)@176, oneTreatment(1)@200,
		// publisherCC(12)@201 -> 213. 123 bits, lifted as a bit string because readInt caps at the
		// width of a Long, which is a type limit and not a format one: the widest field in the
		// format is 36 bits.
		assertEquals(123, reader.readBits(213 - 90).length)
		// @213 x16 = 0000000000001100 = 8 + 4 = 12
		assertEquals(12L, reader.readInt(16))
		assertEquals(229, reader.position)
		assertEquals(2, reader.remaining, "231 bits total, 229 read")
	}

	@Test
	fun `readInt reaches the full width of a date field`() {
		// 2^35 = 34359738368, which is bit 35 of a 36-bit field: a one followed by 35 zeros.
		assertEquals(34359738368L, BitReader("1" + "0".repeat(35)).readInt(36))
		// Every bit set: 2^36 - 1 = 68719476735. The widest number this format can put in a field.
		assertEquals(68719476735L, BitReader("1".repeat(36)).readInt(36))
		// 2^35 + 1, to prove the low bit survives a wide read: 34359738369
		assertEquals(34359738369L, BitReader("1" + "0".repeat(34) + "1").readInt(36))
	}

	@Test
	fun `readLetters splits the field in half and reads one letter per half`() {
		// ConsentLanguage at @108 x12. 'E' is the 5th letter -> 4 -> 000100; 'N' is the 14th -> 13
		// -> 001101. Together 000100001101, which is 269 as one number -- and 269 is what a probe of
		// the reference prints for EN, which is how these two readings were checked against each
		// other.
		assertEquals("EN", BitReader("000100001101").readLetters(12))
		// 'D' -> 3 -> 000011, 'E' -> 4 -> 000100 => 000011000100 = 196
		assertEquals("DE", BitReader("000011000100").readLetters(12))
		// 'A' -> 0, 'A' -> 0: the all-zero field is a real code, not a missing one.
		assertEquals("AA", BitReader("000000000000").readLetters(12))
		// Z -> 25 -> 011001, so ZZ is 011001011001
		assertEquals("ZZ", BitReader("011001011001").readLetters(12))
		// Past Z is not a code: 26 in a half would be a brace.
		assertFailsWith<TcDecodingException> { BitReader("011010000000").readLetters(12) }
		assertFailsWith<TcDecodingException> { BitReader("00000000000").readLetters(11) }
	}

	@Test
	fun `readFlag takes one bit and only one means true`() {
		val reader = BitReader("10")
		assertTrue(reader.readFlag())
		assertEquals(1, reader.position)
		assertEquals(false, reader.readFlag())
	}

	@Test
	fun `readFixedIds numbers ids from the leftmost bit`() {
		// PurposesConsent at @152 x24 with purposes 1 and 2 given: the first two bits set, so
		// 110000000000000000000000, which reads as 12582912 as a number -- again what the reference
		// prints for the same two purposes, from the same left-to-right numbering the formats
		// document states: "Purpose 1 maps to the 0th bit, purpose 24 maps to the bit at index 23".
		assertEquals(
			listOf(1, 2),
			BitReader("110000000000000000000000").readFixedIds(24),
		)
		// SpecialFeatureOptIns at @140 x12, special feature 1: one bit at the far left, which reads
		// as 2048 = 2^11.
		assertEquals(listOf(1), BitReader("100000000000").readFixedIds(12))
		// The last bit of a 24-bit purpose field is purpose 24, not purpose 0 and not purpose 23.
		assertEquals(listOf(24), BitReader("0".repeat(23) + "1").readFixedIds(24))
		// Nothing set is an empty list, and a zero-width field reads as empty rather than throwing:
		// the publisher segment's custom purposes are exactly this when NumCustomPurposes is 0.
		assertEquals(emptyList(), BitReader("").readFixedIds(0))
	}

	@Test
	fun `a read past the end names the field that ran out`() {
		// Four bits of a 12-bit field: the shape of a TC string that was cut off mid-segment.
		val error = assertFailsWith<TcDecodingException> { BitReader("0000").readInt(12) }
		assertTrue(
			error.message.orEmpty().contains("12 bits needed at bit 0, 4 left"),
			"the message has to carry the width and what was left, was: ${error.message}",
		)
	}

	@Test
	fun `the writer writes what the reader reads, both directions`() {
		val writer = BitWriter()
			.appendInt(2L, 6) // version
			.appendInt(0L, 36) // created
			.appendInt(0L, 36) // lastUpdated
			.appendInt(42L, 12) // cmpId
			.appendInt(3L, 12) // cmpVersion
			.appendInt(1L, 6) // consentScreen
			.appendLetters("DE", 12) // consentLanguage
			.appendFlag(true) // isServiceSpecific
			.appendFixedIds(listOf(1, 2), 24) // purposes

		// Offsets as written: 6, +36=42, +36=78, +12=90, +12=102, +6=108, +12=120, +1=121, +24=145.
		assertEquals(145, writer.length)

		val reader = BitReader(writer.toBits())
		assertEquals(2L, reader.readInt(6))
		reader.readInt(36)
		reader.readInt(36)
		assertEquals(42L, reader.readInt(12))
		assertEquals(3L, reader.readInt(12))
		assertEquals(1L, reader.readInt(6))
		assertEquals("DE", reader.readLetters(12))
		assertEquals(true, reader.readFlag())
		assertEquals(listOf(1, 2), reader.readFixedIds(24))
		assertEquals(0, reader.remaining)
	}

	@Test
	fun `the writer refuses a value that does not fit instead of truncating it`() {
		// 64 in 6 bits would come back as 0, which is a version-0 TC string: a consent state changed
		// by the act of writing it.
		assertFailsWith<TcEncodingException> { BitWriter().appendInt(64L, 6) }
		// 63 is the largest 6-bit value, and it writes as 111111.
		assertEquals("111111", BitWriter().appendInt(63L, 6).toBits())
		assertFailsWith<TcEncodingException> { BitWriter().appendInt(-1L, 6) }
		// A purpose id past the field cannot be a purpose, and silently dropping it would read back
		// as that purpose being denied.
		assertFailsWith<TcEncodingException> { BitWriter().appendFixedIds(listOf(25), 24) }
		assertFailsWith<TcEncodingException> { BitWriter().appendFixedIds(listOf(0), 24) }
		assertFailsWith<TcEncodingException> { BitWriter().appendLetters("ENG", 12) }
		assertFailsWith<TcEncodingException> { BitWriter().appendLetters("1N", 12) }
	}

	@Test
	fun `a two-letter code writes each letter into half the field`() {
		// 'D'=3 -> 000011, 'E'=4 -> 000100, so DE is 000011000100 in a 12-bit field.
		assertEquals("000011000100", BitWriter().appendLetters("DE", 12).toBits())
		// Lowercase is what a caller has after reading a locale tag, and the format is uppercase.
		assertEquals("000011000100", BitWriter().appendLetters("de", 12).toBits())
	}
}
