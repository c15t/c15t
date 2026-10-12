package com.c15t.core.tc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * The signal-pruning rules, one test per branch.
 *
 * The shared vectors prove the two rules produce the reference's bytes for the states it happens to
 * record (`li-and-special-features` for the legitimate-interest constant, `pruned-signals` for a
 * vendor the list does not carry). They cannot prove the branches they never enter, and the
 * interesting half of `SemanticPreEncoder.js` is branches a real GVL reaches but a 621-vendor
 * manifest with no deleted entries does not: a withdrawn vendor, a vendor under special purposes
 * only, a flexible purpose that looks like it might rescue a signal. Each is pinned here against a
 * vendor list this test writes itself.
 *
 * No TC String literal appears in this file. Every string is produced by [write] and read back by
 * the decoder, so the corpus in `native/protocol` stays the only place a string is stored -- see
 * [TcStringFixtures].
 *
 * Most assertions are byte equality against the same encode given the already-pruned state, rather
 * than a check on the decoded id set. That is the stronger claim and the one that matters: the two
 * strings must be the same bytes, so pruning has to fix the bit *and* the MaxVendorId the section
 * carries *and* leave every other field alone. A decoded-id assertion would pass on a string whose
 * max id still counted the dropped vendor.
 */
class TcSemanticPreEncoderTest {
	@Test
	fun `legitimate interest is never written for purposes 1, 3, 4, 5 or 6`() {
		val written = encodeWith(purposeLI = (1..PURPOSE_COUNT).toList())

		assertEquals(
			listOf(2, 7, 8, 9, 10),
			decode(written).core.purposeLegitimateInterests,
			"the five purposes the framework refuses an LI basis for came back in the bytes",
		)
		// Byte equality, so the FixedBitField shrinks identically and not merely the ids.
		assertEquals(
			encodeWith(purposeLI = listOf(2, 7, 8, 9, 10)),
			written,
			"a string written from an unpruned model must be the string written from the pruned one",
		)
	}

	@Test
	fun `purposes 2 and 7 through 10 keep their legitimate interest`() {
		// The other half of the rule: a constant unset that also cleared 2 or 9 would look identical
		// in the test above if that test only checked what disappeared.
		val core = decode(encodeWith(purposeLI = (1..PURPOSE_COUNT).toList())).core
		assertEquals(
			(1..PURPOSE_COUNT).toList().filterNot { it in TcSemanticPreEncoder.purposesNeverLegitimateInterest },
			core.purposeLegitimateInterests,
		)
	}

	@Test
	fun `a vendor the list does not carry loses both signals`() {
		val written = encodeWith(vendorConsents = listOf(ANNOUNCED, UNKNOWN), vendorLI = listOf(ANNOUNCED, UNKNOWN))
		val core = decode(written).core

		assertEquals(listOf(ANNOUNCED), core.vendorConsents.ids)
		assertEquals(listOf(ANNOUNCED), core.vendorLegitimateInterests.ids)
		// The section header names the highest id it spans, so an id that is dropped late rather
		// than early leaves a 700-wide section for a string that says nothing about 700.
		assertEquals(ANNOUNCED, core.vendorConsents.maxId, "the max id still counts the pruned vendor")
		assertEquals(ANNOUNCED, core.vendorLegitimateInterests.maxId)
		assertEquals(encodeWith(vendorConsents = listOf(ANNOUNCED), vendorLI = listOf(ANNOUNCED)), written)
	}

	@Test
	fun `a vendor withdrawn from the list loses both signals`() {
		// deletedDate is what a withdrawn vendor carries. The reference tests the field for
		// truthiness, so a real date withdraws and an empty string does not.
		val withdrawn = TcVendor(id = WITHDRAWN, purposes = listOf(2), legIntPurposes = listOf(2), deletedDate = "2024-10-01T00:00:00Z")
		val written = encodeWith(
			vendors = listOf(withdrawn),
			vendorConsents = listOf(WITHDRAWN),
			vendorLI = listOf(WITHDRAWN),
		)
		val core = decode(written).core

		assertEquals(emptyList(), core.vendorConsents.ids)
		assertEquals(emptyList(), core.vendorLegitimateInterests.ids)
		assertEquals(0, core.vendorConsents.maxId, "an emptied section has to go back to a zero max id")
	}

