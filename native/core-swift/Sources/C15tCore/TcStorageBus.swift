import Foundation

// The `IABTCF_*` storage bus.
//
// This is an egress projection, not a store. The authoritative state is the
// envelope under `StorageKey.snapshot` -- the Keychain on iOS -- and nothing in
// the core trusts a value that reached the bus. What this file owns is the
// mirror the ad-tech ecosystem reads: the IAB CMP API specification ("What is
// the CMP in-app internal structure for the defined API?") says a CMP "shall"
// keep pre-parsed TC data and the TC String in `NSUserDefaults`, and vendor
// SDKs read exactly those keys with the platform's standard reads.
//
// The keys this build writes are only the ones whose source value the core
// already owns: the policy version off the stored vendor list, and
// `gdprApplies` off the resolved policy. The remaining rows keep their exact
// names here because clearing and rebuilding the bus must address the whole
// table, and they stay absent until the state they project exists -- see the
// gaps listed next to each reserved key and the report in the PR that added
// this file.
//
// Keys outside the specification table (`IABTCF_AddtlConsent`,
// `IABTCF_UseNonStandardStacks`, `IABUSPrivacy_String`,
// `IABTCF_EnableAdvertiserConsentMode`) belong to other layers or to no
// specification at all; the bus never writes and never removes them.
// `docs/internal/tcf-mobile.md` sections 1.2 and 1.4 hold the evidence.

/// The store type the specification gives a bus key.
///
/// The distinction is load bearing, not decorative: vendors read the `Number`
/// rows with the integer accessor and the `String` rows with the string
/// accessor, and an entry written under the wrong type does not read across.
public enum TcBusValue: Sendable, Equatable {
    /// "Number" in the spec table: a small unsigned int, written natively.
    case number(Int)
    /// "String" in the spec table, written as a plain string.
    case text(String)
}

/// The key table, one constant per row of the spec's in-app structure.
///
/// A constant exists for every row's name even where this build writes nothing,
/// so a wipe addresses the whole table and a key that stops carrying a value in
/// a later version still gets removed from a device that saw it.
public enum TcStorageBusKeys {
    /// Spec "Number", unsigned int. Reserved: the core owns no CMP ID -- the
    /// ID comes from IAB Europe registration or `/init`, and neither lands in
    /// this build's state.
    public static let cmpSdkID = "IABTCF_CmpSdkID"
    /// Spec "Number". Reserved: the core owns no CMP version number; the
    /// transport's SDK-version string is a different thing.
    public static let cmpSdkVersion = "IABTCF_CmpSdkVersion"
    /// Spec "Number". Written: the stored vendor list's `tcfPolicyVersion`.
    public static let policyVersion = "IABTCF_PolicyVersion"
    /// Spec "Number": 1 applies, 0 does not, absent is undetermined. Written
    /// from the resolved policy's model, mirroring `packages/iab/src/index.ts`.
    public static let gdprApplies = "IABTCF_gdprApplies"
    /// Spec "String", default `AA`. Reserved: the publisher country is a
    /// publisher setting (web reads it off the CMP options, not off a visitor's
    /// geo), and the native config carries none. Absence already reads `AA`.
    public static let publisherCC = "IABTCF_PublisherCC"
    /// Spec "Number", default 0. Reserved: the core carries no purpose-one
    /// treatment decision; c15t web sets none either.
    public static let purposeOneTreatment = "IABTCF_PurposeOneTreatment"
    /// Spec "Number". Reserved: the core carries no customised-stack-text flag.
    public static let useNonStandardTexts = "IABTCF_UseNonStandardTexts"
    /// Spec "String", the encoded TC String. Reserved: encoding it needs the
    /// CMP IDs and the purpose and vendor vectors, none of which the consent
    /// state carries yet. Blocks the vector rows below.
    public static let tcString = "IABTCF_TCString"
    /// Spec binary string, index `n` is vendor `n + 1`. Reserved: the core
    /// stores category grants; the category-to-purpose mapping lives in
    /// `packages/iab` and in no native state.
    public static let vendorConsents = "IABTCF_VendorConsents"
    /// Spec binary string. Reserved, same blocker as ``vendorConsents``.
    public static let vendorLegitimateInterests = "IABTCF_VendorLegitimateInterests"
    /// Spec binary string, the vendors disclosed to this device under TCF v2.3.
    /// Reserved, same blocker as ``vendorConsents``.
    public static let disclosedVendors = "IABTCF_DisclosedVendors"
    /// Spec binary string, index `n` is purpose `n + 1`. Reserved, same
    /// blocker as ``vendorConsents``.
    public static let purposeConsents = "IABTCF_PurposeConsents"
    /// Spec binary string. Reserved, same blocker as ``vendorConsents``.
    public static let purposeLegitimateInterests = "IABTCF_PurposeLegitimateInterests"
    /// Spec binary string. Reserved, same blocker as ``vendorConsents``.
    public static let specialFeaturesOptIns = "IABTCF_SpecialFeaturesOptIns"
    /// Spec three-state string per purpose; `{ID}` names the purpose and a
    /// writer appends it to this prefix. Reserved: c15t collects publisher
    /// restrictions on no platform -- `TcStringEncoder`'s header says the same
    /// of the string's restriction entries.
    public static let publisherRestrictions = "IABTCF_PublisherRestrictions"
    /// Spec binary string, the publisher's own purpose consents. Reserved:
    /// the core owns no publisher-section purpose state.
    public static let publisherConsent = "IABTCF_PublisherConsent"
    /// Spec binary string. Reserved, same blocker as ``publisherConsent``.
    public static let publisherLegitimateInterests = "IABTCF_PublisherLegitimateInterests"
    /// Spec binary string, custom purposes. Reserved, same blocker as
    /// ``publisherConsent``.
    public static let publisherCustomPurposesConsents =
        "IABTCF_PublisherCustomPurposesConsents"
    /// Spec binary string. Reserved, same blocker as ``publisherConsent``.
    public static let publisherCustomPurposesLegitimateInterests =
        "IABTCF_PublisherCustomPurposesLegitimateInterests"

