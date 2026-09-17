import C15tCore
import Foundation

/// The JSON the iOS bridge speaks, with no React Native types anywhere in it.
///
/// Field names come from `src/protocol` on the JavaScript side, which owns the wire
/// format. Keeping the encoders and decoders free of `React` imports is what lets
/// the whole boundary compile and be tested without Pods, and it keeps one encoding
/// shared by the module and its tests instead of two that can disagree with each
/// other. It is also the iOS twin of `C15tPayload.kt`: same fields, same reasons,
/// same fail-closed rules, so a JavaScript package cannot tell which core answered.
public enum C15tPayload {
    /// Protocol this native build speaks.
    public static let protocolVersion = C15tSDK.protocolVersion

    /// Oldest protocol this native build accepts from a JavaScript package.
    public static let minSupportedProtocolVersion = 1

    /// Newest protocol this native build accepts from a JavaScript package.
    public static let maxSupportedProtocolVersion = C15tSDK.protocolVersion

    /// Language used when neither the app nor the backend resolved one.
    public static let defaultLanguage = "en"

    /// Reported for an intent this build cannot read.
    public static let reasonInvalidIntent = "invalid-intent"

    /// Reported when the core was never installed, so nothing can be recorded.
    public static let reasonNotBootstrapped = "not-bootstrapped"

    /// Event names, matching `NATIVE_EVENT_NAMES` in `src/protocol`.
    public static let eventSnapshot = "snapshot"
    public static let eventError = "error"
    public static let eventInitialized = "initialized"

    /// Keys the protocol declares as `T | null` rather than optional, so an absent
    /// key would read back as `undefined` where the TypeScript says `null`.
    private static let topLevelNullKeys: [String] = [
        "explicitChoice",
        "consentCategories",
        "policySnapshotToken",
        "subject",
        "location",
        "translations",
        "nextDeadline",
        "error",
    ]

    private static let overridesNullKeys = ["country", "region", "gpc"]
    private static let resolutionNullKeys = ["policyId", "fingerprint"]

    /// The keys `NativeOverridesInput` declares. A document that names none of them is
    /// not an override set, and applying it would wipe a language the app relies on.
    private static let overrideInputKeys: Set<String> = ["country", "region", "language", "gpc"]

    /// Field names a host app may still send that this build does not model.
    ///
    /// `native/CONTRACT.md` first described a `test` override and an `msa` privacy
    /// signal. Neither exists in the kernel: publisher test mode is a client option
    /// that never reaches a save body, and v3 has no `msa` signal. ``ConsentOverrides``
    /// has no property for either, so accepting such a document would drop what the
    /// caller asked for and leave the app believing a mode was on that nothing turned
    /// on. ``RetiredEnvelope`` refuses the same names in a stored envelope; this
    /// refuses them on the way in, and says which one.
    private static let retiredOverrideNames = ["test", "msa"]

    /// Retired keys that must never reach the wire.
    ///
    /// The core cannot produce these, and a stored envelope carrying them is refused
    /// before a snapshot exists. This is the last gate in front of JavaScript, kept
    /// because a retired name on the wire would read back as a real field.
    private static let retiredWireKeys: Set<String> = ["test", "msa"]

    private static let maxEchoCharacters = 200

    /// The `BootstrapPayload` handshake, read once per provider mount.
    ///
    /// - Parameters:
    ///   - snapshot: The snapshot the core already holds, which carries the subject id.
    ///   - hasStoredSnapshot: Whether hydration found a stored envelope.
    ///   - sdkVersion: Native SDK version, the same value sent as `x-c15t-version`.
    public static func bootstrap(
        snapshot: ConsentSnapshot,
        hasStoredSnapshot: Bool,
        sdkVersion: String = C15tSDK.version
    ) -> String {
        encode([
            "protocolVersion": .integer(Int64(protocolVersion)),
            "minSupportedProtocolVersion": .integer(Int64(minSupportedProtocolVersion)),
            "maxSupportedProtocolVersion": .integer(Int64(maxSupportedProtocolVersion)),
            "nativeSdkVersion": .string(sdkVersion),
            "subjectId": stringOrNull(snapshot.subject?.id),
            "hasStoredSnapshot": .bool(hasStoredSnapshot),
        ])
    }

