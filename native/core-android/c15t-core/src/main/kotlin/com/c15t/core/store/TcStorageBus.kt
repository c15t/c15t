package com.c15t.core.store

import com.c15t.core.model.PolicyResolution

// The `IABTCF_*` storage bus.
//
// This is an egress projection, not a store. The authoritative state is the
// envelope under [com.c15t.core.store.C15tStoreKeys.SNAPSHOT] -- the
// AndroidKeyStore-backed file under `noBackupFilesDir` -- and nothing in the
// core trusts a value that reached the bus. What this file owns is the mirror
// the ad-tech ecosystem reads: the IAB CMP API specification ("What is the CMP
// in-app internal structure for the defined API?") says a CMP "shall" keep
// pre-parsed TC data and the TC String in the application-default
// SharedPreferences, and vendor SDKs open exactly that file with the standard
// reads.
//
// The keys this build writes are only the ones whose source value the core
// already owns: the policy version off the stored vendor list, and
// `gdprApplies` off the resolved policy. The remaining rows keep their exact
// names here because clearing and rebuilding the bus must address the whole
// table, and they stay absent until the state they project exists -- the gaps
// are named next to each reserved key and in the report of the PR that added
// this file.
//
// Keys outside the specification table (`IABTCF_AddtlConsent`,
// `IABTCF_UseNonStandardStacks`, `IABUSPrivacy_String`,
// `IABTCF_EnableAdvertiserConsentMode`) belong to other layers or to no
// specification at all; the bus never writes and never removes them.
// `docs/internal/tcf-mobile.md` sections 1.2 and 1.4 hold the evidence.

/** The store type the specification gives a bus key. */
public sealed interface TcBusValue {
	/**
	 * "Number" in the spec table: a small unsigned int.
	 *
	 * The device sink must write it with `putInt`, because vendors read the
	 * numeric rows with `getInt` and a string under these keys does not read.
	 */
	public data class NumberValue(public val value: Int) : TcBusValue

	/**
	 * "String" in the spec table.
	 *
	 * The device sink must write it with `putString`, which is how vendors read
	 * the bit strings and the TC String.
	 */
	public data class TextValue(public val value: String) : TcBusValue
}

/** The key table, one constant per row of the specification's in-app structure. */
public object TcStorageBusKeys {
	/** Spec "Number", unsigned int. Reserved: the core owns no CMP ID -- the ID
	 * comes from IAB Europe registration or `/init`, and neither lands in this
	 * build's state. */
	public const val CMP_SDK_ID: String = "IABTCF_CmpSdkID"

	/** Spec "Number". Reserved: the core owns no CMP version number; the
	 * transport's SDK-version string is a different thing. */
	public const val CMP_SDK_VERSION: String = "IABTCF_CmpSdkVersion"

	/** Spec "Number". Written: the stored vendor list's `tcfPolicyVersion`. */
	public const val POLICY_VERSION: String = "IABTCF_PolicyVersion"

	/** Spec "Number": 1 applies, 0 does not, absent is undetermined. Written
	 * from the resolved policy's model, mirroring `packages/iab`. */
	public const val GDPR_APPLIES: String = "IABTCF_gdprApplies"

	/** Spec "String", default `AA`. Reserved: the publisher country is a
	 * publisher setting (web reads it off the CMP options, not off a visitor's
	 * geo), and the native config carries none. Absence already reads `AA`. */
	public const val PUBLISHER_CC: String = "IABTCF_PublisherCC"

	/** Spec "Number", default 0. Reserved: the core carries no purpose-one
	 * treatment decision; c15t web sets none either. */
	public const val PURPOSE_ONE_TREATMENT: String = "IABTCF_PurposeOneTreatment"

	/** Spec "Number". Reserved: the core carries no customised-stack-text flag. */
	public const val USE_NON_STANDARD_TEXTS: String = "IABTCF_UseNonStandardTexts"

	/** Spec "String", the encoded TC String. Reserved: encoding it needs the CMP
	 * IDs and the purpose and vendor vectors, none of which the consent state
	 * carries yet. Blocks the vector rows below. */
	public const val TC_STRING: String = "IABTCF_TCString"

