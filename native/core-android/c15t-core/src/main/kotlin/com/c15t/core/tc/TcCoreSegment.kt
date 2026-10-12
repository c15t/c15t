package com.c15t.core.tc

/**
 * The core segment of a TC String: who collected the consent, when, in what language, and for
 * which purposes and vendors.
 *
 * Field order and widths are the two authorities for this format, and where prose disagrees they
 * win: `lib/mjs/encoder/sequence/FieldSequence.js` for the order, `lib/mjs/encoder/BitLength.js`
 * for the widths. Read left to right, the segment is:
 *
 * ```text
 * Version                     6 bits   @  0
 * Created                    36 bits   @  6   UTC day, deciseconds since the epoch
 * LastUpdated                36 bits   @ 42
 * CmpId                      12 bits   @ 78
 * CmpVersion                 12 bits   @ 90
 * ConsentScreen               6 bits   @102
 * ConsentLanguage            12 bits   @108   two letters, 6 bits each
 * VendorListVersion          12 bits   @120
 * TcfPolicyVersion            6 bits   @132
 * IsServiceSpecific           1 bit    @138
 * UseNonStandardTexts         1 bit    @139
 * SpecialFeatureOptIns       12 bits   @140
 * PurposesConsent            24 bits   @152
 * PurposesLITransparency     24 bits   @176
 * PurposeOneTreatment         1 bit    @200
 * PublisherCC                12 bits   @201   two letters, 6 bits each
 * Vendor Consent Section               @213   MaxVendorId 16 + IsRangeEncoding 1 + payload
 * Vendor Legitimate Interest Section         MaxVendorId 16 + IsRangeEncoding 1 + payload
 * Publisher Restrictions Section             12-bit count, required even when it is 0
 * ```
 *
 * The two vendor sections are what make this variable length, and only they: everything up to bit
 * 213 is fixed, which is why every hand-checked offset in the tests stops there.
 *
 * A note on the two names that are not this build's to reconcile. The formats document and the
 * oracle both call the bit at 139 `UseNonStandardTexts`, and the CMP API publishes it on the
 * defaults bus as `IABTCF_UseNonStandardTexts`; the field is referred to elsewhere as
 * useNonStandardStacks. That is a mismatch between two IAB layers. This type follows the oracle.
 *
 * @property createdMillis [createdDeciseconds] times 100, i.e. the UTC day the string claims.
 * @property consentLanguage Two-letter ISO 639-1 code, uppercase, as the spec encodes it.
 * @property publisherCountryCode Two-letter ISO 3166-1 alpha-2 code of the publisher.
 */