    /// Every named row: the keys a wipe addresses.
    ///
    /// Out-of-table names are deliberately missing (see the file header): a
    /// bus clear reaches the specification's keys and nothing a Google, GPP or
    /// USP layer of somebody else's might own instead.
    public static let allNames: [String] = [
        cmpSdkID,
        cmpSdkVersion,
        policyVersion,
        gdprApplies,
        publisherCC,
        purposeOneTreatment,
        useNonStandardTexts,
        tcString,
        vendorConsents,
        vendorLegitimateInterests,
        disclosedVendors,
        purposeConsents,
        purposeLegitimateInterests,
        specialFeaturesOptIns,
        publisherRestrictions,
        publisherConsent,
        publisherLegitimateInterests,
        publisherCustomPurposesConsents,
        publisherCustomPurposesLegitimateInterests,
    ]
}

/// Deriving the bus keys from a stored envelope.
///
/// The input is the envelope and nothing else, in both directions that matters:
/// every value here can be recomputed from the bytes the authoritative store
/// holds -- so a wiped bus can be rebuilt -- and no value here may add anything
/// the envelope does not already say. A row whose source field the core does
/// not own produces no entry at all, which is the spec's answer for a key no
/// CMP has set (`AA`, `0`, undetermined) and is strictly better than writing a
/// guessed one.
enum TcStorageBus {
    /// The full desired contents of the bus for `envelope`.
    ///
    /// Keys absent from the result are keys the bus must not hold, so a write
    /// of this map is a whole-table replace, not a patch.
    ///
    /// - Parameter envelope: the envelope as this build encodes it, before or
    ///   after landing in the store.
    /// - Returns: the values for every row this build can honestly fill.
    static func values(for envelope: StoredEnvelope) -> [String: TcBusValue] {
        var values: [String: TcBusValue] = [:]
        let snapshot = envelope.snapshot

        // The spec derives this row's number from "the vendor list", which the
        // core stores under `iab.gvl` once `/init` serves one. No list yet
        // means no policy version claimed, not `0`.
        if let gvl = snapshot.iab?.gvl {
            values[TcStorageBusKeys.policyVersion] = .number(gvl.tcfPolicyVersion)
        }

        // Mirror of the web build: `gdprApplies` is the matched policy rule's
        // model tested against `iab` (`packages/iab/src/index.ts`). Only a
        // resolved policy answers the question, and an unreadable or absent
        // one keeps the key absent -- the spec leaves the reader in
        // "undetermined" exactly where this build refuses to guess.
        //
        // Which model matched is the whole question, and the snapshot cannot
        // answer it: a device running an IAB rule *reports* `opt-in`
        // (`ConsentModel.runtimeModel`) because it has no TC String to back the
        // other name, so reading `snapshot.model` here would say `0` for exactly
        // the one rule that means `1`. The envelope is the durable copy of the
        // rule itself, so the answer comes from its wire, read through the same
        // strict reader that accepted it -- nothing new is stored, and a bus
        // rebuilt from stored bytes asks the question the commit asked.
        //
        // `0` stays the answer for `opt-in`, `opt-out` and `none`, and for a wire
        // this reader will not name: `packages/iab` puts `false` beside every
        // model but `iab`, so this row moves for one rule and one rule only.
        let resolved = !snapshot.policyPending
            && snapshot.resolution.status == .matched
        if resolved {
            let applies = storedRuleIsIAB(envelope)
            values[TcStorageBusKeys.gdprApplies] = .number(applies ? 1 : 0)
        }

        return values
    }

