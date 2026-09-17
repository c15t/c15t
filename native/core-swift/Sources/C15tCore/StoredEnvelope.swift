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
        return envelope
    }
}
