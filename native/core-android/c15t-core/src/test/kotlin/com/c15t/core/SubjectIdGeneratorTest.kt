package com.c15t.core

import com.c15t.core.spi.Clock
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * The subject id generator, checked against the web SDK it has to agree with.
 *
 * Two things make an id here more than a local detail. The backend rejects any
 * `subjectId` outside `subjectIdSchema`, so a wrong encoding is a device whose
 * consent never lands; and the same table of vectors runs against the Swift core, so
 * a Kotlin-only change of shape would split one install's identity across two ports.
 */
class SubjectIdGeneratorTest {
	@Test
	fun `the vectors shared with the Swift port encode byte for byte`() {
		for ((position, vector) in vectors.withIndex()) {
			val generator = SubjectIdGenerator(
				clock = Clock { vector.nowMillis },
				entropy = entropyFor(vector.randomHex),
			)

			assertEquals(
				vector.expected,
				generator.generate(),
				"vector ${position + 1}: ${vector.randomHex} at ${vector.nowMillis}",
			)
		}
	}

	@Test
	fun `every id carries the format the backend validates`() {
		// Verbatim from subjectIdSchema in packages/schema/src/api/subject/post.ts:
		// anything else is an HTTP 400 and a queue that never drains.
		val schema = Regex("^sub_[1-9A-HJ-NP-Za-km-z]+$")

		repeat(50) {
			val id = SubjectIdGenerator.generate()
			assertTrue(schema.matches(id), "$id is not accepted by subjectIdSchema")
		}

		val pinned = SubjectIdGenerator(clock = Clock { 1_750_000_000_000L })
		repeat(50) {
			assertTrue(schema.matches(pinned.generate()), "an injected clock cannot change the shape")
		}
	}

	@Test
	fun `a thousand ids are a thousand identities`() {
		val ids = List(1_000) { SubjectIdGenerator.generate() }
		assertEquals(1_000, ids.distinct().size, "a repeated id is two installs, one subject")
	}

	@Test
	fun `each id draws its own twelve random bytes`() {
		val requested = mutableListOf<Int>()
		var draw = 0
		val generator = SubjectIdGenerator(
			clock = Clock { 1_700_000_000_001L },
			entropy = SubjectEntropy { count ->
				requested += count
				draw += 1
				// Distinct per draw, so a reused buffer would show up as a duplicate id.
				ByteArray(count) { index -> if (index == 0) draw.toByte() else 0 }
			},
		)

		val ids = List(3) { generator.generate() }

		assertEquals(listOf(12, 12, 12), requested, "one draw per id, and always the full twelve")
		assertEquals(3, ids.distinct().size, "ids must not repeat while only the draw changed")
	}

	@Test
	fun `an entropy source with the wrong byte count is refused`() {
		// A short draw would otherwise be encoded as trailing zero bytes: a well
		// shaped id with most of its entropy quietly missing.
		val generator = SubjectIdGenerator(
			clock = Clock { 1_700_000_000_001L },
			entropy = SubjectEntropy { count -> ByteArray(count - 1) },
		)

		assertFailsWith<IllegalArgumentException> { generator.generate() }
	}

	private companion object {
		/**
		 * Shared with the Swift port and with the web SDK's own copy of this table in
		 * `packages/core`. [nowMillis] is the wall-clock reading the generator is pinned
		 * to, not the offset it encodes: the custom epoch is subtracted inside, the way
		 * `generateSubjectId` subtracts it from `Date.now()`. Reading the column as an
		 * offset still returns a well formed `sub_` id, so only the expected string
		 * catches the mistake.
		 * *
		 * The rows cover a negative offset, a positive one (what every real device
		 * produces), the seven leading zeros one millisecond past the epoch, and the
		 * buffer of nothing but leading zeros, where the division loop never runs.
		 */
		val vectors = listOf(
			Vector("000000000000000000000000", 1L, "sub_4Zrjtb44miwSTU2EYMYtuVWfaAPR"),
			Vector(
				"000000000000000000000001",
				58_123_456_789L,
				"sub_4ZrjtiRsJnoW34Px8dAvhPTKJiWc",
			),
			Vector(
				"ffffffffffffffffffffffff",
				58_123_456_789L,
				"sub_4ZrjtiRsJnoasFgQkJmLeDNrs7fC",
			),
			Vector(
				"01096a7b8c9d0e1f20ab11cd",
				-100_000_000_000L,
				"sub_4ZrjtNN3QTDfdH8RQdZEAE8ohrCk",
			),
			Vector(
				"a1b2c3d4e5f60718293a4b5c",
				58_123_456_789L,
				"sub_4ZrjtiRsJnoZ63G1p3FjTdWdHA6P",
			),
			Vector(
				"9a0f1c2b3d4e5f60718293ab",
				80_000_000_000L,
				"sub_4ZrjtmCtGLiMkPniH4rf1naxRKTp",
			),
			Vector(
				"000000000000000000000000",
				1_700_000_000_001L,
				"sub_11111115qCHTcgbQwpvYZQ9d",
			),
			Vector(
				"000000000000000000000000",
				1_700_000_000_000L,
				"sub_11111111111111111111",
			),
		)
	}

	/** One line of the shared table: the random half, the clock, the expected id. */
	private data class Vector(val randomHex: String, val nowMillis: Long, val expected: String)
}

/** Decode a hex string, so a vector reads as bytes rather than as a string of digits. */
private fun hexToBytes(hex: String): ByteArray = ByteArray(hex.length / 2) { index ->
	hex.substring(index * 2, index * 2 + 2).toInt(16).toByte()
}

/**
 * The vector's random half as an entropy source.
 *
 * The vectors carry exactly the twelve bytes the id encodes, so a size mismatch
 * here is a broken vector rather than a trim worth forgiving.
 */
private fun entropyFor(hex: String): SubjectEntropy = SubjectEntropy { count ->
	val bytes = hexToBytes(hex)
	require(bytes.size == count) { "vector carries ${bytes.size} random bytes, needs $count" }
	bytes
}
