package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Every corpus string through the decoder, against expectations computed in [TcFixtureCorpus].
 *
 * One test walks the whole corpus rather than one test per case, because the corpus is the unit
 * under test here: a case that decodes wrong has to name itself, and it does, in the assertion
 * message. The expectations are arithmetic written next to the strings, not values captured from a
 * run of this decoder -- a test that records what the code did proves nothing.
 *
 * All strings come through [TcFixtureCorpus.cases], which is the provisional seam. Nothing in this
 * file holds a TC String literal.
 */
class TcStringCorpusTest {
	/**
	 * The fixed head ends at bit 213, and every offset asserted here is derived from the table on
	 * [TcCoreSegment]: Version @0x6, Created @6x36, LastUpdated @42x36, CmpId @78x12, CmpVersion
	 * @90x12, ConsentScreen @102x6, ConsentLanguage @108x12, VendorListVersion @120x12,
	 * TcfPolicyVersion @132x6, IsServiceSpecific @138x1, UseNonStandardTexts @139x1,
	 * SpecialFeatureOptIns @140x12, PurposesConsent @152x24, PurposesLITransparency @176x24,
	 * PurposeOneTreatment @200x1, PublisherCC @201x12, which closes at 213.
	 */
	@Test
	fun `every accepted case decodes to the fields its bits say`() {
		acceptedCases().forEach { case ->
			val decoded = TcStringDecoder.decode(case.encoded)
			val core = decoded.core
			val who = "${case.id}: "

			assertEquals(2, core.version, "${who}Version @0 x6")
			assertEquals(case.cmpId, core.cmpId, "${who}CmpId @78 x12")
			assertEquals(case.policyVersion, core.policyVersion, "${who}TcfPolicyVersion @132 x6")
			assertEquals(case.vendorListVersion, core.vendorListVersion, "${who}VendorListVersion @120 x12")
			assertEquals(case.consentLanguage, core.consentLanguage, "${who}ConsentLanguage @108 x12")
			assertEquals(case.publisherCountryCode, core.publisherCountryCode, "${who}PublisherCC @201 x12")
			assertEquals(case.isServiceSpecific, core.isServiceSpecific, "${who}IsServiceSpecific @138 x1")
			assertEquals(case.purposeOneTreatment, core.purposeOneTreatment, "${who}PurposeOneTreatment @200 x1")
			assertEquals(case.purposeConsents, core.purposeConsents, "${who}PurposesConsent @152 x24")
			assertEquals(case.vendorConsents, core.vendorConsents.ids, "${who}Vendor Consent Section @213")
			assertEquals(
				case.publisherRestrictions,
				core.publisherRestrictions.restrictions,
				"${who}Publisher Restrictions Section, count-driven, after both vendor sections",
			)
			assertEquals(
				core.publisherRestrictions.isEmpty,
				case.publisherRestrictions.isEmpty(),
				"${who}an empty restrictions section is the 12-bit zero count and nothing else",
			)

			// Disclosed Vendors is mandatory only from TCF v2.3, so absence is a legitimate older
			// shape rather than a decoder bug -- null asserts it stays absent.
			if (case.vendorsDisclosed == null) {
				assertNull(decoded.vendorsDisclosed, "${who}carries a VendorsDisclosed section nobody wrote")
			} else {
				val disclosed = assertNotNull(decoded.vendorsDisclosed, "${who}carries no VendorsDisclosed section")
				assertEquals(case.vendorsDisclosed, disclosed.ids, "${who}VendorsDisclosed payload")
			}

			// The out-of-band section is the opposite case: null means the string must not carry one,
			// which is an expectation about the encoder's restraint and not a skipped check.
			if (case.vendorsAllowed == null) {
				assertNull(decoded.vendorsAllowed, "${who}carries a VendorsAllowed section nobody wrote")
			} else {
				assertEquals(
					case.vendorsAllowed,
					assertNotNull(decoded.vendorsAllowed, "${who}carries no VendorsAllowed section").ids,
					"${who}VendorsAllowed payload, segment type 2",
				)
			}

			if (case.numCustomPurposes == null) {
				assertNull(decoded.publisher, "${who}carries a Publisher TC segment nobody wrote")
			} else {
				val publisher = assertNotNull(decoded.publisher, "${who}carries no Publisher TC segment")
				assertEquals(case.numCustomPurposes, publisher.numCustomPurposes, "${who}NumCustomPurposes @51 x6")
			}

			assertEquals(
				case.unknownSectionTypeIds,
				decoded.unknownSections.map { it.segmentTypeId },
				"${who}unknown segments, carried unread rather than dropped",
			)
		}
	}

	/**
	 * The one bit that decides how a vendor list is packed, checked in both of its states.
	 *
	 * `IsRangeEncoding` sits at @229 x1 in the Vendor Consent Section (@213 + 16 bits of MaxVendorId),
	 * and the polarity is the thing worth pinning: 1 is a Range, 0 is a BitField. Both states appear
	 * in the corpus, which is the only way a swapped reading gets caught -- a decoder that inverted
	 * the bit would still decode an all-empty section correctly.
	 *
	 * - spec-worked-example: consent section MaxVendorId 4, so 4 bits of bitfield, and a bitfield
	 * always wins below 45 bits of range encoding.
	 * - production-shape-policy-5: MaxVendorId 50 over ids 1..50, where one range entry costs
	 * 12 + 1 + 16 + 16 = 45 payload bits against 50 bits of bitfield, so the range wins.
	 */
	@Test
	fun `a vendor section reports the packing it was actually written in`() {
		val spec = caseNamed("spec-worked-example")
		val specCore = TcStringDecoder.decode(spec.encoded).core
		assertEquals(TcVectorEncoding.FIXED_BITFIELD, specCore.vendorConsents.encoding, "MaxVendorId 4 cannot afford a range")
		assertEquals(listOf(1, 2, 3, 4), specCore.vendorConsents.ids, "4 bits of bitfield, all set")

		val production = caseNamed("production-shape-policy-5")
		val productionCore = TcStringDecoder.decode(production.encoded).core
		assertEquals(TcVectorEncoding.RANGE, productionCore.vendorConsents.encoding, "50 vendors fit in 45 range bits, not 50 bitfield bits")
		assertEquals(listOf(TcIdRange(1, 50)), productionCore.vendorConsents.rangeEntries, "one contiguous run is one entry")
		assertEquals((1..50).toList(), productionCore.vendorConsents.ids, "the run still expands to 50 ids")
	}

