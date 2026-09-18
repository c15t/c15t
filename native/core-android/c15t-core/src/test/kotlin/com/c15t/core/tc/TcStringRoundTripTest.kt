package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

/**
 * Decode, re-encode, compare bytes.
 *
 * Byte equality and nothing else. Two decoded maps coming back equal is not the requirement -- the
 * requirement is that a string read from a device or a shared preference goes back out as the same
 * string that arrived, because a TC String is a legal record that gets forwarded to vendors and
 * audited, and a re-encode that "means the same thing" in different bytes is a tampered record.
 * Comparing decoded models would wave through exactly that, which is why [TcVectorSection] carries
 * its payload as the bits it was read with instead of a normalised id set.
 *
 * Skips are declared in [DECLARED_SKIPS] and judged in one place, so the set can neither grow nor
 * shrink in silence: a new field that blocks encoding fails here until it is written down with a
 * name, and a skip that stops being needed fails too. The counts print on every run.
 *
 * All strings come through [TcFixtureCorpus.cases], the provisional seam.
 */
class TcStringRoundTripTest {
	/**
	 * The cases this build reads and declines to write, and the field that stops each one.
	 *
	 * Both are core fields the reference supports and c15t's web codec never populates
	 * (`packages/iab/src/tcf/tc-string.ts` sets neither), so encoding them would be mobile inventing
	 * a consent semantic with no web output to check it against. Reading them is required and is
	 * asserted structurally in [TcStringCorpusTest]; writing them is refused rather than faked.
	 */
	private val declaredSkips: Map<String, String> = mapOf(
		"publisher-restrictions" to "publisherRestrictions",
		"purpose-one-treatment" to "purposeOneTreatment",
	)

	@Test
	fun `decode then encode gives back the same bytes`() {
		val claimed = mutableListOf<String>()
		val skipped = mutableListOf<Pair<String, String>>()
		val rejected = mutableListOf<String>()

		TcFixtureCorpus.cases().forEach { case ->
			when (case.outcome) {
				TcFixtureCorpus.Outcome.BYTE_EXACT_ROUND_TRIP -> {
					val reEncoded = TcStringEncoder.encode(TcStringDecoder.decode(case.encoded))
					assertEquals(
						case.encoded,
						reEncoded,
						"${case.id}: re-encode changed the bytes. Decoding is lossless or this test is wrong; " +
							"compare the two strings character by character, do not compare decoded fields.",
					)
					claimed += case.id
				}

				TcFixtureCorpus.Outcome.DECODE_ONLY -> {
					val blockedField = requireNotNull(case.blockedField) { "${case.id}: a DECODE_ONLY case names no field" }
					val decoded = TcStringDecoder.decode(case.encoded)
					// The refusal has to come from the field the case names, not from some unrelated
					// objection the encoder happens to have.
					assertEquals(blockedField, decoded.core.fieldBlockingEncode, "${case.id}: blocked by a different field than declared")
					val failure = assertFailsWith<TcEncodingException>("${case.id}: encode was expected to refuse") {
						TcStringEncoder.encode(decoded)
					}
					assertTrue(
						failure.message?.contains(blockedField) == true,
						"${case.id}: refused with \"${failure.message}\", which does not name \"$blockedField\"",
					)
					skipped += case.id to blockedField
				}

				TcFixtureCorpus.Outcome.REJECTED -> {
					// Never reaches an encoder: these are not strings, and encoding one would mean
					// decoding it first, which the corpus test already proves throws.
					rejected += case.id
				}
			}
		}

		assertEquals(
			TcFixtureCorpus.cases().size,
			claimed.size + skipped.size + rejected.size,
			"a corpus case went unclassified, which is how a skip becomes invisible",
		)
		assertEquals(
			declaredSkips.keys.sorted(),
			skipped.map { it.first }.sorted(),
			"the encode-side skip set moved. A new skip needs the field that causes it written " +
				"into DECLARED_SKIPS with a reason; a skip that disappeared should be deleted from there.",
		)
		assertEquals(
			declaredSkips.values.sorted(),
			skipped.map { it.second }.sorted(),
			"a skipped case now names a different blocking field than DECLARED_SKIPS records",
		)

		println(
			"TC STRING ROUND TRIP: claimed=${claimed.size} skipped=${skipped.size} " +
				"rejected=${rejected.size} total=${TcFixtureCorpus.cases().size}",
		)
		skipped.forEach { (id, field) -> println("  UNCLAIMED $id: decode-only, encoder declines $field") }
	}

	/**
	 * Authoring is not re-emitting, so it gets its own check: the defaults a caller leaves unset are
	 * the defaults the web codec leaves unset, and both date fields carry a UTC day rather than the
	 * millisecond they were handed.
	 *
	 * A parity vector that disagrees with web on any of the four defaults differs in the bytes before
	 * a single consent decision is encoded, and neither suite's tests would explain why.
	 */
	@Test
	fun `authored strings carry the web defaults and a day-granular timestamp`() {
		val authored = TcStringEncoder.encode(
			TcConsentInput(
				cmpId = CMP_ID,
				confirmedAtMillis = DAY_2026_09_18 + HALF_A_DAY + AN_HOUR,
				vendorListVersion = 177,
				policyVersion = POLICY_VERSION_5,
			),
		)
		val core = TcStringDecoder.decode(authored).core
		assertEquals(TcConsentInput.DEFAULT_CONSENT_SCREEN, core.consentScreen, "ConsentScreen @102 x6, web's `?? 1`")
		assertEquals(TcConsentInput.DEFAULT_CONSENT_LANGUAGE, core.consentLanguage, "ConsentLanguage @108 x12, web's `?? 'EN'`")
		assertEquals(TcConsentInput.DEFAULT_PUBLISHER_COUNTRY_CODE, core.publisherCountryCode, "PublisherCC @201 x12, web's `?? 'US'`")
		assertTrue(core.isServiceSpecific, "IsServiceSpecific @138 x1, web's `?? true`")
		// The clock reading was 12:30 past the day boundary and both fields came back on the day:
		// the format holds deciseconds since the epoch at day resolution, nothing finer.
		assertEquals(DAY_2026_09_18, core.createdMillis, "Created @6 x36 is floored to its UTC day")
		assertEquals(DAY_2026_09_18, core.lastUpdatedMillis, "LastUpdated @42 x36 is the same day")
		assertEquals(POLICY_VERSION_5, core.policyVersion, "a live string advertises the GVL's policy version, not 2")
	}

	private companion object {
		private const val CMP_ID = 1042
		private const val POLICY_VERSION_5 = 5

		/** 2026-09-18T00:00:00Z. */
		private const val DAY_2026_09_18 = 1_789_689_600_000L
		private const val HALF_A_DAY = 43_200_000L
		private const val AN_HOUR = 3_600_000L
	}
}
