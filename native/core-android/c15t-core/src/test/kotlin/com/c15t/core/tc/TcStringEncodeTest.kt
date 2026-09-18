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
 * Three recorded values arrive as scalars rather than being derived, because the recorded vendor
 * list is a stub with no purposes or stacks and cannot stand up a GVL object:
 * `vendorListVersion`, `tcfPolicyVersion` and `language`. The third is not cosmetic.
 * `tc-string-parity-consent-language-from-vendor-list` hands the encoder a model that says EN
 * against a vendor list that says DE, and the reference overwrites the model before writing, so the
 * bytes must say DE. Reading the app's language here would produce a string the oracle reads back
 * differently, which is the failure this suite exists to catch.
 *
 * [DIVERGENCES] holds the one graded encode vector this codec does not reproduce. It is asserted
 * as a divergence, not skipped: the row goes stale and fails if the gap closes, and the test names
 * exactly which signals move.
 *
 * Two vectors, both for the same reason. The reference runs a semantic pass over the model before
 * writing and removes signals from it, so its bytes describe a smaller consent state than the one
 * the model carried. This codec writes the state it was given.
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
		// The consent language a native build must write is the vendor list's, not the app's, so
		// that this claim stays honest the substitution is checked against the decoded bytes.
		assertEquals(
			fixture.vendorListLanguage,
			fixture.expected.consentLanguage,
			"${fixture.id}: ConsentLanguage in the string is not vendorList.language, so the " +
				"substitution made here is no longer what the reference does",
		)
		return TcConsentInput(
			cmpId = model.cmpId,
			confirmedAtMillis = model.createdMillis,
			vendorListVersion = fixture.vendorListVersion,
			policyVersion = fixture.policyVersion,
			cmpVersion = model.cmpVersion,
			consentScreen = model.consentScreen,
			consentLanguage = fixture.vendorListLanguage,
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
		 * Graded encode vectors whose bytes this codec does not reproduce, and the reference
		 * behaviour behind each gap.
		 *
	 * Both rows are the reference's semantic pre-pass, `encoder/SemanticPreEncoder.js`, which edits
	 * the model on the way to the encoder. The two halves of it are not equally reachable from what
	 * the fixtures record, and the difference matters for whoever decides whether to mirror it:
	 *
	 * - `unset([1, 3, 4, 5, 6])` on purposeLegitimateInterests is a hardcoded rule with no vendor
	 * list involved, so it is reproducible from the recorded model alone. `li-and-special-features`
	 * differs on exactly this and nothing else: the model carries LI 1 through 10, the bytes carry
	 * 2, 7, 8, 9, 10.
	 * - Dropping a vendor signal the vendor list does not back needs each vendor's declared and
	 * flexible purposes. `pruned-signals` asks for vendor consents 1 and 400 and vendor LI 2 and 400;
	 * vendor 400 is not in the recorded list at all, so the reference writes 1 and 2. Mirroring that
	 * means implementing the GVL-semantic filter against a vendor list the manifest records without
	 * purposes, which is a wider scope than mirroring the fields c15t writes.
	 *
	 * Neither gap is live for the state c15t itself produces: purposes 1, 3, 4, 5 and 6 are not
	 * legitimate-interest purposes under the current policy, and c15t's web codec derives vendor
	 * signals from the GVL rather than from a user's free choice, so there is nothing for the pass
	 * to remove. Reported rather than closed: silently dropping signals in a mobile encoder is a
	 * product decision, and getting its conditions wrong would disagree with web about *when*
	 * pruning applies, which is worse than the difference it would fix.
	 */
	private val DIVERGENCES: Map<String, String> = mapOf(
		"tc-string-parity-li-and-special-features" to
			"the reference unsets legitimate interest for purposes 1, 3, 4, 5 and 6; this codec writes what it is given",
		"tc-string-parity-pruned-signals" to
			"the reference prunes signals the vendor list does not back, and unsets LI for purposes 1, 3-6; this codec writes what it is given",
	)
	}
}
