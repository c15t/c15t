package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

/**
 * Reads each shared fixture and writes it back, expecting the same bytes.
 *
 * This is the property that matters for storage: a string arrives from a shared preference or a
 * vendor SDK, something reads it, and it goes out again. Range encoding has no canonical form --
 * vendors 5 to 9 may be one entry or three -- so a decoder that normalised a payload to an id set
 * could not pass this, and would be rewriting somebody else's record on every save. It passes
 * because [TcVectorSection] carries the bits it was read with.
 *
 * Independent of [TcStringEncodeTest]: that one authors from a model, this one copies what it read.
 * A codec can get one right and the other wrong, and only the two together say the codec is whole.
 */
class TcStringRoundTripTest {
	private val fixtures = TcStringFixtures.load()

	/**
	 * The strings this build reads and declines to write, because two core fields carry more than
	 * the encoder is willing to say: publisher restrictions are a GVL-semantic structure and
	 * PurposeOneTreatment is a claim about the consent journey. c15t's web codec writes neither, so
	 * there is no web output to check a mobile version against.
	 *
	 * Asserted both ways: a string that stops needing a row fails, and a new one fails until it is
	 * written here with the field that causes it.
	 */
	private val declinesToReEmit: Set<String> = setOf(
		"tc-string-decode-purpose-one-treatment-global",
		"tc-string-decode-purpose-one-treatment-service-specific",
		"tc-string-decode-restrictions-empty-tail",
		"tc-string-decode-restrictions-mixed-single-and-range",
		"tc-string-decode-restrictions-three-types",
	)

	@Test
	fun `a string this build may write comes back byte for byte`() {
		val reEmitted = mutableListOf<String>()
		val declined = mutableListOf<String>()

		fixtures.forEach { fixture ->
			val decoded = TcStringDecoder.decode(fixture.encoded)
			val blocked = decoded.core.fieldBlockingEncode
			if (blocked == null) {
				assertEquals(
					fixture.encoded,
					TcStringEncoder.encode(decoded),
					"${fixture.id}: read and re-written as different bytes. The re-emit is a copy or " +
						"this build is editing strings it was only asked to read.",
				)
				reEmitted += fixture.id
			} else {
				val failure = assertFailsWith<TcEncodingException>("${fixture.id}: expected a refusal to re-emit") {
					TcStringEncoder.encode(decoded)
				}
				assertEquals(
					failure.message?.contains(blocked),
					true,
					"${fixture.id}: refused for \"${failure.message}\", which does not name $blocked",
				)
				declined += "${fixture.id}|$blocked"
			}
		}

		assertEquals(
			declinesToReEmit.sorted(),
			declined.map { it.substringBefore('|') }.sorted(),
			"the set of strings this build declines to re-emit moved: $declined",
		)
		assertEquals(
			fixtures.size,
			reEmitted.size + declined.size,
			"a fixture was neither re-emitted nor declined, which is how a skip becomes invisible",
		)
		println(
			"TC STRING ROUND TRIP: re-emitted byte-exact=${reEmitted.size}/${fixtures.size} " +
				"declined=${declined.size} (decode-only: publisherRestrictions, purposeOneTreatment)",
		)
	}

	/**
	 * The refusal names the field, so a caller can tell "this codec does not write that" from "this
	 * string is broken". Both are `TcEncodingException` versus a decoding failure, and the message
	 * carries the field either way.
	 */
	@Test
	fun `a declined re-emit says which field blocks it`() {
		fixtures
			.filter { declinesToReEmit.contains(it.id) }
			.forEach { fixture ->
				val blocked = TcStringDecoder.decode(fixture.encoded).core.fieldBlockingEncode
				assertEquals(
					true,
					blocked == "publisherRestrictions" || blocked == "purposeOneTreatment",
					"${fixture.id}: blocked by $blocked, which is not one of the two fields this codec declines",
				)
			}
	}
}
