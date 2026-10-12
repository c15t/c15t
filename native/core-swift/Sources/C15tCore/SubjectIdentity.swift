import Foundation

/// A failure to establish a subject id.
public enum SubjectIdentityError: Error, Equatable, Sendable {
    /// The value is in no format this type writes, so the producer will not accept it
    /// and this build cannot use it as an identity.
    case malformed(String)
}

/// A stored subject id the producer refuses.
///
/// Kept as its own value rather than folded into a boolean because the reason is what a
/// host has to say out loud: an install written by a build that minted the legacy UUID
/// shape is a different explanation to a user than a store someone tampered with.
struct UnusableSubjectId: Sendable, Equatable {
    /// The stored value, verbatim. It is echoed in diagnostics and never adopted.
    let id: String
    /// Whether `id` is the lowercase UUID v4 shape this SDK minted before ``SubjectId``
    /// existed. That shape is the prerelease population `native/CONTRACT.md` names;
    /// anything else is not a format this SDK ever wrote.
    let legacyShape: Bool
}

/// The outcome of reading the stored subject identity.
///
/// The identity and the unusable id travel together because the caller has two separate
/// decisions to make: which identity to answer with, and whether the records written
/// under the old one still count. They do not, and only `unusable` says so.
struct SubjectIdentityRead: Sendable, Equatable {
    /// The identity the core adopts: the stored one, or a freshly minted one.
    let identity: SubjectIdentity
    /// Set when a stored id was dropped rather than adopted. The caller must then treat
    /// the stored envelope as absent too, because a decision attributed to an id nobody
    /// can query is not evidence.
    let unusable: UnusableSubjectId?
}

/// The c15t subject identifier.
///
/// A `sub_` id minted by ``SubjectId``, owned by c15t, stored in the same protected
/// storage as the consent records. It is never derived from IDFV, ADID, or any other
/// persistent hardware identifier, and it is never read from one: the whole point of a
/// generated id is that a subject who clears storage starts fresh, which is what the
/// web SDK does when its storage is cleared.
public struct SubjectIdentity: Sendable, Codable, Equatable, Hashable {
    /// The id as it goes on the wire: `sub_<base58>`, and nothing else.
    public let id: String

    /// Generate a new subject id.
    public static func generate() -> SubjectIdentity {
        // Minted through ``SubjectId`` rather than minted here, because the format is
        // the one the backend validates and the web SDK produces the same id from the
        // same clock and entropy. A UUID here is rejected by `POST /subjects`.
        SubjectIdentity(unchecked: SubjectId.generate())
    }

    /// Adopt a stored id, rejecting anything the producer would refuse.
    public init(id: String) throws {
        guard SubjectIdentity.isValid(id) else {
            throw SubjectIdentityError.malformed(id)
        }
        self.id = id
    }

    private init(unchecked id: String) {
        self.id = id
    }

    /// Read the subject id, generating and persisting one when nothing usable is stored.
    ///
    /// The read is the other half of the format rule. `native/CONTRACT.md` says an id the
    /// producer will not accept is an identity this build cannot use, and says what such
    /// an identity is worth: nothing, indistinguishable from a fresh launch. So a stored
    /// id that fails the producer's pattern is dropped and reported in
    /// ``SubjectIdentityRead/unusable``, which is how the caller learns that the records
    /// keyed to it have to go with it.
    ///
    /// Re-minting underneath a decision that survived is the rejected alternative: it
    /// splits one subject across two ids and leaves the old records attributed to an id
    /// no query returns. Minting here would do exactly that if the caller kept the
    /// envelope, which is why the dropped id is part of the answer rather than a log line.
    static func loadOrCreate(
        from store: any ConsentStore,
        key: String = StorageKey.subject
    ) -> SubjectIdentityRead {
        guard let stored = store.decode(StoredSubject.self, for: key) else {
            return SubjectIdentityRead(identity: mint(into: store, key: key), unusable: nil)
        }
        guard SubjectIdentity.isValid(stored.id) else {
            return SubjectIdentityRead(
                identity: mint(into: store, key: key),
                unusable: UnusableSubjectId(
                    id: stored.id,
                    legacyShape: SubjectIdentity.isLegacyUUIDv4(stored.id)
                )
            )
        }
        return SubjectIdentityRead(identity: SubjectIdentity(unchecked: stored.id), unusable: nil)
    }

    /// Mint and persist the id a launch with no usable identity answers with.
    private static func mint(
        into store: any ConsentStore,
        key: String
    ) -> SubjectIdentity {
        let identity = SubjectIdentity.generate()
        store.encode(StoredSubject(id: identity.id), for: key)
        return identity
    }

    /// Wire form carried on the snapshot.
    func snapshot(externalId: String?) -> SubjectSnapshot {
        SubjectSnapshot(id: id, externalId: externalId)
    }

    /// Whether `candidate` is an identity this build can use: the `sub_` format the
    /// producer validates and nothing else.
    ///
    /// This is the adoption rule, so it stays equal to the backend's pattern. The legacy
    /// UUID shape is deliberately absent: recognising it is ``isLegacyUUIDv4(_:)``, and
    /// recognising it never means adopting it.
    static func isValid(_ candidate: String) -> Bool {
        SubjectId.isValid(candidate)
    }

    /// Whether `candidate` is the shape of the ids this type minted before ``SubjectId``
    /// existed, which is a diagnosis and not an adoption.
    ///
    /// IDFV and ADID are also UUIDs, but they are uppercase and this matches lowercase
    /// only, which is the form this type was the only writer of. Nothing may use this to
    /// decide whether to trust a stored id: ``isValid(_:)`` is the only gate, because the
    /// producer rejects every one of these ids and a decision keyed to one is not evidence.
    static func isLegacyUUIDv4(_ candidate: String) -> Bool {
        let lowered = Array(candidate)
        let expectedHyphens = [8, 13, 18, 23]
        guard lowered.count == 36 else { return false }
        for index in lowered.indices {
            if expectedHyphens.contains(index) {
                if lowered[index] != "-" { return false }
            } else if !lowered[index].isHexDigit || lowered[index].isUppercase {
                return false
            }
        }
        guard lowered[14] == "4" else { return false }
        return "89ab".contains(lowered[19])
    }

    private struct StoredSubject: Codable {
        let id: String
    }
}
