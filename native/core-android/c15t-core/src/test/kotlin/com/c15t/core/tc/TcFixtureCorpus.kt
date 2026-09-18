package com.c15t.core.tc

/**
 * The TC Strings this suite runs against, in one place.
 *
 * **PROVISIONAL SEAM -- DELETE THIS ARRAY AT MERGE.** The authoritative corpus is the `tc-string`
 * fixture set in `native/protocol`, which the vectors lane owns and publishes through
 * `native/protocol/index.json`. That set does not exist yet: the index holds 25 fixtures today, of
 * kinds `evaluation`, `native-envelope`, `save-body`, `reset-consent` and `revision-trace`, and
 * `native/CONTRACT.md` still says TCF is out of scope. So this array is a stand-in, and the merge
 * step is to delete it and point [cases] at the shared fixtures. The accessor stays; the array
 * goes.
 *
 * Two rules keep this from becoming a second source of truth:
 *
 * - [cases] is the only way into the corpus, and it is the only place in this test target that
 *   holds a TC String literal or assembles segment bits. A test that needs a string asks here.
 * - Every case names its provenance, so whoever deletes this can tell a spec example from something
 *   a probe produced, and can drop the ones the shared fixtures cover better.
 *
 * A case's expectations are hand-computed, not copied from a run: `expect` records the arithmetic,
 * and [TcStringCorpusTest] checks the decoder against it. Byte equality of a re-encode is checked
 * against [encoded] by [TcStringRoundTripTest], never against a decoded map.
 */
object TcFixtureCorpus {
	/** What this build owes a string. */
	enum class Outcome {
		/** Decode, then write back, and the bytes have to come out the same. */
		BYTE_EXACT_ROUND_TRIP,

		/** Decode only. [blockedField] names the core field this codec declines to write. */
		DECODE_ONLY,

		/** Not a TC String this format describes: decoding has to refuse it. */
		REJECTED,
	}

	/**
	 * One corpus entry.
	 *
	 * @property blockedField For [Outcome.DECODE_ONLY], the field from
	 * [TcCoreSegment.fieldBlockingEncode]. For [Outcome.REJECTED], a fragment of the message the
	 * refusal has to carry. Null when the outcome is [Outcome.BYTE_EXACT_ROUND_TRIP].
	 * @property cmpId The value the decoder must read out of the CmpId field at @78 x12.
	 * @property policyVersion The value of TcfPolicyVersion at @132 x6.
	 * @property vendorConsents The vendor ids the consent section resolves to, in either encoding.
	 * @property publisherCountryCode Defaults to the web default, `US`, because that is what every
	 * string assembled here carries; the two strings copied out of the wild both say `DE`.
	 * @property numCustomPurposes The Publisher TC segment's declared custom-purpose width, or null
	 * when the string carries no Publisher TC segment at all -- which is a different claim from 0.
	 * @property vendorsDisclosed The disclosed ids, or null meaning the string carries no
	 * VendorsDisclosed section at all. The section is mandatory only from TCF v2.3, so a pre-2.3
	 * string can legitimately omit it; absent and present-but-empty are different claims and null
	 * is how this type says absent. Same convention as [vendorsAllowed] and [numCustomPurposes].
	 * @property vendorsAllowed The out-of-band ids, or null meaning the string must carry no
	 * vendors-allowed section. Null is an expectation, not "don't check".
	 * @property publisherRestrictions The restrictions the decoder has to read back structurally. The
	 * codec refuses to write these, but reading them is the requirement, so the section is asserted
	 * entry by entry rather than only by its count.
	 */
	data class Case(
		val id: String,
		val provenance: String,
		val encoded: String,
		/** Round-trips byte for byte unless a case says otherwise. */
		val outcome: Outcome = Outcome.BYTE_EXACT_ROUND_TRIP,
		val blockedField: String? = null,
		val cmpId: Int = 0,
		val policyVersion: Int = 0,
		val vendorListVersion: Int = 0,
		val consentLanguage: String = "EN",
		val publisherCountryCode: String = "US",
		val isServiceSpecific: Boolean = true,
		val purposeConsents: List<Int> = emptyList(),
		val vendorConsents: List<Int> = emptyList(),
		val vendorsDisclosed: List<Int>? = emptyList(),
		val vendorsAllowed: List<Int>? = null,
		val numCustomPurposes: Int? = null,
		val unknownSectionTypeIds: List<Int> = emptyList(),
		val purposeOneTreatment: Boolean = false,
		val publisherRestrictions: List<TcPurposeRestriction> = emptyList(),
	)

