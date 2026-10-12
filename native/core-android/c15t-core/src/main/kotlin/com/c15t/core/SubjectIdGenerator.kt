package com.c15t.core

import com.c15t.core.spi.Clock
import java.math.BigInteger
import java.security.SecureRandom

/**
 * Supplies the random half of a generated id.
 *
 * The seam exists so a test can pin an id instead of drawing a real one; production
 * always uses [SECURE]. A source that repeats bytes repeats identities, so there is
 * deliberately no deterministic default.
 */
fun interface SubjectEntropy {
	/** Return [count] fresh random bytes. */
	fun nextBytes(count: Int): ByteArray

	companion object {
		/**
		 * One [SecureRandom] for the process, drawn per id. It is thread safe, and
		 * reusing it keeps each draw cheap instead of reseeding on every subject.
		 */
		val SECURE = SubjectEntropy { count ->
			ByteArray(count).also { secureRandom.nextBytes(it) }
		}

		private val secureRandom = SecureRandom()
	}
}

/**
 * Generates the c15t subject id.
 *
 * Byte-for-byte the same as `generateSubjectId` in `@c15t/core`, so the backend sees
 * one id format no matter which SDK wrote it. The wire format is not cosmetic:
 * `POST /subjects` validates `subjectId` against `subjectIdSchema` in
 * `@c15t/schema`, which answers anything else with `INPUT_VALIDATION_FAILED`, and a
 * native install whose ids are rejected never drains its pending-save queue.
 *
 * The 20-byte buffer is the timestamp offset from [EPOCH_MILLIS] as eight big-endian
 * bytes, then [RANDOM_BYTES] random bytes, all of it base58-encoded behind a `sub_`
 * prefix. The prefix costs a backend rejection; the timestamp costs chronological
 * ordering; the random half is the only part that carries entropy, and it is never a
 * hardware identifier.
 */
class SubjectIdGenerator(
	private val clock: Clock = Clock.SYSTEM,
	private val entropy: SubjectEntropy = SubjectEntropy.SECURE,
) {
	/**
	 * Mint one id.
	 *
	 * @throws IllegalArgumentException if [entropy] returns bytes other than [RANDOM_BYTES].
	 */
	fun generate(): String {
		val random = entropy.nextBytes(RANDOM_BYTES)
		// Shorter would silently leave zero bytes where entropy belongs, which reads
		// as a valid id while weakening it.
		require(random.size == RANDOM_BYTES) {
			"c15t: subject entropy must return $RANDOM_BYTES bytes, got ${random.size}"
		}
		val buffer = ByteArray(TOTAL_BYTES)
		writeTimestamp(clock.nowMillis() - EPOCH_MILLIS, buffer)
		random.copyInto(buffer, destinationOffset = TIMESTAMP_BYTES)
		return ID_PREFIX + base58Encode(buffer)
	}

	/**
	 * Stamp [offset] across the first eight bytes, big-endian.
	 *
	 * The unsigned shift on a signed [offset] is what puts a clock behind the epoch,
	 * which makes [offset] negative, on the same two's-complement bytes the web SDK
	 * writes through `setUint32`. Clamp nothing: a device whose clock is wrong still
	 * owes the backend an id it accepts.
	 */
	private fun writeTimestamp(offset: Long, buffer: ByteArray) {
		for (index in 0 until TIMESTAMP_BYTES) {
			buffer[index] = (offset ushr ((TIMESTAMP_BYTES - 1 - index) * 8)).toByte()
		}
	}

	/**
	 * Base58 of [buffer] read as one unsigned big integer, most significant digit
	 * first, plus one `1` per leading zero byte: dropping those bytes would drop
	 * information the web SDK keeps.
	 */
	private fun base58Encode(buffer: ByteArray): String {
		val digits = StringBuilder()
		var magnitude = BigInteger(1, buffer)
		while (magnitude > BigInteger.ZERO) {
			val (quotient, digit) = magnitude.divideAndRemainder(BASE58_DIVISOR)
			digits.append(BASE58_ALPHABET[digit.toInt()])
			magnitude = quotient
		}
		for (byte in buffer) {
			if (byte.toInt() != 0) {
				break
			}
			digits.append(BASE58_ALPHABET[0])
		}
		return digits.reverse().toString()
	}

	companion object {
		/**
		 * Mint one id from the wall clock and [SubjectEntropy.SECURE]. The production
		 * form; inject a [Clock] and a [SubjectEntropy] to pin one instead.
		 */
		fun generate(): String = default.generate()

		/**
		 * Whether [candidate] is an id this generator writes, and therefore an id the
		 * producer accepts: `^sub_[1-9A-HJ-NP-Za-km-z]+$`, the pattern in
		 * `subjectIdSchema` in `packages/schema/src/api/subject/post.ts`.
		 *
		 * This is the gate for adopting a *stored* id too, not just for minting a new
		 * one. `native/CONTRACT.md` puts the read side of the format rule the same way
		 * the write side: an id the producer will not accept is an identity this build
		 * cannot use, and it is worth nothing. The legacy UUID shape is not an exception
		 * -- see [isLegacyUuidShape] for the one thing it is good for.
		 */
		fun isValid(candidate: String): Boolean {
			if (!candidate.startsWith(ID_PREFIX) || candidate.length == ID_PREFIX.length) {
				return false
			}
			return candidate.substring(ID_PREFIX.length).all { it in BASE58_ALPHABET }
		}

		/**
		 * Whether [candidate] is the lowercase UUID v4 shape this SDK minted before
		 * [SubjectIdGenerator] existed.
		 *
		 * Diagnosis only, and deliberately separate from [isValid]: recognising the
		 * legacy shape is how a host explains to a user why they are being asked again,
		 * and it is never a reason to adopt an id. Every id matched here is one the
		 * producer answers with `INPUT_VALIDATION_FAILED`. Uppercase UUIDs are IDFV and
		 * ADID, and this matches lowercase only, which is the form this SDK alone wrote.
		 */
		fun isLegacyUuidShape(candidate: String): Boolean {
			if (candidate.length != UUID_LENGTH) {
				return false
			}
			for (index in 0 until UUID_LENGTH) {
				val char = candidate[index]
				if (index in UUID_HYPHENS) {
					if (char != '-') {
						return false
					}
				} else if (!char.isDigit() && char !in 'a'..'f') {
					return false
				}
			}
			return candidate[UUID_VERSION_INDEX] == '4' && candidate[UUID_VARIANT_INDEX] in "89ab"
		}

		private val default = SubjectIdGenerator()

		private const val ID_PREFIX = "sub_"

		private const val UUID_LENGTH = 36
		private val UUID_HYPHENS = setOf(8, 13, 18, 23)
		private const val UUID_VERSION_INDEX = 14
		private const val UUID_VARIANT_INDEX = 19

		/** The web SDK's custom epoch: 2023-11-14T22:13:20Z. */
		private const val EPOCH_MILLIS = 1_700_000_000_000L

		private const val TIMESTAMP_BYTES = 8
		private const val RANDOM_BYTES = 12
		private const val TOTAL_BYTES = TIMESTAMP_BYTES + RANDOM_BYTES

		/** Bitcoin's alphabet, shared with the server: no `0`, `O`, `I`, or `l`. */
		private const val BASE58_ALPHABET =
			"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

		private val BASE58_DIVISOR = BigInteger.valueOf(58)
	}
}
