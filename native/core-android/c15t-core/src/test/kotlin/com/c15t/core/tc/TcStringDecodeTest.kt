package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Every `tc-string` fixture in `native/protocol` through the decoder, against
 * `expected.decode.fields`.
 *
 * All 27 fixtures are graded here, including the ten whose `expects.encode` is false. Those ten
 * carry publisher restrictions, PurposeOneTreatment, non-standard texts, an out-of-band segment or
 * custom purposes -- shapes the reference itself cannot produce, so the encode half is not graded
 * for anyone. Decoding them is still required: another CMP writes all of it, and a decoder that
 * skipped a section would report a smaller consent state than the string describes.
 *
 * Two things the manifest carries that this test deliberately does not assert:
 *
 * - `supportOOB`. No bit encodes it. It only decides whether a VendorsAllowed segment gets emitted,
 *   so a decoder cannot recover it from a string and this suite does not pretend to.
 * - Anything about encoding. That half lives in [TcStringEncodeTest], against bytes.
 */
class TcStringDecodeTest {
	private val fixtures = TcStringFixtures.load()

	@Test
	fun `every fixture decodes to the fields the manifest declares`() {
		val graded = fixtures.filter { it.expectsDecode }
		assertEquals(fixtures.size, graded.size, "a tc-string fixture declares expects.decode false")

		graded.forEach { fixture ->
			val decoded = TcStringDecoder.decode(fixture.encoded)
			val core = decoded.core
			val want = fixture.expected
			val who = "${fixture.id}: "

			assertEquals(want.version, core.version, "${who}Version @0 x6")
			assertEquals(want.createdMillis, core.createdMillis, "${who}Created @6 x36, in milliseconds")
			assertEquals(want.lastUpdatedMillis, core.lastUpdatedMillis, "${who}LastUpdated @42 x36, in milliseconds")
			assertEquals(want.cmpId, core.cmpId, "${who}CmpId @78 x12")
			assertEquals(want.cmpVersion, core.cmpVersion, "${who}CmpVersion @90 x12")
			assertEquals(want.consentScreen, core.consentScreen, "${who}ConsentScreen @102 x6")
			assertEquals(want.consentLanguage, core.consentLanguage, "${who}ConsentLanguage @108 x12")
			assertEquals(want.vendorListVersion, core.vendorListVersion, "${who}VendorListVersion @120 x12")
			assertEquals(want.policyVersion, core.policyVersion, "${who}TcfPolicyVersion @132 x6")
			assertEquals(want.isServiceSpecific, core.isServiceSpecific, "${who}IsServiceSpecific @138 x1")
			assertEquals(want.useNonStandardTexts, core.useNonStandardTexts, "${who}UseNonStandardTexts @139 x1")
			assertEquals(want.purposeOneTreatment, core.purposeOneTreatment, "${who}PurposeOneTreatment @200 x1")
			assertEquals(want.publisherCountryCode, core.publisherCountryCode, "${who}PublisherCC @201 x12")
			assertEquals(want.specialFeatureOptins, core.specialFeatureOptins, "${who}SpecialFeatureOptIns @140 x12")
			assertEquals(want.purposeConsents, core.purposeConsents, "${who}PurposesConsent @152 x24")
			assertEquals(
				want.purposeLegitimateInterests,
				core.purposeLegitimateInterests,
				"${who}PurposesLITransparency @176 x24",
			)

			assertEquals(want.vendorConsents, core.vendorConsents.ids, "${who}Vendor Consent Section @213")
			assertEquals(want.maxIdsOf.vendorConsents, core.vendorConsents.maxId, "${who}Vendor Consent MaxVendorId")
			assertEquals(
				want.vendorLegitimateInterests,
				core.vendorLegitimateInterests.ids,
				"${who}Vendor LI Section, read independently of the section before it",
			)
			assertEquals(
				want.maxIdsOf.vendorLegitimateInterests,
				core.vendorLegitimateInterests.maxId,
				"${who}Vendor LI MaxVendorId",
			)

			val disclosed = decoded.vendorsDisclosed
			assertEquals(want.vendorsDisclosed, disclosed?.ids ?: emptyList(), "${who}VendorsDisclosed payload")
			assertEquals(want.maxIdsOf.vendorsDisclosed, disclosed?.maxId ?: 0, "${who}VendorsDisclosed MaxVendorId")

			val allowed = decoded.vendorsAllowed
			assertEquals(
				want.vendorsAllowed,
				allowed?.ids ?: emptyList(),
				"${who}VendorsAllowed payload, segment type 2",
			)
			assertEquals(want.maxIdsOf.vendorsAllowed, allowed?.maxId ?: 0, "${who}VendorsAllowed MaxVendorId")

			// The manifest lists restrictions by ascending purposeId; the string carries them in the
			// order the CMP wrote them -- 9, 2, 7 in one vector. The decoder keeps the string order
			// because byte-exact re-emission depends on it, so both sides are sorted here and
			// [restrictions come back in the order the string wrote them] pins the difference.
			assertEquals(
				want.restrictions.sortedBy { it.purposeId }.map { Triple(it.purposeId, it.restrictionType, it.vendorIds) },
				core.publisherRestrictions.restrictions
					.sortedBy { it.purposeId }
					.map { Triple(it.purposeId, it.restrictionTypeValue, it.vendorIds) },
				"${who}Publisher Restrictions Section, count-driven and read in full",
			)

			val publisher = decoded.publisher
			assertEquals(want.publisherConsents, publisher?.publisherConsents ?: emptyList(), "${who}PubPurposesConsent")
			assertEquals(
				want.publisherLegitimateInterests,
				publisher?.publisherLegitimateInterests ?: emptyList(),
				"${who}PubPurposesLITransparency",
			)
			assertEquals(want.numCustomPurposes, publisher?.numCustomPurposes ?: 0, "${who}NumCustomPurposes")
			assertEquals(
				want.publisherCustomConsents,
				publisher?.publisherCustomConsents ?: emptyList(),
				"${who}CustomPurposesConsent, positional at the declared width",
			)
			assertEquals(
				want.publisherCustomLegitimateInterests,
				publisher?.publisherCustomLegitimateInterests ?: emptyList(),
				"${who}CustomPurposesLITransparency",
			)
			// The custom vectors have no MaxVendorId field of their own; NumCustomPurposes is their
			// width, and that is what the manifest's maxIds entry for them carries.
			assertEquals(
				want.maxIdsOf.publisherCustomConsents,
				publisher?.numCustomPurposes ?: 0,
				"${who}custom-purpose width doubles as the maxId the manifest reports",
			)
		}
	}