    /// The `ConsentSnapshot` wire form.
    ///
    /// The core's own `Codable` conformance produces the body, so the wire and the
    /// stored envelope cannot drift apart. Two conformations then happen here, both
    /// because the protocol declares keys the core's encoder omits: nullable fields
    /// are re-inserted as explicit `null`, and `overrides.language` never goes out
    /// empty, since translations resolve to exactly one bundle.
    ///
    /// `privacySignals.gpc` goes out untouched as the `detected` / `override` /
    /// `active` triple the core computes. It is what makes a GPC denial explainable
    /// from the payload alone: `active` is what the evaluator honored, and `override`
    /// says whether the app or the device caused it.
    public static func snapshot(
        _ snapshot: ConsentSnapshot,
        fallbackLanguage: String = defaultLanguage
    ) -> String {
        guard var wire = value(of: snapshot) else {
            // Encoding the core's own snapshot cannot fail in practice, and a silent
            // empty string would be read as an unparseable payload by JavaScript,
            // which is the fail-closed path. Say so rather than guess a snapshot.
            return "{}"
        }
        guard case var .object(fields) = wire else { return "{}" }

        for key in topLevelNullKeys where fields[key] == nil {
            fields[key] = .null
        }

        if case let .object(overrides)? = fields["overrides"] {
            var patched = overrides.filter { !retiredWireKeys.contains($0.key) }
            for key in overridesNullKeys where patched[key] == nil {
                patched[key] = .null
            }
            let language = patched["language"]?.stringValue ?? ""
            patched["language"] = .string(
                language.isEmpty ? fallbackLanguage : language
            )
            fields["overrides"] = .object(patched)
        }

        if case let .object(resolution)? = fields["resolution"] {
            var patched = resolution
            for key in resolutionNullKeys where patched[key] == nil {
                patched[key] = .null
            }
            fields["resolution"] = .object(patched)
        }

        wire = .object(fields)
        return encodeValue(wire) ?? "{}"
    }

    /// The `CommitResult` for `result`.
    ///
    /// `confirmed` is a list of category names on the wire, so the core's map becomes
    /// its keys: a recorded denial is a receipt in the same way an acceptance is, and
    /// JavaScript reads only the names.
    ///
    /// `queued` is `true` for any committed action because the core persists the
    /// payload before it returns and delivers afterwards. That matches Kotlin, which
    /// reports `queued = true, delivered = false` for the same commit.
    public static func commitResult(
        _ result: CommitResult,
        snapshot: ConsentSnapshot
    ) -> String {
        let rejected = result.status == .rejected
        var fields: [String: JSONValue] = [
            "ok": .bool(!rejected),
            "revision": rejected ? .null : .integer(Int64(result.revision)),
            "confirmed": .array(result.confirmed.keys.sorted(by: { $0.rawValue < $1.rawValue })
                .map { .string($0.rawValue) }),
            "subjectId": stringOrNull(snapshot.subject?.id),
            "queued": .bool(!rejected && result.status == .committed),
            "delivered": .bool(false),
            "status": .string(result.status.rawValue),
        ]
        if let error = result.error {
            fields["reason"] = .string(error.code)
        }
        return encode(fields)
    }

    /// The failure shape for an intent that could not be read.
    public static func invalidIntent(raw: String?) -> String {
        encode([
            "ok": .bool(false),
            "revision": .null,
            "confirmed": .array([]),
            "subjectId": .null,
            "queued": .bool(false),
            "reason": .string(reasonInvalidIntent),
            "detail": .string(String((raw ?? "").prefix(maxEchoCharacters))),
        ])
    }

    /// The failure shape for a core that was never installed.
    public static func notBootstrapped() -> String {
        encode([
            "ok": .bool(false),
            "revision": .null,
            "confirmed": .array([]),
            "subjectId": .null,
            "queued": .bool(false),
            "reason": .string(reasonNotBootstrapped),
        ])
    }

    /// The `TrackingAuthorizationPayload` both tracking calls resolve with.
    ///
    /// One field, because the arm is the whole answer. There is no consent field here and
    /// there never will be: the payload describes what the platform said, and a host that
    /// wants to know whether it may track has to ask c15t as well.
    public static func trackingAuthorization(
        _ status: C15tTrackingAuthorization
    ) -> String {
        encode(["status": .string(status.rawValue)])
    }

    /// A `snapshot` event: the new revision and the dirty flag, nothing else.
    public static func snapshotEvent(revision: Int) -> String {
        encode([
            "revision": .integer(Int64(revision)),
            "dirty": .bool(true),
        ])
    }

    /// An `initialized` event, emitted once when the first policy resolves.
    public static func initializedEvent(revision: Int) -> String {
        encode([
            "revision": .integer(Int64(revision)),
            "dirty": .bool(true),
            "ready": .bool(true),
            "policyPending": .bool(false),
        ])
    }

    /// An `error` event, in the `NativeSnapshotError` shape.
    public static func errorEvent(code: String, message: String) -> String {
        encode([
            "code": .string(code),
            "message": .string(message),
        ])
    }