	@Test
	fun `an empty deletedDate does not withdraw a vendor`() {
		val vendor = TcVendor(id = ANNOUNCED, purposes = listOf(2), legIntPurposes = listOf(2), deletedDate = "")
		val core = decode(encodeWith(vendors = listOf(vendor), vendorConsents = listOf(ANNOUNCED))).core

		assertEquals(listOf(ANNOUNCED), core.vendorConsents.ids)
	}

	@Test
	fun `a vendor that declares the basis keeps its signal`() {
		// Vendor ANNOUNCED declares purpose 2 under both bases, so both bits survive untouched and
		// this is the no-op path the other tests measure themselves against.
		val core = decode(encodeWith(vendorConsents = listOf(ANNOUNCED), vendorLI = listOf(ANNOUNCED))).core

		assertEquals(listOf(ANNOUNCED), core.vendorConsents.ids)
		assertEquals(listOf(ANNOUNCED), core.vendorLegitimateInterests.ids)
	}

	@Test
	fun `a vendor declaring only special purposes keeps its legitimate interest`() {
		// The June 2021 carve-out, and the first of the reference's two branches: purposes empty,
		// legIntPurposes empty, specialPurposes populated. Consent has no such exemption.
		val specialOnly = TcVendor(id = SPECIAL_ONLY, specialPurposes = listOf(1, 2))
		val core = decode(encodeWith(vendors = listOf(specialOnly), vendorConsents = listOf(SPECIAL_ONLY), vendorLI = listOf(SPECIAL_ONLY))).core

		assertEquals(emptyList(), core.vendorConsents.ids, "special purposes are not a consent basis")
		assertEquals(listOf(SPECIAL_ONLY), core.vendorLegitimateInterests.ids)
	}

	@Test
	fun `a vendor declaring consent purposes and special purposes keeps its legitimate interest too`() {
		// The reference's second branch, differing from the one above only in `purposes.length > 0`.
		// It is pinned separately because the two branches are what justify the single test in
		// TcSemanticPreEncoder: if any purpose count ever fell between them, these two tests would
		// disagree with the reference while still agreeing with each other.
		val vendor = TcVendor(id = SPECIAL_ONLY, purposes = listOf(1), specialPurposes = listOf(1))
		val core = decode(encodeWith(vendors = listOf(vendor), vendorConsents = listOf(SPECIAL_ONLY), vendorLI = listOf(SPECIAL_ONLY))).core

		assertEquals(listOf(SPECIAL_ONLY), core.vendorConsents.ids, "purpose 1 is declared, so consent stands")
		assertEquals(listOf(SPECIAL_ONLY), core.vendorLegitimateInterests.ids, "the carve-out does not depend on the consent list")
	}

	@Test
	fun `special purposes do not rescue a legitimate interest for a vendor that declares none`() {
		// No specialPurposes, so the carve-out does not open: an LI signal for a vendor that never
		// claimed an LI basis is exactly what the pass exists to remove.
		val vendor = TcVendor(id = SPECIAL_ONLY, purposes = listOf(1))
		val core = decode(encodeWith(vendors = listOf(vendor), vendorLI = listOf(SPECIAL_ONLY))).core

		assertEquals(emptyList(), core.vendorLegitimateInterests.ids)
	}

	@Test
	fun `flexible purposes rescue nothing when the string carries no purpose restrictions`() {
		// The path the reference gates on isServiceSpecific. It asks whether a publisher restriction
		// overrides this vendor's basis, and TcConsentInput has no field able to carry one, so the
		// answer is always no and the bit goes. Both scopes, because the reference reaches the same
		// verdict from the other direction for a global string: flexible purposes cannot apply at all
		// outside service-specific, since purpose restrictions only exist there.
		val flexible = TcVendor(
			id = FLEXIBLE,
			purposes = listOf(2),
			legIntPurposes = emptyList(),
			flexiblePurposes = listOf(2),
		)

		for (serviceSpecific in listOf(true, false)) {
			val core = decode(
				encodeWith(vendors = listOf(flexible), serviceSpecific = serviceSpecific, vendorLI = listOf(FLEXIBLE)),
			).core

			assertTrue(
				core.vendorLegitimateInterests.ids.isEmpty(),
				"service-specific=$serviceSpecific: a flexible purpose cannot stand in for a declared LI basis",
			)
		}
	}