	/** The corpus. This is the array the merge step deletes; [Case] and the builders below stay. */
	fun cases(): List<Case> = listOf(
		s2WorkedExample(),
		c15tMinimal(),
		productionShape(),
		globalScope(),
		publisherCustomPurposes(),
		publisherRestrictions(),
		purposeOneTreatment(),
		vendorsAllowedSegment(),
		unknownSegmentType(),
		dirtyPaddingBits(),
		truncatedSegment(),
		versionOneCore(),
		notBase64Url(),
	)

	/**
	 * The one worked example in the formats document, reproduced because it is the only string the
	 * spec itself publishes. Decoded, it is version 2, CmpId 880, Created and LastUpdated both
	 * 17489088000 deciseconds, which is 2025-06-03T00:00:00Z -- a clean UTC day, which is what the
	 * format asks for -- EN, DE, vendor list 48, TCF policy 2, consent section maxId 4 written as a
	 * bitfield of four ones, and a Disclosed Vendors section reaching vendor 404 in range form.
	 *
	 * Its policy version is 2, so it is a format example and not a production one: a live GVL
	 * reports TcfPolicyVersion 5, and nothing on the web writes 2 any more. [productionShape] is the
	 * vector that pins 5.
	 */
	private fun s2WorkedExample() = Case(
		id = "spec-worked-example",
		provenance = "IAB Tech Lab consent string and vendor list formats v2, 'Full TC String passing'",
		encoded = "CQSbk4AQSbk4ANwAAAENAwCgAAAAAAAAAAYgACPAAAAA.IDKQA4AAgAKAGQAygAAA.YAAAAAAAAAAA",
		cmpId = 880,
		policyVersion = 2,
		vendorListVersion = 48,
		publisherCountryCode = "DE",
		vendorConsents = listOf(1, 2, 3, 4),
		vendorsDisclosed = listOf(1, 2, 3, 4, 5, 100, 404),
		numCustomPurposes = 0,
	)

	/**
	 * `MINIMAL_TC_STRING`, the string c15t's own web test fixtures already ship
	 * (`packages/iab/src/__tests__/fixtures/tc-strings.ts`). Claiming the bytes the web suite
	 * already claims is cheaper than inventing a near-duplicate.
	 *
	 * Two things to know about it, both worth carrying into the shared fixtures rather than
	 * rediscovering. Its Created field is 16504920000 deciseconds, which is 2022-04-20T22:00:00Z: a
	 * day-level field holding 22:00, i.e. somebody's local midnight, which the format's UTC rule
	 * does not allow. And its policy version is 2. It is a hand-authored vector, useful for the
	 * field layout and not for the values.
	 *
	 * It is also core-only: no Disclosed Vendors, no Publisher TC. That is legal for its vintage and
	 * is the corpus's one counterexample to "every string carries a disclosed-vendor section", so a
	 * decoder that required it would reject a string sitting in a real publisher's storage today.
	 */
	private fun c15tMinimal() = Case(
		id = "c15t-minimal",
		provenance = "packages/iab/src/__tests__/fixtures/tc-strings.ts",
		encoded = "CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAA",
		cmpId = 31,
		policyVersion = 2,
		vendorListVersion = 126,
		publisherCountryCode = "DE",
		vendorsDisclosed = null,
	)