    /// Whether the rule `envelope` was derived from governs IAB.
    private static func storedRuleIsIAB(_ envelope: StoredEnvelope) -> Bool {
        guard case let .resolved(resolved) = PolicyWireReader.read(envelope.policyResolution) else {
            return false
        }
        return resolved.policy.model == .iab
    }
}

/// Where the bus lands.
///
/// A device conformance writes the *standard* store for the platform, because
/// that is the store the specification's vendor readers open; on iOS that is
/// ``UserDefaultsStorageBus``. The bus is an egress projection of committed
/// state, so the core calls it in the same step as the authoritative write and
/// twice more where that write goes away: ``ConsentCore/reset()`` and any path
/// that discards a stored envelope. It is never read back: a device that lost
/// its bus still answers from the Keychain, and the next commit -- or
/// ``ConsentCore/rebuildTcStorageBus()`` -- restores the mirror.
///
/// Writes arrive serially: the core issues them from its publish, reset,
/// hydration and rebuild paths and never overlaps them.
public protocol TcStorageBusWriting: Sendable {
    /// Publish the whole desired bus, replacing what was there.
    ///
    /// `values` is the complete table view, so every spec key missing from it
    /// must stop holding a value: this is where a key whose source field an
    /// envelope no longer carries stops lying to a vendor.
    ///
    /// Implementations must not throw the host's consent commit: the bus is a
    /// projection, and a lost mirror rebuilds while the record stands.
    func write(_ values: [String: TcBusValue])

    /// Empty the bus: every key in ``TcStorageBusKeys/allNames`` stops holding
    /// a value, and only those keys.
    ///
    /// Touching the whole table, including keys this build never wrote, is on
    /// purpose. The specification puts the cleanup of vestigial bus values on
    /// the publisher who removed a CMP, `reset()` inherits that duty for our
    /// keys, and one app hosting one CMP means a whole-table wipe removes a
    /// prior CMP's stale rows a vendor would otherwise keep acting on. Keys
    /// outside the table belong to other ecosystems and stay untouched.
    func clear()
}

// MARK: - NSUserDefaults

/// The bus over standard `NSUserDefaults`.
///
/// Standard defaults -- not a suite. The specification names `NSUserDefaults`
/// and never an app group or suite name, and an ad SDK linked into the host
/// binary reads the host's own standard domain from inside its process, so
/// `UserDefaults.standard` is the shared place. A suite would hide the bus from
/// every reader the table exists for.
///
/// The store types follow the spec table: `Number` keys are written as native
/// integers and `String` keys as strings, because those are the accessors
/// vendor SDKs use and a mistyped entry does not read across.
///
/// Disclosure, both of them real and both priced by the research doc: the
/// defaults database is plain text on disk, which is what Apple's guidance
/// warns against for sensitive data -- acceptable here only because the
/// authoritative record stays in the Keychain and these keys stay a signal,
/// never the record. And the defaults database is included in device backups,
/// which the Android primary store deliberately is not, so a restored device
/// can hold the mirror without the record: a core with no stored envelope
/// still comes up not-ready and deny-all, and trusts the bus as proof of
/// nothing.
public final class UserDefaultsStorageBus: TcStorageBusWriting, @unchecked Sendable {
    private let defaults: UserDefaults

    /// - Parameter defaults: the defaults to mirror into. `nil` -- the default
    ///   -- writes standard `NSUserDefaults`, which is what a device wants;
    ///   tests pass an instance over their own suite so the run leaves no keys
    ///   in the app domain.
    public init(defaults: UserDefaults? = nil) {
        self.defaults = defaults ?? .standard
    }

    public func write(_ values: [String: TcBusValue]) {
        for name in TcStorageBusKeys.allNames {
            switch values[name] {
            case .number(let value):
                defaults.set(value, forKey: name)
            case .text(let value):
                defaults.set(value, forKey: name)
            case nil:
                // Absent from the projection means absent from the bus, and
                // `removeObject` on a key that was never written is a no-op.
                defaults.removeObject(forKey: name)
            }
        }
    }

    public func clear() {
        write([:])
    }
}