	/**
	 * The order is content, not noise. Re-emitting a string this build only read means putting the
	 * restriction entries back where they were found, so a decoder that sorted them into a tidy
	 * shape would produce different bytes from the ones it was handed.
	 */
	@Test
	fun `restrictions come back in the order the string wrote them`() {
		val fixture = fixtures.first { it.id == "tc-string-decode-restrictions-three-types" }
		assertEquals(
			listOf(9, 2, 7),
			TcStringDecoder.decode(fixture.encoded).core.publisherRestrictions.restrictions
				.map { it.purposeId },
			"the string writes purpose 9 first; the manifest reports the same three sorted by id",
		)
	}

	/**
	 * The corpus has to stay worth running.
	 *
	 * A vector set that quietly collapsed to one shape would keep passing while testing almost
	 * nothing, so the properties that make these fixtures worth their bytes are asserted here:
	 * both vendor-section packings appear, at least one MaxVendorId is past the 45-bit point where
	 * the packing choice flips, the optional sections are all reached, and a policy version other
	 * than the historic 2 is covered.
	 */
	@Test
	fun `the shared vectors still cover the shapes they were written for`() {
		val decoded = fixtures.map { it.id to TcStringDecoder.decode(it.encoded) }
		val cores = decoded.map { it.second }

		val packings = cores.flatMap { listOf(it.core.vendorConsents.encoding, it.core.vendorLegitimateInterests.encoding) }
			.toSet()
		assertEquals(
			setOf(TcVectorEncoding.FIXED_BITFIELD, TcVectorEncoding.RANGE),
			packings,
			"the vectors no longer exercise both vendor-section packings",
		)
		assertTrue(
			cores.any { it.core.vendorConsents.maxId > 45 || it.core.vendorLegitimateInterests.maxId > 45 },
			"no vector reaches past the 45-bit point where the packing flips",
		)
		assertTrue(cores.any { !it.core.publisherRestrictions.isEmpty }, "no vector carries publisher restrictions")
		assertTrue(cores.any { it.core.purposeOneTreatment }, "no vector carries PurposeOneTreatment")
		assertTrue(cores.any { it.core.useNonStandardTexts }, "no vector carries UseNonStandardTexts")
		assertTrue(cores.any { it.vendorsAllowed != null }, "no vector carries a VendorsAllowed segment")
		assertTrue(cores.any { (it.publisher?.numCustomPurposes ?: 0) > 0 }, "no vector carries custom purposes")
		assertTrue(cores.any { !it.core.isServiceSpecific }, "no vector is global-scope")
		assertTrue(
			cores.map { it.core.policyVersion }.toSet().subtract(setOf(2)).isNotEmpty(),
			"every vector pins the historic policy version 2",
		)
		assertTrue(
			fixtures.map { it.vendorList.tcfPolicyVersion }.contains(5),
			"no vector carries the policy version a live GVL advertises",
		)
	}
}
