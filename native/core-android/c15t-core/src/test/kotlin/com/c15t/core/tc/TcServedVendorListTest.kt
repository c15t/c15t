package com.c15t.core.tc

import kotlinx.serialization.json.JsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Encodes against a vendor list that arrived on `/init`, and grades it against the web's bytes.
 *
 * [TcStringEncodeTest] grades the hand-in route: a fixture's `input.vendorList` becomes a
 * [TcVendorList] and the bytes must equal `expected.encode.tcString`. This class grades the route a
 * device actually travels -- the same vendor facts in the GVL wire shape the backend embeds, read by
 * [GlobalVendorListJson] and handed to the encoder through [TcConsentInput.withServedVendorList]. The
 * same consent state has to give the same bytes, because `SemanticPreEncoder.js` reaches its
 * declarations through the list it was handed with no notion of where the document came from, and a
 * string written against a served list is the string an ad SDK reads off the device.
 *
 * [every encode-graded vector is reproduced through the served path] carries the corpus. Three rules
 * are graded separately below, because the corpus cannot reach them: no vector signals a vendor its own
 * manifest omits in a way that isolates the rule, none carries a `deletedDate` (`TcStringFixtures`
 * records that emptiness), and none states a basis the vendor's other list.without -- see
 * [a signal the served list does not back is pruned exactly as the web prunes it], which works inside the
 * same limit [TcSemanticPreEncoderTest] accepts, with the same rule for saying where each fact came from.
 */
class TcServedVendorListTest {
	private val fixtures = TcStringFixtures.load()

	/** The vectors with bytes to compare against, which the corpus claim runs over. */
	private val graded: List<TcStringFixture> = fixtures.filter { it.expectsEncode }

	/**
	 * Each vector's own vendor facts, served as a GVL document and encoded: the fixture's bytes.
	 *
	 * Whole corpus, no filter on language, and one honest exception. A GVL document carries no language
	 * -- the web chooses one by URL in `packages/backend/src/http/gvl.ts`, and `generateTCString` builds
	 * `new GVL(gvlData)` without one, so the reference writes `GVL.DEFAULT_LANGUAGE` -- while a vector's
	 * manifest declares one and one vector declares DE, which `TcStringEncodeTest` pins. So a served
	 * list is graded on every field a vendor list decides, plus that the reference default is what
	 * reached the bytes, and byte for byte over the whole string wherever the manifest already agreed
	 * with that default. Both branches have to be walked, which is what the two counters at the end
	 * insist on: a corpus that quietly stopped containing one of them would leave the byte claim
	 * covering one vendor-list shape and calling it the whole set.
	 */
	@Test
	fun `every encode-graded vector is reproduced through the served path`() {
		assertTrue(graded.isNotEmpty(), "no encode-graded vector to serve against")
		var wholeStringClaims = 0
		var declaredLanguageClaims = 0

		graded.forEach { fixture ->
			val servedList = GlobalVendorListJson.read(ServedVendorListFixtures.documentFor(fixture.vendorList))
			assertNotNull(servedList, "${fixture.id}: a re-expressed vendor list has to be accepted")
			assertEquals(
				fixture.vendorList.vendorListVersion.toLong(),
				servedList.vendorListVersion,
				"${fixture.id}: the served list has to carry the vector's VendorListVersion",
			)
			assertEquals(
				fixture.vendorList.tcfPolicyVersion.toLong(),
				servedList.tcfPolicyVersion,
				"${fixture.id}: the served list has to carry the vector's TcfPolicyVersion",
			)

			val authored = TcStringEncoder.encode(
				ServedVendorListFixtures.consentInput(fixture, servedList.toTcVendorList()),
			)
			val actual = TcStringDecoder.decode(authored).core
			val expected = TcStringDecoder.decode(fixture.encoded).core

			assertEquals(expected.vendorConsents.ids, actual.vendorConsents.ids, "${fixture.id}: vendor consents")
			assertEquals(
				expected.vendorLegitimateInterests.ids,
				actual.vendorLegitimateInterests.ids,
				"${fixture.id}: vendor legitimate interests",
			)
			assertEquals(expected.vendorConsents.maxId, actual.vendorConsents.maxId, "${fixture.id}: consents max id")
			assertEquals(
				expected.vendorLegitimateInterests.maxId,
				actual.vendorLegitimateInterests.maxId,
				"${fixture.id}: legitimate-interest max id",
			)
			// Purpose consents, the disclosed set, and every other field are graded too -- by the whole
			// string below, wherever the manifest and the reference default agree on language.
			assertEquals(expected.vendorListVersion, actual.vendorListVersion, "${fixture.id}: VendorListVersion")
			assertEquals(expected.policyVersion, actual.policyVersion, "${fixture.id}: TcfPolicyVersion")
			assertEquals(
				TcVendorList.DEFAULT_LANGUAGE,
				actual.consentLanguage,
				"${fixture.id}: a served list carries no language, so only the reference default may reach " +
					"the bytes",
			)

			if (fixture.vendorList.language == TcVendorList.DEFAULT_LANGUAGE) {
				assertEquals(fixture.encoded, authored, "${fixture.id}: served list wrote different bytes")
				wholeStringClaims += 1
			} else {
				declaredLanguageClaims += 1
			}
		}

		assertTrue(wholeStringClaims > 0, "no vector already names the reference default language")
		assertTrue(
			declaredLanguageClaims > 0,
			"no vector names a language of its own, so the served path's language rule is unexercised",
		)
	}