	/**
	 * The restrictions section read structurally, which is the part a decoder is tempted to skip.
	 *
	 * From the 12-bit NumPubRestrictions that a core segment always carries: entry = PurposeId x6 +
	 * RestrictionType x2 + NumEntries x12, range entry = IsARange x1 + StartOrOnlyVendorId x16 +
	 * EndVendorId x16 only when IsARange is 1. So entry one is 6+2+12 + (1+16+16) = 53 bits and
	 * entry two is 6+2+12 + (1+16) + (1+16+16) = 70, and the section is 12 + 53 + 70 = 135 bits.
	 */
	@Test
	fun `publisher restrictions decode to purposes, restriction types and vendor ranges`() {
		val restrictions = TcStringDecoder.decode(caseNamed("publisher-restrictions").encoded).core
			.publisherRestrictions
		assertEquals(135, restrictions.bitLength, "12 + 53 + 70")
		assertEquals(listOf(2, 3), restrictions.restrictions.map { it.purposeId }, "PurposeId @0 x6 of each entry")
		assertEquals(
			listOf(TcRestrictionType.REQUIRE_CONSENT, TcRestrictionType.NOT_ALLOWED),
			restrictions.restrictions.mapNotNull { it.restrictionType },
			"RestrictionType x2: 1 requires consent, 0 disallows outright",
		)
		assertEquals(listOf(listOf(4, 5, 6), listOf(9, 11, 12, 13)), restrictions.restrictions.map { it.vendorIds })
	}

	/**
	 * Custom purposes are positional, and their width comes from a field before them.
	 *
	 * After the 3-bit SegmentType: PubPurposesConsent @3 x24, PubPurposesLITransparency @27 x24,
	 * NumCustomPurposes @51 x6, CustomPurposesConsent @57 x5, CustomPurposesLITransparency @62 x5 --
	 * 67 bits, and the last two fields only exist because the field at @51 says how wide they are.
	 */
	@Test
	fun `custom purposes are read positionally at the width the count declares`() {
		val publisher = assertNotNull(
			TcStringDecoder.decode(caseNamed("publisher-custom-purposes").encoded).publisher,
			"the Publisher TC segment is what this case is about",
		)
		assertEquals(5, publisher.numCustomPurposes, "NumCustomPurposes @51 x6")
		assertEquals(listOf(2, 3), publisher.publisherConsents, "PubPurposesConsent @3 x24")
		assertEquals(listOf(1), publisher.publisherLegitimateInterests, "PubPurposesLITransparency @27 x24")
		assertEquals(listOf(1, 3, 5), publisher.publisherCustomConsents, "CustomPurposesConsent @57, leftmost bit is custom purpose 1")
		assertEquals(listOf(2), publisher.publisherCustomLegitimateInterests, "CustomPurposesLITransparency @62")
	}

	/**
	 * The refusals. Each case names the fragment its message has to carry, so a decoder that failed
	 * for the wrong reason -- or for no reason -- still fails the test.
	 */
	@Test
	fun `a string this format does not describe is refused with the reason`() {
		TcFixtureCorpus.cases()
			.filter { it.outcome == TcFixtureCorpus.Outcome.REJECTED }
			.forEach { case ->
				val failure = assertFailsWith<TcDecodingException>("${case.id}: expected a refusal") {
					TcStringDecoder.decode(case.encoded)
				}
				val fragment = requireNotNull(case.blockedField) { "${case.id}: a REJECTED case names no message fragment" }
				assertTrue(
					failure.message?.contains(fragment) == true,
					"${case.id}: refused with \"${failure.message}\", which does not mention \"$fragment\"",
				)
			}
	}

	/**
	 * A segment type nobody has defined is carried, not dropped and not fatal.
	 *
	 * The oracle throws a TypeError off a map miss here. The formats document asks a decoder to
	 * tolerate what it does not model, and the two agree only if the bits survive: this asserts the
	 * id and the raw body, which is what makes a byte-exact re-emit possible later.
	 */
	@Test
	fun `an unknown segment type keeps its id and its bits`() {
		val decoded = TcStringDecoder.decode(caseNamed("unknown-segment-type").encoded)
		assertEquals(1, decoded.unknownSections.size, "one unread segment, carried through")
		val unknown = decoded.unknownSections.single()
		assertEquals(5, unknown.segmentTypeId, "SegmentType @0 x3, a value no source defines")
		assertEquals(12, unknown.bodyBits.count { it == '1' }, "the body was written as 4095 in 12 bits")
		assertNull(unknown.type, "no modelled type claims id 5")
	}

	private fun acceptedCases(): List<TcFixtureCorpus.Case> = TcFixtureCorpus.cases()
		.filter { it.outcome != TcFixtureCorpus.Outcome.REJECTED }

	private fun caseNamed(id: String): TcFixtureCorpus.Case =
		TcFixtureCorpus.cases().firstOrNull { it.id == id }
			?: throw AssertionError("no corpus case \"$id\"")
}
