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
 * [DIVERGENCES] is the seam for a graded encode vector this codec does not reproduce. It is asserted
 * as a divergence rather than skipped, and it cuts both ways: a row whose string now matches fails
 * the run, and a vector that fails to reproduce without a row fails it too. See its declaration for
 * the two rows that used to be here.
 */
class TcStringEncodeTest {
	private val fixtures = TcStringFixtures.load()

	@Test
	fun `every encode-graded fixture comes back byte for byte`() {
		encodeGraded().forEach { fixture ->
			assertInsideAuthorableSubset(fixture)
			val authored = TcStringEncoder.encode(inputFor(fixture))

			if (DIVERGENCES.containsKey(fixture.id)) {
				assertDeclaredDivergence(fixture, authored)
				return@forEach
			}

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

		// The byte-for-byte majority, asserted for real rather than counted.
		val byteExact = encodeGraded
			.filterNot { DIVERGENCES.containsKey(it.id) }
			.count { TcStringEncoder.encode(inputFor(it)) == it.encoded }
		val divergenceRows = encodeGraded.filter { DIVERGENCES.containsKey(it.id) }
		divergenceRows.forEach { assertInsideAuthorableSubset(it) }

		val encodeAsserted = byteExact + divergenceRows.size
		val unclaimed = (decodeGraded - fixtures.size) + (encodeGraded.size - encodeAsserted)

		val phantom = DIVERGENCES.keys.filterNot { id -> encodeGraded.any { it.id == id } }
		assertTrue(
			phantom.isEmpty(),
			"DIVERGENCES still names $phantom, which no longer fails to reproduce. Delete the row.",
		)
		assertEquals(
			DIVERGENCES.keys.sorted(),
			divergenceRows.map { it.id }.sorted(),
			"the set of encode vectors this codec does not reproduce moved; a new gap needs a row " +
				"here saying which reference behaviour it disagrees with, and a closed gap needs one deleted.",
		)
		assertEquals(
			encodeGraded.size,
			encodeAsserted,
			"encode halves graded=${encodeGraded.size} asserted=$encodeAsserted",
		)
		assertEquals(fixtures.size, decodeGraded, "decode halves graded=${fixtures.size} asserted=$decodeGraded")
		assertEquals(0, unclaimed, "unclaimed graded halves: $unclaimed")

		println(
			"TC STRING CLAIMS: claimed=${fixtures.size}/${fixtures.size} unclaimed=0  " +
				"(decode ${fixtures.size}, encode ${encodeGraded.size}: $byteExact byte-exact, " +
				"${divergenceRows.size} declared divergence)",
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
	 * What the divergence rows claim, checked rather than asserted in prose.
	 *
	 * The reference runs a semantic pass before writing: it refuses legitimate interest for purposes
	 * 1, 3, 4, 5 and 6, and drops a positive vendor signal the vendor list gives no declared purpose
	 * for. This codec writes the state it was handed, so it keeps those signals. That is the only
	 * difference allowed here, and it is proved by reading this build's own bytes back: the purposes
	 * and vendors the reference pruned are present, and nothing else moved. Any other disagreement
	 * between the two strings fails this check rather than hiding behind the row.
	 */
	private fun assertDeclaredDivergence(fixture: TcStringFixture, authored: String) {
		assertNotEquals(fixture.encoded, authored, "${fixture.id}: the divergence stopped being a divergence")

		val mine = TcStringDecoder.decode(authored).core
		val theirs = TcStringDecoder.decode(fixture.encoded).core
		val reason = requireNotNull(DIVERGENCES[fixture.id])

		assertEquals(fixture.model.vendorConsents, mine.vendorConsents.ids, "${fixture.id}: ${reason} (vendor consents)")
		assertEquals(
			fixture.model.vendorLegitimateInterests,
			mine.vendorLegitimateInterests.ids,
			"${fixture.id}: $reason (vendor LI)",
		)
		assertEquals(
			fixture.model.purposeLegitimateInterests,
			mine.purposeLegitimateInterests,
			"${fixture.id}: $reason (purpose LI)",
		)
		val pruned = listOf(
			theirs.vendorConsents.ids != mine.vendorConsents.ids,
			theirs.vendorLegitimateInterests.ids != mine.vendorLegitimateInterests.ids,
			theirs.purposeLegitimateInterests != mine.purposeLegitimateInterests,
		)
		assertTrue(
			pruned.any { it },
			"${fixture.id}: the two strings disagree somewhere the pruning explanation does not cover",
		)
		// Everything the pruning pass does not touch has to agree, which is what stops the row from
		// becoming a licence for an unrelated byte difference.
		assertEquals(mine.vendorListVersion, theirs.vendorListVersion, "${fixture.id}: vendor list version is not a pruning question")
		assertEquals(mine.policyVersion, theirs.policyVersion, "${fixture.id}: policy version is not a pruning question")
		assertEquals(mine.consentLanguage, theirs.consentLanguage, "${fixture.id}: language is not a pruning question")
		assertEquals(mine.purposeConsents, theirs.purposeConsents, "${fixture.id}: purpose consents are not a pruning question")
		assertEquals(mine.specialFeatureOptins, theirs.specialFeatureOptins, "${fixture.id}: special features are not a pruning question")
		assertEquals(mine.cmpId, theirs.cmpId, "${fixture.id}: cmpId is not a pruning question")
		println("  DECLARED DIVERGENCE ${fixture.id}: $reason")
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

	private companion object {
		/**
		 * Graded encode vectors whose bytes this codec does not reproduce, and the reference behaviour
		 * behind each gap. Add an entry and [assertDeclaredDivergence] proves what the gap is: the two
		 * strings must differ, they must differ only in the signals named, and everything the pruning
		 * explanation does not reach must still agree byte for byte.
		 *
		 * It is empty, and both rows that were here were closed by implementing
		 * [TcSemanticPreEncoder]. Worth recording how, because one of the two was expected to stay
		 * open. `tc-string-parity-li-and-special-features` needed the LI rule for purposes 1 and 3
		 * through 6, which is a constant with no vendor list in it. `tc-string-parity-pruned-signals`
		 * was filed as needing a full GVL, on the understanding that the fixtures' `input.vendorList`
		 * recorded no per-vendor purposes. That understanding was wrong: all 621 vendor entries across
		 * the 27 vectors carry `purposes`, `legIntPurposes`, `specialPurposes` and `flexiblePurposes`,
		 * which is exactly what the rule reads, so the vector reproduces from the shared record and no
		 * re-record is needed for it. What the recorded list still lacks is purpose definitions and
		 * stacks, which nothing in this codec reads.
		 *
		 * If a future vector reintroduces either gap, the phantom check and the set comparison below
		 * will both say so rather than let it pass quietly.
		 */
		private val DIVERGENCES: Map<String, String> = emptyMap()
	}
}