	@Test
	fun `disclosed vendors are not pruned against the list`() {
		// The reference filters exactly two vectors and the purpose LI field. VendorsDisclosed records
		// who the user was shown, which is a fact about the publisher's own list, not a claim about
		// who declares what -- so pruning it would rewrite history to fit a GVL. Over-pruning here is
		// the likeliest mistake in this whole pass and it costs nothing to pin.
		val written = encodeWith(vendorsDisclosed = listOf(ANNOUNCED, UNKNOWN))

		assertEquals(listOf(ANNOUNCED, UNKNOWN), decode(written).vendorsDisclosed?.ids)
	}

	@Test
	fun `the pass touches nothing outside the fields it answers for`() {
		val baseline = encodeWith(purposeLI = listOf(2), vendorConsents = listOf(ANNOUNCED))
		val pruned = encodeWith(
			purposeLI = listOf(1, 2, 3, 4, 5, 6),
			vendorConsents = listOf(ANNOUNCED, UNKNOWN),
			vendorLI = listOf(UNKNOWN),
		)

		// The whole claim in one comparison, and a stronger one than reading fields back: the string
		// written from an input carrying the prunable signals has to be identical to the string
		// written from an input that never had them. A date moved, a country code moved, the disclosed
		// vendors shrank, a segment appeared -- any of them lands here as a different byte.
		assertEquals(
			baseline,
			pruned,
			"pruning LI purposes 1 and 3 through 6, plus two unbacked vendor signals, moved more than " +
				"those signals",
		)
	}

	/**
	 * Author a string from one vendor list and a few signals, the smallest call that reaches every
	 * rule. Everything not named here is a constant, so two calls that differ in one argument differ
	 * in the bytes by that argument and nothing else.
	 */
	private fun encodeWith(
		vendors: List<TcVendor> = listOf(declaredVendor),
		serviceSpecific: Boolean = true,
		purposeLI: List<Int> = emptyList(),
		vendorConsents: List<Int> = emptyList(),
		vendorLI: List<Int> = emptyList(),
		vendorsDisclosed: List<Int> = emptyList(),
	): String = TcStringEncoder.encode(
		TcConsentInput(
			cmpId = CMP_ID,
			confirmedAtMillis = CONFIRMED_AT_MILLIS,
			vendorList = TcVendorList(
				vendorListVersion = VENDOR_LIST_VERSION,
				tcfPolicyVersion = POLICY_VERSION,
				vendors = vendors,
			),
			isServiceSpecific = serviceSpecific,
			purposeLegitimateInterests = purposeLI,
			vendorConsents = vendorConsents,
			vendorLegitimateInterests = vendorLI,
			vendorsDisclosed = vendorsDisclosed,
		),
	)

	private fun decode(encoded: String): TcString = TcStringDecoder.decode(encoded)

	/** Present in every [encodeWith] list unless the test supplies its own: declares purpose 2 both ways. */
	private val declaredVendor = TcVendor(id = ANNOUNCED, purposes = listOf(2), legIntPurposes = listOf(2))

	private companion object {
		/** A real decision instant: a UTC day boundary, which is the grain the string stores. */
		private const val CONFIRMED_AT_MILLIS = 1_769_990_400_000L

		private const val CMP_ID = 22
		private const val VENDOR_LIST_VERSION = 177
		private const val POLICY_VERSION = 5

		/** A vendor the default list carries. */
		private const val ANNOUNCED = 8

		/** A vendor no list carries, for the id-that-resolves-to-nobody case. */
		private const val UNKNOWN = 700

		private const val WITHDRAWN = 400
		private const val SPECIAL_ONLY = 300
		private const val FLEXIBLE = 200

		/** TC v2 defines ten purposes; the LI rule is stated over all of them. */
		private const val PURPOSE_COUNT = 10
	}
}