	/**
	 * The shape a live c15t string has today, authored through this build's own encoder rather than
	 * pasted: vendor list 177 and TCF policy 5, the two numbers the current GVL carries, purposes
	 * 1 to 10 on consent, 50 contiguous vendors, and 52 disclosed vendors reaching 100 so the
	 * Disclosed Vendors section goes out in range form.
	 *
	 * This is the parity vector that pins policy version 5. The spec example cannot do that job, and
	 * neither can anything that pins 2 -- no live publisher writes 2.
	 */
	private fun productionShape(): Case {
		val encoded = TcStringEncoder.encode(
			TcConsentInput(
				cmpId = CMP_ID,
				confirmedAtMillis = DAY_2026_09_18,
				vendorListVersion = 177,
				policyVersion = LIVE_POLICY_VERSION,
				cmpVersion = 1,
				purposeConsents = (1..10).toList(),
				specialFeatureOptins = listOf(1, 2),
				vendorConsents = (1..50).toList(),
				vendorLegitimateInterests = listOf(3, 7),
				vendorsDisclosed = (1..50).toList() + listOf(100),
			),
		)
		return Case(
			id = "production-shape-policy-5",
			provenance = "authored by TcStringEncoder against the live GVL's version numbers",
			encoded = encoded,
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			purposeConsents = (1..10).toList(),
			vendorConsents = (1..50).toList(),
			vendorsDisclosed = (1..50).toList() + listOf(100),
			numCustomPurposes = 0,
		)
	}

	/**
	 * `isServiceSpecific = 0`, which the encoder answers with two segments and no Publisher TC -- the
	 * sequence `SegmentSequence.js` produces for global scope when `supportOOB` is false.
	 *
	 * Global scope was deprecated on 1 September 2021 and a vendor treats IsServiceSpecific=0 as
	 * invalid, so this case exists because the field can arrive as 0 from another CMP and the decoder
	 * has to report it rather than assume it.
	 */
	private fun globalScope(): Case {
		val encoded = TcStringEncoder.encode(
			TcConsentInput(
				cmpId = CMP_ID,
				confirmedAtMillis = DAY_2026_09_18,
				vendorListVersion = 177,
				policyVersion = LIVE_POLICY_VERSION,
				isServiceSpecific = false,
				vendorConsents = listOf(4),
				vendorsDisclosed = listOf(4),
			),
		)
		return Case(
			id = "global-scope-two-segments",
			provenance = "authored by TcStringEncoder, isServiceSpecific = false",
			encoded = encoded,
			isServiceSpecific = false,
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			vendorConsents = listOf(4),
			vendorsDisclosed = listOf(4),
		)
	}

	/**
	 * A Publisher TC segment with five custom purposes, three of them consented.
	 *
	 * Decode coverage, which is what the requirement asks for: custom purposes are positional and
	 * their width comes from NumCustomPurposes, and this is the one place in the format where a
	 * field's length is a value in an earlier field. The web codec never writes it, so nothing here
	 * authors it -- and the oracle shows what happens if a model tries: with custom consents set and
	 * NumCustomPurposes left at 0 it throws instead of producing a string. A decoder's job is the
	 * other direction, so the corpus reads a string that a compliant CMP would have written.
	 *
	 * Offsets, after the 3-bit SegmentType: PubPurposesConsent @3 x24, PubPurposesLITransparency @27
	 * x24, NumCustomPurposes @51 x6, CustomPurposesConsent @57 x5, CustomPurposesLITransparency @62
	 * x5, so 67 bits of fields.
	 */
	private fun publisherCustomPurposes(): Case {
		val publisher = BitWriter()
			.appendFixedIds(listOf(2, 3), 24) // @3  publisher purposes 2 and 3
			.appendFixedIds(listOf(1), 24) // @27 publisher LI purpose 1
			.appendInt(5L, 6) // @51 NumCustomPurposes = 5
			.appendFixedIds(listOf(1, 3, 5), 5) // @57 custom consents 1, 3, 5 of 5
			.appendFixedIds(listOf(2), 5) // @62 custom LI 2 of 5
		val core = coreBits(purposeConsents = listOf(1))
		return Case(
			id = "publisher-custom-purposes",
			provenance = "assembled from the field table; Publisher TC as the formats document lays it out",
			encoded = join(core, section(TcSegmentType.VENDORS_DISCLOSED.id, emptyVectorBits()), section(3, publisher.toBits())),
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			purposeConsents = listOf(1),
			numCustomPurposes = 5,
		)
	}

