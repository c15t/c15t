import Foundation

/// A failure to establish a subject id.
public enum SubjectIdentityError: Error, Equatable, Sendable {
    /// The stored value is in no format this type writes, so it did not come from
    /// c15t. It is discarded and a fresh id is generated, because a foreign
    /// identifier must not be sent as a subject.
    case malformed(String)
}

/// The c15t subject identifier.
///
/// A `sub_` id minted by ``SubjectId``, owned by c15t, stored in the same protected
/// storage as the consent records. It is never derived from IDFV, ADID, or any other
/// persistent hardware identifier, and it is never read from one: the whole point of a
/// generated id is that a subject who clears storage starts fresh, which is what the
/// web SDK does when its storage is cleared.
public struct SubjectIdentity: Sendable, Codable, Equatable, Hashable {
    /// The id as it goes on the wire: `sub_<base58>` for anything this build mints, or
    /// the lowercase UUID v4 an install minted before that format existed.
    public let id: String

    /// Generate a new subject id.
    public static func generate() -> SubjectIdentity {
        // Minted through ``SubjectId`` rather than minted here, because the format is
        // the one the backend validates and the web SDK produces the same id from the
        // same clock and entropy. A UUID here is rejected by `POST /subjects`.
        SubjectIdentity(unchecked: SubjectId.generate())
    }

    /// Adopt a stored id, rejecting anything this SDK cannot have written.
    public init(id: String) throws {
        guard SubjectIdentity.isValid(id) else {
            throw SubjectIdentityError.malformed(id)
        }
        self.id = id
    }

    private init(unchecked id: String) {
        self.id = id
    }

    /// Read the subject id, generating and persisting one on first launch.
    ///
    /// A malformed stored value is replaced rather than repaired: there is no safe
    /// way to turn an unknown string into the identifier other consent records are
    /// already keyed by, so the honest answer is a new subject. Both formats this type
    /// writes are read back exactly as stored, so an install that upgrades keeps the
    /// subject its consent is already keyed to.
    static func loadOrCreate(from store: any ConsentStore, key: String = StorageKey.subject) -> SubjectIdentity {
        if let stored = store.decode(StoredSubject.self, for: key),
           let identity = try? SubjectIdentity(id: stored.id)
        {
            return identity
        }
        let identity = SubjectIdentity.generate()
        store.encode(StoredSubject(id: identity.id), for: key)
        return identity
    }

    /// Wire form carried on the snapshot.
    func snapshot(externalId: String?) -> SubjectSnapshot {
        SubjectSnapshot(id: id, externalId: externalId)
    }

    /// Whether this type carries `candidate`: the `sub_` format the backend requires,
    /// or the UUID v4 this type minted before that format existed. Both are shapes only
    /// this SDK writes, which is the check that keeps a device identifier from becoming
    /// a consent key.
    static func isValid(_ candidate: String) -> Bool {
        SubjectId.isValid(candidate) || isUUIDv4(candidate)
    }

    /// The shape of the ids this type minted before ``SubjectId`` existed, still read
    /// back from installs that upgraded. IDFV and ADID are also UUIDs, but they are
    /// uppercase and this accepts lowercase only, which is the form this type was the
    /// only writer of.
    static func isUUIDv4(_ candidate: String) -> Bool {
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
