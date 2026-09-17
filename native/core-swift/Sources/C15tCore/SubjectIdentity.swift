import Foundation

/// A failure to establish a subject id.
public enum SubjectIdentityError: Error, Equatable, Sendable {
    /// The stored value is not a UUID v4. It is discarded and a fresh id is
    /// generated, because a corrupted identifier must not be sent as a subject.
    case malformed(String)
}

/// The c15t subject identifier.
///
/// A generated UUID v4, owned by c15t, stored in the same protected storage as the
/// consent records. It is never derived from IDFV, ADID, or any other persistent
/// hardware identifier, and it is never read from one: the whole point of a
/// generated id is that a subject who clears storage starts fresh, which is what
/// the web SDK does when its storage is cleared.
public struct SubjectIdentity: Sendable, Codable, Equatable, Hashable {
    /// Canonical form: lowercase, hyphenated UUID v4.
    public let id: String

    /// Generate a new subject id.
    public static func generate() -> SubjectIdentity {
        // `UUID()` is version 4 with an RFC 4122 variant. Lowercasing keeps the
        // same canonical shape the web SDK produces with `crypto.randomUUID()`,
        // so one subject does not appear as two ids across a web and native pair.
        SubjectIdentity(unchecked: UUID().uuidString.lowercased())
    }

    /// Adopt a stored id, rejecting anything that is not a UUID v4.
    public init(id: String) throws {
        guard SubjectIdentity.isUUIDv4(id) else {
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
    /// already keyed by, so the honest answer is a new subject.
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

    /// The shape check that keeps a hardware identifier out: exact 8-4-4-4-12
    /// layout, version nibble 4, RFC 4122 variant. IDFV and ADID are also UUIDs,
    /// but they are uppercase and this accepts lowercase only, which is the form
    /// this type is the only writer of.
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