	/**
	 * Two publisher constraints, which is the section this codec reads and refuses to write.
	 *
	 * Offsets, from the 12-bit count that a core segment always carries:
	 * NumPubRestrictions @247 x12 (after a consent section of 17 bits and an LI section of 17, both
	 * empty, from 213), then per entry PurposeId x6, RestrictionType x2, NumEntries x12, and per
	 * range entry IsARange x1, StartOrOnlyVendorId x16, EndVendorId x16 when IsARange is 1.
	 *
	 * The first entry here is purpose 2, REQUIRE_CONSENT, one range entry 4 to 6; the second is
	 * purpose 3, NOT_ALLOWED, with a single 9 and a range 11 to 13. That is 135 bits of section, and
	 * the oracle's own `PurposeRestrictionVectorEncoder.decode` agrees on every number, which is how
	 * these offsets were checked: the bits were written from the table, and the reference read them
	 * back as 2 restrictions over vendors [4,5,6] and [9,11,12,13].
	 */
	private fun publisherRestrictions(): Case {
		val restrictions = BitWriter()
			.appendInt(2L, 12) // NumPubRestrictions = 2
			.appendInt(2L, 6) // PurposeId = 2
			.appendInt(1L, 2) // RestrictionType = 1 REQUIRE_CONSENT
			.appendInt(1L, 12) // NumEntries = 1
			.appendFlag(true) // IsARange = 1
			.appendInt(4L, 16) // StartOrOnlyVendorId = 4
			.appendInt(6L, 16) // EndVendorId = 6
			.appendInt(3L, 6) // PurposeId = 3
			.appendInt(0L, 2) // RestrictionType = 0 NOT_ALLOWED
			.appendInt(2L, 12) // NumEntries = 2
			.appendFlag(false) // IsARange = 0
			.appendInt(9L, 16) // StartOrOnlyVendorId = 9
			.appendFlag(true) // IsARange = 1
			.appendInt(11L, 16) // StartOrOnlyVendorId = 11
			.appendInt(13L, 16) // EndVendorId = 13
		return Case(
			id = "publisher-restrictions",
			provenance = "assembled from the field table, then read back by the oracle's restriction decoder",
			encoded = join(coreBits(restrictionsBits = restrictions.toBits())),
			outcome = Outcome.DECODE_ONLY,
			blockedField = "publisherRestrictions",
			// Core-only on purpose: the restrictions section closes the core segment, so nothing
			// after it is needed to reach it.
			vendorsDisclosed = null,
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			publisherRestrictions = listOf(
				TcPurposeRestriction(purposeId = 2, restrictionTypeValue = 1, ranges = listOf(TcIdRange(4, 6))),
				TcPurposeRestriction(
					purposeId = 3,
					restrictionTypeValue = 0,
					ranges = listOf(TcIdRange(9, 9), TcIdRange(11, 13)),
				),
			),
		)
	}

	/**
	 * PurposeOneTreatment = 1: the CMP is saying Purpose 1 was never disclosed, which is a claim about
	 * the consent journey and not a bit this build can infer from a c15t decision. c15t's web codec
	 * never sets it, so there is no web output to match. Decode asserts it, encode refuses.
	 */
	private fun purposeOneTreatment() = Case(
		id = "purpose-one-treatment",
		provenance = "assembled from the field table, PurposeOneTreatment = 1 at @200",
			encoded = join(coreBits(purposeOneTreatment = true)),
			outcome = Outcome.DECODE_ONLY,
			blockedField = "purposeOneTreatment",
			vendorsDisclosed = null,
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			purposeOneTreatment = true,
		)