	/** Spec binary string, index `n` is vendor `n + 1`. Reserved: the core
	 * stores category grants; the category-to-purpose mapping lives in
	 * `packages/iab` and in no native state. */
	public const val VENDOR_CONSENTS: String = "IABTCF_VendorConsents"

	/** Spec binary string. Reserved, same blocker as [VENDOR_CONSENTS]. */
	public const val VENDOR_LEGITIMATE_INTERESTS: String = "IABTCF_VendorLegitimateInterests"

	/** Spec binary string, the vendors disclosed to this device under TCF v2.3.
	 * Reserved, same blocker as [VENDOR_CONSENTS]. */
	public const val DISCLOSED_VENDORS: String = "IABTCF_DisclosedVendors"

	/** Spec binary string, index `n` is purpose `n + 1`. Reserved, same blocker
	 * as [VENDOR_CONSENTS]. */
	public const val PURPOSE_CONSENTS: String = "IABTCF_PurposeConsents"

	/** Spec binary string. Reserved, same blocker as [VENDOR_CONSENTS]. */
	public const val PURPOSE_LEGITIMATE_INTERESTS: String = "IABTCF_PurposeLegitimateInterests"

	/** Spec binary string. Reserved, same blocker as [VENDOR_CONSENTS]. */
	public const val SPECIAL_FEATURES_OPT_INS: String = "IABTCF_SpecialFeaturesOptIns"

	/** Spec three-state string per purpose; `{ID}` names the purpose and a
	 * writer appends it to this prefix. Reserved: c15t collects publisher
	 * restrictions on no platform. */
	public const val PUBLISHER_RESTRICTIONS: String = "IABTCF_PublisherRestrictions"

	/** Spec binary string, the publisher's own purpose consents. Reserved: the
	 * core owns no publisher-section purpose state. */
	public const val PUBLISHER_CONSENT: String = "IABTCF_PublisherConsent"

	/** Spec binary string. Reserved, same blocker as [PUBLISHER_CONSENT]. */
	public const val PUBLISHER_LEGITIMATE_INTERESTS: String = "IABTCF_PublisherLegitimateInterests"

	/** Spec binary string, custom purposes. Reserved, same blocker as
	 * [PUBLISHER_CONSENT]. */
	public const val PUBLISHER_CUSTOM_PURPOSES_CONSENTS: String =
		"IABTCF_PublisherCustomPurposesConsents"

	/** Spec binary string. Reserved, same blocker as [PUBLISHER_CONSENT]. */
	public const val PUBLISHER_CUSTOM_PURPOSES_LEGITIMATE_INTERESTS: String =
		"IABTCF_PublisherCustomPurposesLegitimateInterests"

	/** Every named row: the keys a wipe addresses. Out-of-table names are
	 * deliberately missing -- a bus wipe reaches the specification's keys and
	 * nothing a Google, GPP or USP layer of somebody else's might own. */
	public val ALL_NAMES: List<String> = listOf(
		CMP_SDK_ID,
		CMP_SDK_VERSION,
		POLICY_VERSION,
		GDPR_APPLIES,
		PUBLISHER_CC,
		PURPOSE_ONE_TREATMENT,
		USE_NON_STANDARD_TEXTS,
		TC_STRING,
		VENDOR_CONSENTS,
		VENDOR_LEGITIMATE_INTERESTS,
		DISCLOSED_VENDORS,
		PURPOSE_CONSENTS,
		PURPOSE_LEGITIMATE_INTERESTS,
		SPECIAL_FEATURES_OPT_INS,
		PUBLISHER_RESTRICTIONS,
		PUBLISHER_CONSENT,
		PUBLISHER_LEGITIMATE_INTERESTS,
		PUBLISHER_CUSTOM_PURPOSES_CONSENTS,
		PUBLISHER_CUSTOM_PURPOSES_LEGITIMATE_INTERESTS,
	)
}

/**
 * Deriving the bus keys from a stored envelope.
 *
 * The input is the envelope and nothing else, in both directions that matters:
 * every value here can be recomputed from the bytes the authoritative store
 * holds -- so a wiped bus can be rebuilt -- and no value here may add anything
 * the envelope does not already say. A row whose source field the core does not
 * own produces no entry at all, which is the specification's answer for a key
 * no CMP has set (`AA`, `0`, undetermined) and is strictly better than writing
 * a guessed one.
 *
 * This module is pure JVM by design and this object keeps that rule: it touches
 * no Android class. The host that supplies the [TcStorageBusSink] is the place
 * the platform enters.
 */
