package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

/**
 * Encodes the fixtures' own input and compares bytes against `expected.encode.tcString`.
 *
 * Only where `expects.encode` is true -- 17 of the 27. Byte equality is the whole assertion; two
 * decoded models agreeing would not be, because a TC String is forwarded to vendors and audited as
 * a byte string, and "means the same thing, different bytes" is a different record.
 *
 * Every value the encoder needs comes from the fixture rather than being invented here: the model,
 * the vendor list with its per-vendor purpose lists, and the two versions as scalars. Nothing is
 * substituted on the way in -- in particular the app's own consent language is passed through and
 * the codec is expected to overwrite it the way the reference does, which
 * [consentLanguageComesFromTheVendorList] checks as its own claim.
 *
 * There is no exemption in this class, and there used to be two. Both closed when the codec grew
 * the reference's semantic pre-pass, [TcSemanticPreEncoder], which clears the signals the framework
 * refuses before any bit is written. Anything that reopens one must fail an assertion here, in a
 * message that names the fixture, rather than be recorded as a known difference.
 */
class TcStringEncodeTest {
	private val fixtures = TcStringFixtures.load()

	@Test
	fun `every encode-graded fixture comes back byte for byte`() {
		encodeGraded().forEach { fixture ->
			assertInsideAuthorableSubset(fixture)
			val authored = TcStringEncoder.encode(inputFor(fixture))

			assertEquals(
				fixture.encoded,
				authored,
				"${fixture.id}: encoder produced $authored, the manifest says ${fixture.encoded}. " +
					"Compare the segments; do not reconcile by comparing decoded fields.",
			)
			assertEquals(
				fixture.expectedSegmentTypes,
				segmentTypesOf(authored),
				"${fixture.id}: right bytes but a different segment sequence",
			)
			assertEquals(fixture.expectedSegments, authored.split('.'), "${fixture.id}: a segment differs")
		}
	}

	/**
	 * The claim count, as a failure rather than a line of output.
	 *
	 * Every graded half of every `tc-string` fixture must be exercised. `expected` below is derived
	 * from `index.json`, so the number cannot be talked down: if the vectors lane publishes another
	 * fixture, this run has to claim it or go red.
	 */
	@Test
	fun `every graded half of every fixture is claimed`() {
		val decodeGraded = fixtures.count { it.expectsDecode }
		val encodeGraded = encodeGraded()
		val notReproduced = encodeGraded.filterNot { TcStringEncoder.encode(inputFor(it)) == it.encoded }
		val byteExact = encodeGraded.size - notReproduced.size

		// Counted separately from the test above, which stops a graded half from going unexercised:
		// a byte assertion that never runs cannot fail, so the arithmetic has to fail on its own.
		// Both numbers are derived from index.json, so neither can be talked down -- if the vectors
		// lane publishes another fixture, this run claims it or goes red.
		assertEquals(
			fixtures.size,
			decodeGraded,
			"decode halves graded=${fixtures.size} asserted=$decodeGraded",
		)
		assertEquals(
			encodeGraded.size,
			byteExact,
			"encode halves graded=${encodeGraded.size} byte-exact=$byteExact, not reproduced by " +
				"this codec: ${notReproduced.map { it.id }}",
		)

		val unclaimed = (fixtures.size - decodeGraded) + (encodeGraded.size - byteExact)
		assertEquals(0, unclaimed, "unclaimed graded halves: $unclaimed")

		println(
			"TC STRING CLAIMS: claimed=${fixtures.size}/${fixtures.size} unclaimed=0  " +
				"(decode ${fixtures.size}, encode ${encodeGraded.size}: $byteExact byte-exact, " +
				"0 declared divergence)",
		)
	}