	/**
	 * Segment type 2, the out-of-band vendors-allowed section.
	 *
	 * The formats document's enum lists 0, 1 and 3 and stops; the oracle reserves 2. The resolution
	 * both sources support is read it, never write it, so the decoder models it and the encoder has no
	 * path that authors it. The ids are 2, 3, 4 and 30, which [TcVectorSection.ofIds] packs as a
	 * 30-bit bitfield: at maxId 30 the bitfield is 47 bits and the cheapest range encoding is 45 plus
	 * the entries, so the smaller-of-two rule keeps the bitfield and the 16-vs-17-bit threshold gets
	 * exercised by [productionShape] instead.
	 */
	private fun vendorsAllowedSegment(): Case {
		val allowed = TcVectorSection.ofIds(listOf(2, 3, 4, 30))
		return Case(
			id = "vendors-allowed-segment",
			provenance = "assembled from the field table; segment type 2, which the encoder never authors",
			encoded = join(
				coreBits(purposeConsents = listOf(1)),
				section(TcSegmentType.VENDORS_DISCLOSED.id, emptyVectorBits()),
				section(TcSegmentType.VENDORS_ALLOWED.id, allowed.writeToBits()),
			),
			cmpId = CMP_ID,
			policyVersion = LIVE_POLICY_VERSION,
			vendorListVersion = 177,
			purposeConsents = listOf(1),
			vendorsAllowed = listOf(2, 3, 4, 30),
		)
	}

	/**
	 * Segment type 5, which no source defines.
	 *
	 * A later revision can add a section and this build is not in the loop when it does. The documented
	 * duty is to tolerate a segment the decoder does not model, and the way to tolerate one without
	 * losing it is to carry its bits through unread -- so this round-trips byte for byte, which is the
	 * check that nothing was dropped.
	 */
	private fun unknownSegmentType(): Case = Case(
		id = "unknown-segment-type",
		provenance = "assembled with a SegmentType the formats document does not define",
		encoded = join(
			coreBits(purposeConsents = listOf(1)),
			section(TcSegmentType.VENDORS_DISCLOSED.id, emptyVectorBits()),
			section(5, BitWriter().appendInt(4095L, 12).toBits()),
		),
		cmpId = CMP_ID,
		policyVersion = LIVE_POLICY_VERSION,
		vendorListVersion = 177,
		purposeConsents = listOf(1),
		unknownSectionTypeIds = listOf(5),
	)

	/**
	 * A string whose base64url padding holds a 1.
	 *
	 * Legal-looking and unreadable. [Base64Url.encodeBits] zero-pads a segment to a multiple of 24
	 * bits, so the last character of `c15t-minimal` carries five bits no field owns; setting one of
	 * them says something the format has no field for, and no encoder can put it back. Refusing is
	 * the only answer that does not silently edit someone's string.
	 */
	private fun dirtyPaddingBits() = Case(
		id = "dirty-padding-bits",
		provenance = "c15t-minimal with its last character changed, setting a padding bit",
		encoded = "CPXxRfAPXxRfAAfKABENB-CgAAAAAAAAAAYgAAAAAAAB",
		outcome = Outcome.REJECTED,
		blockedField = "padding",
	)

	/** A string cut off mid-segment, which is what a truncated store write looks like. */
	private fun truncatedSegment() = Case(
		id = "truncated-segment",
		provenance = "the first 20 characters of c15t-minimal",
		encoded = "CPXxRfAPXxRfAAfKABEN",
		outcome = Outcome.REJECTED,
		blockedField = "truncated",
	)