    /// Read a `CommitIntent`.
    ///
    /// Anything unreadable, or outside the three actions, returns `nil` and the caller
    /// answers `invalid-intent`. A commit is evidence, so a malformed one is refused
    /// rather than rounded to the nearest action.
    public static func parseCommitIntent(_ raw: String?) -> CommitIntent? {
        guard let body = parseObject(raw) else { return nil }
        switch body["action"]?.stringValue {
        case "all":
            return .all
        case "necessary":
            return .necessary
        case "explicit":
            guard let consents = body["consents"]?.objectValue else { return nil }
            var parsed: [OptionalConsentCategory: Bool] = [:]
            for (name, value) in consents {
                guard let category = OptionalConsentCategory(rawValue: name),
                      let granted = value.boolValue
                else {
                    // `necessary` is nobody's choice, and an unknown category is not
                    // one this build should invent a permission for.
                    return nil
                }
                parsed[category] = granted
            }
            return .custom(parsed)
        default:
            return nil
        }
    }

    /// Read a `NativeOverridesInput` into a complete override record.
    ///
    /// JavaScript distinguishes an omitted field from an explicit null: omitted keeps
    /// the current value, null clears it. ``ConsentOverrides`` cannot express the
    /// difference, so the merge happens here and the caller applies the result as a
    /// replacement.
    ///
    /// Two documents are refused rather than approximated. One that names no override
    /// at all is not an override document. One that names a retired field is a host
    /// still on the old protocol, and guessing past it would leave that app believing
    /// an override is in force when nothing applied it.
    ///
    /// - Parameters:
    ///   - raw: The JSON document from `setOverrides`.
    ///   - current: The overrides in effect, normally from the live snapshot.
    /// - Returns: The record to apply, or the failure naming what the host has to
    ///   change. Both carry the code JavaScript sees in the rejection.
    public static func parseOverrides(
        _ raw: String?,
        current: ConsentOverrides
    ) -> Result<ConsentOverrides, C15tBridgeError> {
        guard let body = parseObject(raw) else { return .failure(.unreadableOverrides) }

        let retired = retiredOverrideNames.filter { body.keys.contains($0) }
        if !retired.isEmpty { return .failure(.retiredOverrides(retired)) }
        guard body.keys.contains(where: { overrideInputKeys.contains($0) }) else {
            return .failure(.unreadableOverrides)
        }

        // A key that is absent keeps what is in force. A key that is present but not
        // a usable string, including an explicit null, clears it. `language` is the
        // exception on both counts: the protocol never allows an empty language, so
        // it can only be replaced by another non-empty string.
        var country = current.country
        var region = current.region
        var language = current.language
        var gpc = current.gpc

        if let value = body["country"] { country = value.stringValue }
        if let value = body["region"] { region = value.stringValue }
        if let value = body["language"], let parsed = value.stringValue, !parsed.isEmpty {
            language = parsed
        }
        if let value = body["gpc"] {
            if case .null = value {
                gpc = nil
            } else if let parsed = value.boolValue {
                gpc = parsed
            } else {
                // The signal decides whether a standing directive applies, so a value
                // this build cannot read is refused rather than turned into either
                // answer.
                return .failure(.unreadableGpcOverride)
            }
        }

        return .success(
            ConsentOverrides(
                country: country,
                region: region,
                language: language,
                gpc: gpc
            )
        )
    }

    // MARK: - JSON plumbing

    private static func encode(_ fields: [String: JSONValue]) -> String {
        encodeValue(.object(fields)) ?? "{}"
    }

    private static func encodeValue(_ value: JSONValue) -> String? {
        // Sorted keys, so the same state always produces the same text and a test can
        // assert on the payload instead of on a dictionary's mood.
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(value) else { return nil }
        return String(decoding: data, as: UTF8.self)
    }

    private static func value<T: Encodable>(of value: T) -> JSONValue? {
        let decoder = JSONDecoder()
        guard let data = try? JSONEncoder().encode(value) else { return nil }
        return try? decoder.decode(JSONValue.self, from: data)
    }

    private static func parseObject(_ raw: String?) -> [String: JSONValue]? {
        guard let raw, !raw.isEmpty, let data = raw.data(using: .utf8) else { return nil }
        let decoder = JSONDecoder()
        guard case let .object(fields)? = try? decoder.decode(JSONValue.self, from: data) else {
            return nil
        }
        return fields
    }

    private static func stringOrNull(_ value: String?) -> JSONValue {
        value.map { JSONValue.string($0) } ?? .null
    }
}