	/**
	 * The language in the bytes belongs to the vendor list, not to the app.
	 *
	 * `SemanticPreEncoder.process` assigns `gvl.language` over the model's ConsentLanguage on every
	 * encode, so the app's locale cannot reach the string by any route. [TcConsentInput] therefore
	 * carries no consent language at all: web exposes `config.consentLanguage ?? 'EN'`, and web's own
	 * encoder then discards it, which is a setting that silently stops working rather than a default.
	 *
	 * This asks the vectors where the two languages disagree, which is the only place the reference's
	 * output can settle it. `tc-string-parity-consent-language-from-vendor-list` is one of them: the
	 * app said EN, the list said DE, and the recorded bytes say DE.
	 */
	@Test
	fun `consent language comes from the vendor list and not the app`() {
		val disagreeing = encodeGraded().filter { it.model.consentLanguage != it.vendorList.language }
		assertTrue(
			disagreeing.isNotEmpty(),
			"no vector pairs an app language with a different vendor list language, " +
				"so nothing here can prove the override happened",
		)
		disagreeing.forEach { fixture ->
			val written = TcStringDecoder.decode(TcStringEncoder.encode(inputFor(fixture))).core.consentLanguage
			assertEquals(
				fixture.vendorList.language,
				written,
				"${fixture.id}: the app said ${fixture.model.consentLanguage}, the list said " +
					"${fixture.vendorList.language}, and the string has to say the list's",
			)
			assertNotEquals(
				fixture.model.consentLanguage,
				written,
				"${fixture.id}: the app's language survived, which the reference never permits",
			)
		}
		println("  CONSENT LANGUAGE overridden by the vendor list in ${disagreeing.size} vectors")
	}

	/**
	 * Fails loudly if a fixture asks this codec to author something outside the field set c15t's web
	 * codec writes. A skip would turn a real decision into a silent gap.
	 */
	private fun assertInsideAuthorableSubset(fixture: TcStringFixture) {
		val model = fixture.model
		val outside = buildList {
			if (model.useNonStandardTexts) add("useNonStandardTexts")
			if (model.purposeOneTreatment) add("purposeOneTreatment")
			if (model.publisherRestrictions.isNotEmpty()) add("publisherRestrictions")
			if (model.vendorsAllowed.isNotEmpty()) add("vendorsAllowed")
			if (model.supportOob) add("supportOOB")
			if (model.numCustomPurposes != 0) add("numCustomPurposes")
			if (model.publisherConsents.isNotEmpty()) add("publisherConsents")
			if (model.publisherLegitimateInterests.isNotEmpty()) add("publisherLegitimateInterests")
			if (model.publisherCustomConsents.isNotEmpty()) add("publisherCustomConsents")
			if (model.publisherCustomLegitimateInterests.isNotEmpty()) add("publisherCustomLegitimateInterests")
			if (model.createdMillis != model.lastUpdatedMillis) add("created!=lastUpdated")
			if (model.createdMillis % TcConsentInput.MILLIS_PER_DAY != 0L) add("created-not-a-utc-day")
		}
		assertTrue(
			outside.isEmpty(),
			"${fixture.id}: expects.encode is true but the input carries $outside, which this codec " +
				"declines to author. That needs a decision about the encoder, not a skip in the test.",
		)
	}

	private fun inputFor(fixture: TcStringFixture): TcConsentInput {
		val model = fixture.model
		return TcConsentInput(
			cmpId = model.cmpId,
			confirmedAtMillis = model.createdMillis,
			vendorList = fixture.vendorList,
			cmpVersion = model.cmpVersion,
			consentScreen = model.consentScreen,
			publisherCountryCode = model.publisherCountryCode,
			isServiceSpecific = model.isServiceSpecific,
			purposeConsents = model.purposeConsents,
			purposeLegitimateInterests = model.purposeLegitimateInterests,
			specialFeatureOptins = model.specialFeatureOptins,
			vendorConsents = model.vendorConsents,
			vendorLegitimateInterests = model.vendorLegitimateInterests,
			vendorsDisclosed = model.vendorsDisclosed,
		)
	}

	private fun encodeGraded(): List<TcStringFixture> = fixtures.filter { it.expectsEncode }

	private fun segmentTypesOf(encoded: String): List<Int> = encoded
		.split('.')
		.map { segment -> Base64Url.decodeToBits(segment).substring(0, TcSegmentType.BITS).toInt(radix = 2) }
}