	/** A version 1 core, which has no policy version and no publisher country code to read. */
	private fun versionOneCore() = Case(
		id = "version-one-core",
		provenance = "assembled with Version = 1 at @0 x6",
		encoded = join(coreBits(version = 1)),
		outcome = Outcome.REJECTED,
		blockedField = "version",
	)

	/** A '+' where the alphabet has neither of the characters base64url substituted away. */
	private fun notBase64Url() = Case(
		id = "not-base64url",
		provenance = "c15t-minimal with a base64 '+' substituted in",
		encoded = "CPXxRfAPXxRfAAfKABENB+CgAAAAAAAAAAYgAAAAAAAA",
		outcome = Outcome.REJECTED,
		blockedField = "alphabet",
	)

	// -- builders, also confined to this file ---------------------------------

	/**
	 * A core segment as a base64url dot-segment, with the fixed 213-bit head laid out at its
	 * documented offsets and the three trailing sections defaulted to empty.
	 *
	 * This writes through [BitWriter] rather than pasting a literal so the offsets in
	 * [TcCoreSegment]'s table are the thing under test: if the table and the format disagree, a
	 * string built here stops decoding correctly. The base64url step is not decoration -- bits
	 * handed straight to a dot-segment read as characters, so skipping it produces a string that
	 * decodes to the wrong things instead of failing loudly.
	 */
	private fun coreBits(
		version: Int = 2,
		purposeConsents: List<Int> = emptyList(),
		purposeOneTreatment: Boolean = false,
		restrictionsBits: String = BitWriter().appendInt(0L, 12).toBits(),
	): String {
		val writer = BitWriter()
			.appendInt(version.toLong(), 6) // @0
			.appendInt(DAY_2026_09_18 / 100, 36) // @6 Created, deciseconds
			.appendInt(DAY_2026_09_18 / 100, 36) // @42 LastUpdated
			.appendInt(CMP_ID.toLong(), 12) // @78
			.appendInt(1L, 12) // @90
			.appendInt(1L, 6) // @102
			.appendLetters("EN", 12) // @108
			.appendInt(177L, 12) // @120
			.appendInt(LIVE_POLICY_VERSION.toLong(), 6) // @132
			.appendFlag(true) // @138 IsServiceSpecific
			.appendFlag(false) // @139 UseNonStandardTexts
			.appendFixedIds(emptyList(), 12) // @140
			.appendFixedIds(purposeConsents, 24) // @152
			.appendFixedIds(emptyList(), 24) // @176
			.appendFlag(purposeOneTreatment) // @200
			.appendLetters("US", 12) // @201
			.appendBits(emptyVectorBits()) // @213 Vendor Consent Section
			.appendBits(emptyVectorBits()) // Vendor Legitimate Interest Section
			.appendBits(restrictionsBits) // Publisher Restrictions Section
		return Base64Url.encodeBits(writer.toBits())
	}

	/** maxId 0 with the bitfield flag, which is an empty vendor section: 17 bits. */
	private fun emptyVectorBits(): String = BitWriter().appendInt(0L, 17).toBits()

	/** One dot-segment: its 3-bit SegmentType, its body, then the segment's padding. */
	private fun section(segmentTypeId: Int, bodyBits: String): String {
		val writer = BitWriter().appendInt(segmentTypeId.toLong(), 3).appendBits(bodyBits)
		return Base64Url.encodeBits(writer.toBits())
	}

	private fun join(vararg segments: String) = segments.joinToString(".")

	private fun TcVectorSection.writeToBits(): String {
		val writer = BitWriter()
		write(writer)
		return writer.toBits()
	}

	private const val CMP_ID = 1042

	/** TcfPolicyVersion the current GVL carries, and the number a real string advertises. */
	private const val LIVE_POLICY_VERSION = 5

	/** 2026-09-18T00:00:00Z, a UTC day, which is the resolution the two date fields hold. */
	private const val DAY_2026_09_18 = 1_789_689_600_000L
}