	/**
	 * Three rules the corpus cannot isolate, one fixture each, each graded as a pair of encodes.
	 *
	 * Both sides of every pair run through the served path over one substrate document, and they differ
	 * by exactly the declaration the rule is about. That pairing is the assertion: the served path has
	 * to reach one tifer only by the reduced vector, which `web's own whole-string equality` fixes the
	 * pruned bit *and* the max id the section carries *and* every other field, and it holds whether or
	 * not a vector happens to carry the fact. `expectedVendorConsents` and
	 * `expectedVendorLegitimateInterests` then pin which ids those are, from the web answer for the
	 * documentary pair and from the rule for the two pairs `@source` admits to writing.
	 *
	 *   * **A vendor id the list does not carry.** `tc-string-parity-pruned-signals` is this rule with
	 *     web's bytes attached, and it is what the pairing is measured against: `input.model` puts 400
	 *     in both vendor vectors, `input.vendorList.vendors` has no 400 at all (checked in
	 *     [localRules], because a vector that grew one would silently stop testing this), and
	 *     `expected.decode.fields` reports `[1]` and `[2]` -- the web dropped 400 from both, which is
	 *     the web's own answer, read off `expected.decode.fields`.
	 *   * **A legal basis the vendor never declared.** No vector runs one: 400 is not in `vendors`, and
	 *     the vendors that are all declare both bases, so no signal in any vector asks the question the
	 *     `legIntPurposes` branch answers. Vendor 901 is therefore this fixture's, declared under
	 *     legitimate interest and nothing else, and the web answer it is graded against is the rule
	 *     `TcSemanticPreEncoder` documents -- a consent vector is answered by `purposes`, so a consent
	 *     signal for 901 is a claim the served list refuses while 400's partner case above keeps mine.
	 *   * **A deleted vendor.** Same shape: vendor 1 is real and present in the substrate, declaring both
	 *     bases, so its signals stand, and the fixture added a `deletedDate` no vector carries, which
	 *     takes both away. The web's rule is `TcVendor.isDeleted`, which reads the reference's truthiness
	 *     test on the field; the date string itself is this fixture's.
	 */
	@Test
	fun `a signal the served list does not back is pruned exactly as the web prunes it`() {
		localRules().forEach { rule ->
			val servedList = requireNotNull(GlobalVendorListJson.read(rule.gvlDocument)) {
				"${rule.name}: the document has to be accepted, or nothing is being graded"
			}
			val vendorList = servedList.toTcVendorList()
			// Per vector, not one merged set: a vector that keeps an id the other one loses is the whole
			// subject of the basis rule, and subtracting a shared set would take a backed legitimate
			// interest away in the negative encode and make the pair disagree for the wrong reason.
			val prunedConsents = (rule.vendorConsents - rule.expectedVendorConsents.toSet()).toSet()
			val prunedInterests = (rule.vendorLegitimateInterests - rule.expectedVendorLegitimateInterests.toSet()).toSet()

			val written = TcStringEncoder.encode(
				ServedVendorListFixtures.consentInput(
					vendorList = vendorList,
					vendorConsents = rule.vendorConsents,
					vendorLegitimateInterests = rule.vendorLegitimateInterests,
				),
			)
			val neverClaimed = TcStringEncoder.encode(
				ServedVendorListFixtures.consentInput(
					vendorList = vendorList,
					vendorConsents = rule.vendorConsents - prunedConsents,
					vendorLegitimateInterests = rule.vendorLegitimateInterests - prunedInterests,
				),
			)
			val core = TcStringDecoder.decode(written).core

			// Byte equality between the pair, for the reason `TcSemanticPreEncoderTest` gives: a pruned
			// signal has to move the bit and the section's max id and leave every other field alone, and
			// an assertion on the decoded ids alone would let a stranded max id through. It also grades
			// the half the fixture declares but does not lose: on the basis rule the consent claim is
			// refused while the backed legitimate interest has to survive untouched, and a codec that
			// cleared the vendor out of both vectors would fail here rather than match an empty
			// expectation.
			assertEquals(neverClaimed, written, "${rule.name}: pruning moved more than the signal")
			assertEquals(
				rule.expectedVendorConsents,
				core.vendorConsents.ids,
				"${rule.name}: vendor consents the served list left standing",
			)
			assertEquals(
				rule.expectedVendorLegitimateInterests,
				core.vendorLegitimateInterests.ids,
				"${rule.name}: legitimate interests the served list left standing",
			)
		}
	}

