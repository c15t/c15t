import Foundation

/// What one protected item holds.
///
/// The envelope stores the last known snapshot *and* the policy wire it was
/// derived from. Storing only the snapshot would freeze a decision made at an
/// earlier clock: a choice that has since expired would still read as a grant on
/// the next launch. Keeping the wire lets hydration re-run the evaluator against
/// the current time, which is the only way "cached, but not stale" is true.
struct StoredEnvelope: Sendable, Codable, Equatable {
    /// Envelope format version. Bump it when the shape changes; an envelope from a
    /// newer build is unreadable here and therefore ignored, which denies rather
    /// than mis-reads.
    static let currentVersion = 1

    let version: Int
    /// Epoch milliseconds of the write, for diagnostics and for the
    /// newest-writer-wins check when persisting.
    let storedAt: Int64
    /// The snapshot as last derived, kept so a cold start answers `snapshot()` on
    /// the first synchronous call with no network and no re-derivation.
    let snapshot: ConsentSnapshot
    /// Notice dismissal is a record, not a permission, so it is stored beside the
    /// snapshot rather than folded into it.
    let noticeDismissal: NoticeDismissal?
    /// The raw `policyResolution` value last served, kept so the evaluator can
    /// judge stored receipts against the same fingerprints it saw originally.
    let policyResolution: JSONValue?

    init(
        snapshot: ConsentSnapshot,
        noticeDismissal: NoticeDismissal?,
        policyResolution: JSONValue?,
        storedAt: Int64
    ) {
        self.version = Self.currentVersion
        self.storedAt = storedAt
        self.snapshot = snapshot
        self.noticeDismissal = noticeDismissal
        self.policyResolution = policyResolution
    }

    /// Decode, refusing an envelope this build cannot fully honour. `nil` sends the
    /// core down the same path as "nothing stored", which is deny-all plus a fresh
    /// policy fetch.
    static func decode(_ data: Data) -> StoredEnvelope? {
        guard let envelope = try? C15tJSON.decode(StoredEnvelope.self, from: data) else {
            return nil
        }
        guard envelope.version == currentVersion else { return nil }
        guard carriesNothingUnknown(data, encodedAs: envelope) else { return nil }
        return envelope
    }

    /// Whether the bytes hold only fields the typed envelope can give back.
    ///
    /// A synthesized decoder ignores a key it does not model, and that is the one way
    /// an envelope gets read partly. Something stores a field this build has never
    /// seen; the core restores every other field and answers as though nothing were
    /// wrong; the next publish rewrites the envelope without the field it dropped. On
    /// a device that means the newest thing the subject decided can disappear while
    /// every number on the snapshot still looks healthy.
    ///
    /// Encoding what was decoded is the check that needs no list of names to keep
    /// current: every key path in the input has to come back out of the typed value,
    /// and a path that does not is a name this build does not have. Refusing the whole
    /// envelope is then the same decision the retired fields already make, and
    /// `native/CONTRACT.md` says why guessing is the wrong half.
    ///
    /// Arrays contribute one path rather than a path per index, so a difference in
    /// length cannot report itself as an unknown field.
    private static func carriesNothingUnknown(
        _ data: Data,
        encodedAs envelope: StoredEnvelope
    ) -> Bool {
        guard let stored = C15tJSON.parse(data),
              let roundTripped = C15tJSON.parse((try? C15tJSON.encode(envelope)) ?? Data())
        else { return false }
        var known = Set<String>()
        collectKeyPaths(of: roundTripped, at: "", into: &known)
        var requested = Set<String>()
        collectKeyPaths(of: stored, at: "", into: &requested)
        return known.isSuperset(of: requested)
    }

    private static func collectKeyPaths(
        of value: JSONValue,
        at path: String,
        into paths: inout Set<String>
    ) {
        switch value {
        case .null, .bool, .integer, .number, .string:
            return
        case let .array(items):
            for item in items {
                collectKeyPaths(of: item, at: "\(path)[]", into: &paths)
            }
        case let .object(fields):
            for (key, item) in fields {
                let keyPath = path.isEmpty ? key : "\(path).\(key)"
                // A key holding null carries nothing that could be lost, so it is not a
                // name this build lacks. The TypeScript kernel and the Kotlin core spell an
                // absent optional as an explicit null where Swift omits the key, and reading
                // that as unknown refuses the whole envelope: a stored choice becomes
                // nothing stored, on every launch, with nothing on the snapshot to say why.
                if case .null = item { continue }
                paths.insert(keyPath)
                collectKeyPaths(of: item, at: keyPath, into: &paths)
            }
        }
    }
}