internal object TcStorageBusProjection {
	/**
	 * The full desired contents of the bus for [envelope].
	 *
	 * Keys absent from the result are keys the bus must not hold, so a write of
	 * this map is a whole-table replace, not a patch.
	 */
	fun values(envelope: SnapshotEnvelope): Map<String, TcBusValue> {
		val snapshot = envelope.snapshot
		val values = mutableMapOf<String, TcBusValue>()

		// The specification derives this row's number from "the vendor list",
		// which the envelope keeps once `/init` serves one. No list yet means
		// no policy version claimed, not `0`.
		envelope.gvl?.let { gvl ->
			values[TcStorageBusKeys.POLICY_VERSION] = TcBusValue.NumberValue(gvl.tcfPolicyVersion.toInt())
		}

		// Mirror of the web build: `gdprApplies` is the matched policy rule's
		// model tested against `iab` (`packages/iab/src/index.ts`). Only a
		// resolved policy answers the question, and an unreadable or absent one
		// keeps the key absent -- the reader's "undetermined" is exactly where
		// this build refuses to guess.
		//
		// The answer in this build is always `0`, by two given facts rather
		// than a constant: the strict policy reader refuses a wire whose model
		// is `iab` (`StrictPolicyReader`, which this phase "cannot represent"),
		// so no envelope this build writes can carry that model, and
		// `com.c15t.core.model.ConsentModel` has no entry to name it. The lane
		// that makes the `iab` model representable has to flip this projection
		// too; `TcStorageBusTest` pins the wiring so flipping only moves the
		// value, not the plumbing.
		if (!snapshot.policyPending && snapshot.resolution.status == PolicyResolution.STATUS_MATCHED) {
			values[TcStorageBusKeys.GDPR_APPLIES] = TcBusValue.NumberValue(0)
		}

		return values
	}
}

/**
 * Where the bus lands.
 *
 * A device conformance writes the *application-default* shared-preferences
 * file, because that is the file the specification's vendor readers open: the
 * implementation body must go through
 * `android.preference.PreferenceManager.getDefaultSharedPreferences(context)`
 * -- the deprecated platform API, still the one the specification names and
 * still the one vendors call -- and must never derive the file's name. Numeric
 * rows go in with `putInt`, text rows with `putString`, and every key in
 * [TcStorageBusKeys.ALL_NAMES] that the [write] map omits (or any map at all
 * during [clear]) leaves the file for that key, via `remove` inside one
 * `edit()` transaction. Keys outside the table belong to other ecosystems and
 * stay untouched.
 *
 * `c15t-core` is pure JVM and never opens a preferences handle, so the
 * conforming implementation lives with the host that holds a `Context`
 * (`c15t-android`'s store composition); this module owns the table, the
 * values, and the moments they move.
 *
 * The bus is never read back: a device that lost it still answers from the
 * encrypted store, and the next commit -- or
 * [C15tStore.rebuildTcStorageBus] -- restores the mirror. Implementations must
 * not throw into the consent commit: the bus is a projection, and a lost
 * mirror rebuilds while the record stands.
 *
 * Writes arrive serially: the store issues them from its write, clear and
 * rebuild paths and never overlaps them. [clear] wiping the whole table,
 * including keys this build never wrote, is on purpose -- the specification
 * puts the cleanup of vestigial bus values on the publisher who removed a CMP,
 * `reset()` inherits that duty for our keys, and one app hosting one CMP means
 * a whole-table wipe removes a prior CMP's stale rows a vendor would otherwise
 * keep acting on.
 */
public interface TcStorageBusSink {
	/** Publish the whole desired bus, replacing what was there; the map is the
	 * complete table view, so keys it omits must stop holding a value. */
	public fun write(values: Map<String, TcBusValue>)

	/** Empty the bus: every key in [TcStorageBusKeys.ALL_NAMES] stops holding a
	 * value, and only those keys. */
	public fun clear()
}
