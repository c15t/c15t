package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * The packing choice, pinned against `VendorVectorEncoder.encode` in the installed oracle.
 *
 * [TcVectorSection.ofIds] reimplements the reference's smaller-of-two walk rather than picking the
 * packing this build prefers, because the packing is part of the bytes and web's bytes are the
 * parity target. Every expectation below is both hand-computed and confirmed by running
 * `VendorVectorEncoder.encode(new Vector().set(ids))` in `@iabtechlabtcf/core@1.5.21` in this
 * worktree; the bit counts in the comments are the arithmetic, so a reader can check the choice
 * without running anything.
 *
 * The arithmetic, all widths from `BitLength.js`:
 *
 * ```text
 * header          = maxId(16) + encodingType(1)                    = 17
 * bitFieldLength  = header + maxId
 * minRangeLength  = vendorId(16)*2 + singleOrRange(1) + numEntries(12) = 45
 * rangeLength     = header + numEntries(12)                        = 29, then grows
 * take the range  = maxId > 45 && rangeLength < bitFieldLength, re-tested at every id
 * ```
 */
class TcVectorSectionTest {
	@Test
	fun `an empty vector writes the 17-bit header and nothing else`() {
		val section = TcVectorSection.ofIds(emptyList())
		assertEquals(0, section.maxId, "no id to reach")
		assertEquals(TcVectorEncoding.FIXED_BITFIELD, section.encoding)
		assertEquals(HEADER_BITS, section.bitLength, "maxId 0 means a 0-bit payload")
		assertTrue(section.ids.isEmpty())
	}

	/**
	 * Below the threshold a bitfield always wins, and the threshold is strict.
	 *
	 * At maxId 45 the guard `maxId > 45` is false, so the walk never opens a range even though a
	 * single range entry would cost 12 + 1 + 16 + 16 = 45 payload bits against 45 bitfield bits --
	 * a tie the reference resolves in favour of the bitfield by never asking the question. At maxId
	 * 46 the guard passes and one entry costs 45 payload bits against 46, so the range wins by one.
	 */
	@Test
	fun `the range only wins past 45 and by one bit at that`() {
		val justBelow = TcVectorSection.ofIds((1..45).toList())
		assertEquals(TcVectorEncoding.FIXED_BITFIELD, justBelow.encoding, "maxId 45 fails a strict > 45")
		assertEquals(62, justBelow.bitLength, "17 + 45")

		val justAbove = TcVectorSection.ofIds((1..46).toList())
		assertEquals(TcVectorEncoding.RANGE, justAbove.encoding, "maxId 46: 45 payload bits beats 46")
		assertEquals(62, justAbove.bitLength, "17 + 12 + 1 + 16 + 16")
		assertEquals(listOf(TcIdRange(1, 46)), justAbove.rangeEntries, "one contiguous run")
		assertEquals((1..46).toList(), justAbove.ids, "the entry still expands to 46 ids")
	}

	/**
	 * The walk charges a lone id 16 bits while the writer spends 17, and the difference decides a
	 * tie.
	 *
	 * {1, 46}: two single ids, so the walk adds 16 + 16 to its running 29 and ends on 61 against a
	 * bitFieldLength of 17 + 46 = 63, which reads as "the range is smaller". What it writes is
	 * 17 + 12 + (1+16) + (1+16) = 63 bits -- the same length as the bitfield it just rejected. The
	 * reference emits the range anyway, and `VendorVectorEncoder.encode` returns 63 bits of range for
	 * this input, so matching it means reproducing the undercount, not correcting it.
	 */
	@Test
	fun `a lone id is costed at 16 bits during the walk and written as 17`() {
		val section = TcVectorSection.ofIds(listOf(1, 46))
		assertEquals(TcVectorEncoding.RANGE, section.encoding, "the walk sees 61 < 63 and picks the range")
		assertEquals(63, section.bitLength, "17 + 12 + 17 + 17, which equals the bitfield it beat")
		assertEquals(listOf(TcIdRange(1, 1), TcIdRange(46, 46)), section.rangeEntries, "IsARange 0, so no EndVendorId")
	}