	/** The rule fixtures, each one the vectors' own vendor list plus the one edit the rule is about. */
	private fun localRules(): List<ServedVendorListRule> {
		val vector = graded.first { it.id == PRUNED_SIGNALS_VECTOR }
		val substrate = ServedVendorListFixtures.documentFor(vector.vendorList)
		val served = requireNotNull(GlobalVendorListJson.read(substrate)) {
			"$PRUNED_SIGNALS_VECTOR: the vectors' own vendor list has to be accepted as a served GVL"
		}

		// The substrate has to stay the fact pattern these three fixtures lean on. Each check names the
		// rule it protects, so a vector that changes fails the fixture that stopped meaning anything.
		assertTrue(
			served.vendor(SIGNAL_CARRIER) == null,
			"$PRUNED_SIGNALS_VECTOR grew vendor $SIGNAL_CARRIER, so its [1]/[2] answer is no longer the " +
				"absent-id rule's web answer",
		)
		assertTrue(
			served.vendor(UNDECLARED_BASIS_VENDOR) == null,
			"vendor $UNDECLARED_BASIS_VENDOR turned up in the vectors, so that fixture is no longer about a " +
				"basis nobody declared",
		)
		val standing = served.vendor(STANDING_VENDOR)
		assertNotNull(
			standing,
			"$PRUNED_SIGNALS_VECTOR lost vendor $STANDING_VENDOR, which the deleted-vendor fixture declares " +
				"and then withdraws",
		)
		assertTrue(
			standing.purposes?.isNotEmpty() == true && standing.legIntPurposes?.isNotEmpty() == true,
			"vendor $STANDING_VENDOR no longer declares both bases, so the deleted-vendor fixture cannot " +
				"show a withdrawal taking two signals away",
		)
		assertTrue(
			vector.vendorList.vendors.none { it.isDeleted },
			"a vector started carrying a deletedDate, so that rule belongs in the corpus above",
		)

		// @source tc-string-parity-pruned-signals, end to end: `input.model` for the two vectors,
		// `input.vendorList.vendors` for the absence, and `expected.decode.fields` for the answer.
		val absentVendor = ServedVendorListRule(
			name = "a vendor id the list does not carry",
			gvlDocument = substrate,
			vendorConsents = vector.model.vendorConsents,
			vendorLegitimateInterests = vector.model.vendorLegitimateInterests,
			expectedVendorConsents = vector.expected.vendorConsents,
			expectedVendorLegitimateInterests = vector.expected.vendorLegitimateInterests,
		)

		// @source written here: vendor $UNDECLARED_BASIS_VENDOR and its single declaration. The vectors
		// offer nothing to grade this on -- 400 is absent altogether and every vendor present declares
		// both bases -- so the rule under test is `TcSemanticPreEncoder`'s own: a consent vector is
		// answered by `purposes`, and a legitimate interest by `legIntPurposes`.
		val undeclaredBasis = ServedVendorListRule(
			name = "a legal basis the vendor never declared",
			gvlDocument = ServedVendorListFixtures.withVendorAdded(
				substrate,
				UNDECLARED_BASIS_VENDOR,
				ServedVendorListFixtures.vendorDeclaringLegitimateInterestOnly(UNDECLARED_BASIS_VENDOR),
			),
			vendorConsents = listOf(UNDECLARED_BASIS_VENDOR),
			vendorLegitimateInterests = listOf(UNDECLARED_BASIS_VENDOR),
			expectedVendorConsents = emptyList(),
			expectedVendorLegitimateInterests = listOf(UNDECLARED_BASIS_VENDOR),
		)

		// @source written here: the withdrawal date, because no vector runs one. The vendor is the
		// vectors' own, and it declares both bases, so the only thing this fixture adds is the field
		// `TcVendor.isDeleted` reads -- the reference tests it for truthiness, which that property keeps.
		val withdrawn = ServedVendorListRule(
			name = "a deleted vendor",
			gvlDocument = ServedVendorListFixtures.withVendorWithdrawn(
				substrate,
				STANDING_VENDOR,
				WITHDRAWAL_DATE,
			),
			vendorConsents = listOf(STANDING_VENDOR, SIGNAL_CARRIER),
			vendorLegitimateInterests = listOf(STANDING_VENDOR),
			expectedVendorConsents = emptyList(),
			expectedVendorLegitimateInterests = emptyList(),
		)

		return listOf(absentVendor, undeclaredBasis, withdrawn)
	}