data class TcCoreSegment(
	val version: Int,
	val createdDeciseconds: Long,
	val lastUpdatedDeciseconds: Long,
	val cmpId: Int,
	val cmpVersion: Int,
	val consentScreen: Int,
	val consentLanguage: String,
	val vendorListVersion: Int,
	val policyVersion: Int,
	val isServiceSpecific: Boolean,
	val useNonStandardTexts: Boolean,
	val specialFeatureOptins: List<Int>,
	val purposeConsents: List<Int>,
	val purposeLegitimateInterests: List<Int>,
	val purposeOneTreatment: Boolean,
	val publisherCountryCode: String,
	val vendorConsents: TcVectorSection,
	val vendorLegitimateInterests: TcVectorSection,
	val publisherRestrictions: TcPublisherRestrictions,
) {
	/** The UTC day the string was created, in milliseconds since the epoch. */
	val createdMillis: Long
		get() = createdDeciseconds * 100L

	/** The UTC day the string was last updated, in milliseconds since the epoch. */
	val lastUpdatedMillis: Long
		get() = lastUpdatedDeciseconds * 100L

	/**
	 * The core field that stops this segment from being written back, or null if none does.
	 *
	 * Two fields carry more than this build's encoder is willing to say. Publisher restrictions are
	 * a GVL-semantic structure -- the reference filters them against each vendor's declared and
	 * flexible purposes before writing one -- and PurposeOneTreatment is a policy statement about
	 * whether Purpose 1 was disclosed at all. c15t's web codec never sets either, so a mobile
	 * encoder that wrote them would be inventing behaviour with no web counterpart to check it
	 * against. Refusing is the honest move: the alternative is a string that decodes with the
	 * constraint gone, which is a consent state quietly edited.
	 *
	 * Callers use this to separate "round-trip this string" from "decode it and stop": nothing here
	 * fails just because a string carries one of the two.
	 */
	val fieldBlockingEncode: String?
		get() = when {
			!publisherRestrictions.isEmpty -> "publisherRestrictions"
			purposeOneTreatment -> "purposeOneTreatment"
			else -> null
		}

	/** Write the segment, which throws for the two fields named by [fieldBlockingEncode]. */
	fun write(writer: BitWriter) {
		fieldBlockingEncode?.let {
			throw TcEncodingException("refusing to encode $it: this codec does not write it, and dropping it would change the consent state")
		}
		writer.appendInt(version.toLong(), VERSION_BITS)
		writer.appendInt(createdDeciseconds, DATE_BITS)
		writer.appendInt(lastUpdatedDeciseconds, DATE_BITS)
		writer.appendInt(cmpId.toLong(), CMP_ID_BITS)
		writer.appendInt(cmpVersion.toLong(), CMP_VERSION_BITS)
		writer.appendInt(consentScreen.toLong(), CONSENT_SCREEN_BITS)
		writer.appendLetters(consentLanguage, CONSENT_LANGUAGE_BITS)
		writer.appendInt(vendorListVersion.toLong(), VENDOR_LIST_VERSION_BITS)
		writer.appendInt(policyVersion.toLong(), POLICY_VERSION_BITS)
		writer.appendFlag(isServiceSpecific)
		writer.appendFlag(useNonStandardTexts)
		writer.appendFixedIds(specialFeatureOptins, SPECIAL_FEATURE_OPTINS_BITS)
		writer.appendFixedIds(purposeConsents, PURPOSE_BITS)
		writer.appendFixedIds(purposeLegitimateInterests, PURPOSE_BITS)
		writer.appendFlag(purposeOneTreatment)
		writer.appendLetters(publisherCountryCode, PUBLISHER_COUNTRY_CODE_BITS)
		vendorConsents.write(writer)
		vendorLegitimateInterests.write(writer)
		writer.appendInt(0L, TcPublisherRestrictions.NUM_RESTRICTIONS_BITS)
	}

	companion object {
		/** `BitLength.version`. */
		const val VERSION_BITS = 6

		/** `BitLength.created` and `BitLength.lastUpdated`. */
		const val DATE_BITS = 36

		/** `BitLength.cmpId`. */
		const val CMP_ID_BITS = 12

		/** `BitLength.cmpVersion`. */
		const val CMP_VERSION_BITS = 12

		/** `BitLength.consentScreen`. */
		const val CONSENT_SCREEN_BITS = 6

		/** `BitLength.consentLanguage`. */
		const val CONSENT_LANGUAGE_BITS = 12

		/** `BitLength.vendorListVersion`. */
		const val VENDOR_LIST_VERSION_BITS = 12

		/** `BitLength.policyVersion`. */
		const val POLICY_VERSION_BITS = 6

		/** `BitLength.specialFeatureOptins`. */
		const val SPECIAL_FEATURE_OPTINS_BITS = 12

		/** `BitLength.purposeConsents` and `BitLength.purposeLegitimateInterests`. */
		const val PURPOSE_BITS = 24

		/** `BitLength.publisherCountryCode`. */
		const val PUBLISHER_COUNTRY_CODE_BITS = 12

		/** The encoding format this decoder reads, and the only one TCF has reached. */
		const val SUPPORTED_VERSION = 2

		/**
		 * Read the core segment from the start of its base64url-decoded bits.
		 *
		 * @param bits The decoded bits of one dot-segment, bit 0 being the segment's first bit.
		 * @throws TcDecodingException for a version this format has not reached, a truncated
		 * segment, or a tail of bits no field claimed.
		 */
		fun read(bits: String): TcCoreSegment {
			val reader = BitReader(bits)
			val version = reader.readInt(VERSION_BITS).toInt()
			if (version != SUPPORTED_VERSION) {
				// A v1 string has no policy version, no publisher country code, and a different
				// vendor encoding, so reading it with this table produces plausible nonsense rather
				// than an error. Refusing is the only answer that stays wrong in a legible way.
				throw TcDecodingException("TC string core version $version is not v$SUPPORTED_VERSION")
			}
			val segment = TcCoreSegment(
				version = version,
				createdDeciseconds = reader.readInt(DATE_BITS),
				lastUpdatedDeciseconds = reader.readInt(DATE_BITS),
				cmpId = reader.readInt(CMP_ID_BITS).toInt(),
				cmpVersion = reader.readInt(CMP_VERSION_BITS).toInt(),
				consentScreen = reader.readInt(CONSENT_SCREEN_BITS).toInt(),
				consentLanguage = reader.readLetters(CONSENT_LANGUAGE_BITS),
				vendorListVersion = reader.readInt(VENDOR_LIST_VERSION_BITS).toInt(),
				policyVersion = reader.readInt(POLICY_VERSION_BITS).toInt(),
				isServiceSpecific = reader.readFlag(),
				useNonStandardTexts = reader.readFlag(),
				specialFeatureOptins = reader.readFixedIds(SPECIAL_FEATURE_OPTINS_BITS),
				purposeConsents = reader.readFixedIds(PURPOSE_BITS),
				purposeLegitimateInterests = reader.readFixedIds(PURPOSE_BITS),
				purposeOneTreatment = reader.readFlag(),
				publisherCountryCode = reader.readLetters(PUBLISHER_COUNTRY_CODE_BITS),
				vendorConsents = TcVectorSection.read(reader),
				vendorLegitimateInterests = TcVectorSection.read(reader),
				publisherRestrictions = TcPublisherRestrictions.read(reader),
			)
			TcStringDecoder.rejectLeftoverBits(reader, "core")
			return segment
		}
	}
}