	/**
	 * Sparse ids past the threshold, which is the case the 16-bit MaxVendorId exists for.
	 *
	 * The live GVL carries 1214 vendors, so a section this wide is ordinary production data and not
	 * a stretch: 1, 2 and 65535 as a bitfield would be 17 + 65535 bits, and as ranges it is
	 * 17 + 12 + (1+16+16) + (1+16) = 79. A decoder or encoder that stopped caring past 40 ids would
	 * be unusable, and a range reaching 65535 has to survive a round trip.
	 */
	@Test
	fun `a range section reaches the full 16-bit id space`() {
		val section = TcVectorSection.ofIds(listOf(1, 2, 65535))
		assertEquals(65535, section.maxId, "MaxVendorId is 16 bits, not a small-intentioned cap")
		assertEquals(TcVectorEncoding.RANGE, section.encoding)
		assertEquals(79, section.bitLength, "17 + 12 + 33 + 17")
		assertEquals(listOf(TcIdRange(1, 2), TcIdRange(65535, 65535)), section.rangeEntries)

		val roundTripped = TcVectorSection.read(BitReader(section.writeToBits()))
		assertEquals(section.payloadBits, roundTripped.payloadBits, "read after write keeps the payload")
		assertEquals(section.ids, roundTripped.ids)
	}

	@Test
	fun `a dense low-id vector keeps the bitfield`() {
		// maxId 30: bitFieldLength 47, and the guard `30 > 45` never passes, so no range is opened.
		val section = TcVectorSection.ofIds(listOf(2, 3, 4, 30))
		assertEquals(TcVectorEncoding.FIXED_BITFIELD, section.encoding)
		assertEquals(47, section.bitLength, "17 + 30")
		assertEquals(listOf(2, 3, 4, 30), section.ids, "ids are numbered from the leftmost bit as 1")
	}

	/**
	 * A range whose end sits below its start, which the two halves of the reference disagree about.
	 *
	 * `VendorVectorEncoder.decode` loops `for (j = firstId; j <= secondId; j++)` and so contributes
	 * nothing for a reversed pair; `PurposeRestrictionVectorEncoder.decode` throws on the same
	 * shape. That is an inconsistency in the oracle, not a choice available to a decoder that wants
	 * to be consistent, so both behaviours are pinned as they are instead of being smoothed over --
	 * and the vendor side is read-and-kept rather than dropped, since the payload bits survive.
	 */
	@Test
	fun `a reversed range yields no ids in a vendor section and throws in a restriction`() {
		val reversed = BitWriter()
			.appendInt(1L, 12) // NumEntries = 1
			.appendFlag(true) // IsARange = 1
			.appendInt(9L, 16) // StartOrOnlyVendorId = 9
			.appendInt(4L, 16) // EndVendorId = 4, below the start
		val section = TcVectorSection(9, TcVectorEncoding.RANGE, reversed.toBits())
		assertTrue(section.ids.isEmpty(), "the reference's vendor loop adds nothing when end < start")
		assertEquals(1, section.rangeEntries.size, "the entry is still there, and its bits still survive a re-emit")
		assertEquals(TcIdRange(9, 4), section.rangeEntries.single())

		val restriction = BitWriter()
			.appendInt(1L, 12) // NumPubRestrictions = 1
			.appendInt(2L, 6) // PurposeId = 2
			.appendInt(1L, 2) // RestrictionType = 1
			.appendInt(1L, 12) // NumEntries = 1
			.appendFlag(true) // IsARange = 1
			.appendInt(9L, 16)
			.appendInt(4L, 16)
		val failure = assertFailsWith<TcDecodingException>("the restriction decoder refuses the same bits") {
			TcPublisherRestrictions.read(BitReader(restriction.toBits()))
		}
		assertTrue(
			failure.message?.contains("counts backwards") == true,
			"refused with \"${failure.message}\" instead of naming the backwards range",
		)
	}

	@Test
	fun `an id the field cannot hold is refused instead of truncated`() {
		val failure = assertFailsWith<TcEncodingException>("65536 does not fit in 16 bits") {
			TcVectorSection.ofIds(listOf(65536))
		}
		assertTrue(
			failure.message?.contains("does not fit") == true,
			"refused with \"${failure.message}\"",
		)
		assertFailsWith<TcEncodingException>("vendor ids start at 1") { TcVectorSection.ofIds(listOf(0)) }
	}

	private fun TcVectorSection.writeToBits(): String {
		val writer = BitWriter()
		write(writer)
		return writer.toBits()
	}

	private companion object {
		private const val HEADER_BITS = 17
	}
}