	/**
	 * One pruning rule, as a served document plus the signals it must refuse.
	 *
	 * @property gvlDocument The document a `/init` would carry, one edit away from the vectors' own list.
	 * @property expectedVendorConsents Both vectors stated exactly. An empty expectation on its own would
	 * let a codec that pruned everything pass, and over-pruning is the likelier wrong answer here.
	 */
	private data class ServedVendorListRule(
		val name: String,
		val gvlDocument: JsonObject,
		val vendorConsents: List<Int>,
		val vendorLegitimateInterests: List<Int>,
		val expectedVendorConsents: List<Int>,
		val expectedVendorLegitimateInterests: List<Int>,
	)

	private companion object {
		/** The vector that carries web's own answer for the absent-vendor rule. */
		private const val PRUNED_SIGNALS_VECTOR = "tc-string-parity-pruned-signals"

		/** The vendor that vector signals for and does not list. */
		private const val SIGNAL_CARRIER = 400

		/** A vendor the vectors never heard of, for the basis this fixture has to write itself. */
		private const val UNDECLARED_BASIS_VENDOR = 901

		/** A real vendor in that manifest, declaring both bases, which the withdrawal fixture deletes. */
		private const val STANDING_VENDOR = 1

		/** Written by this fixture; the format is `gvlVendorSchema`'s `deletedDate`. */
		private const val WITHDRAWAL_DATE = "2025-06-01T00:00:00Z"
	}
}
