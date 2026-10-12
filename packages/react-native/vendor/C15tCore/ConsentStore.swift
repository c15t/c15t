import Foundation

/// Keys of the two protected items the contract names, plus the write queue.
public enum StorageKey {
    /// The c15t subject id. Separate from the snapshot so an identity survives a
    /// policy reset, and a reset never has to rewrite it.
    public static let subject = "com.c15t.subject"
    /// The stored envelope: last known snapshot, records, and policy wire.
    public static let snapshot = "com.c15t.snapshot"
    /// Consent saves persisted before they reached the backend.
    public static let pendingSaves = "com.c15t.pending"
}

/// Byte storage for the two protected items.
///
/// Deliberately untyped: the Keychain, a file, and a dictionary differ mainly in
/// how they fail, and the core treats all of the failures the same way it treats
/// unreadable data. Deny. Keeping the protocol at `Data` in means the fail-closed
/// path has exactly one shape.
public protocol ConsentStore: Sendable {
    /// Read a key. `nil` means absent *or* unreadable, and both mean the same
    /// thing to the core: there is nothing to trust here.
    func data(for key: String) -> Data?

    /// Write a key, or remove it when `data` is `nil`.
    ///
    /// - Returns: whether the write landed. A failed write must not fail the
    ///   caller's consent action: local state is already committed, and losing a
    ///   receipt is better than refusing to record the subject's decision.
    @discardableResult
    func set(_ data: Data?, for key: String) -> Bool
}

extension ConsentStore {
    func decode<T: Decodable>(_ type: T.Type, for key: String) -> T? {
        guard let raw = data(for: key) else { return nil }
        return try? C15tJSON.decode(type, from: raw)
    }

    /// Write already-serialized bytes.
    ///
    /// This overload exists so handing `encode` a `Data` does not fall through to
    /// the generic one, which would JSON-encode the bytes into a base64 string and
    /// store an envelope nothing can read back. Bytes in, bytes written.
    @discardableResult
    public func encode(_ data: Data, for key: String) -> Bool {
        set(data, for: key)
    }

    @discardableResult
    public func encode<T: Encodable>(_ value: T, for key: String) -> Bool {
        guard let raw = try? C15tJSON.encode(value) else { return false }
        return set(raw, for: key)
    }
}

// MARK: - In-memory

/// Volatile store. The default in tests and the fallback a host can opt into for
/// a session that must not persist consent, such as a private-browsing surface.
public final class InMemoryStore: ConsentStore, @unchecked Sendable {
    private let lock = Lock()
    private var values: [String: Data] = [:]

    public init() {}

    public func data(for key: String) -> Data? {
        lock.withLock { values[key] }
    }

    @discardableResult
    public func set(_ data: Data?, for key: String) -> Bool {
        lock.withLock {
            if let data {
                values[key] = data
            } else {
                values.removeValue(forKey: key)
            }
            return true
        }
    }

    /// A snapshot of what is stored, for tests that assert a payload landed before
    /// a network call rather than trusting a mock.
    var snapshotOfContents: [String: Data] {
        lock.withLock { values }
    }
}

// MARK: - File

/// File-backed store for macOS, command-line tools, and tests that need real
/// process boundaries.
///
/// Writes are atomic, so a process killed mid-write cannot leave a half-encoded
/// envelope that would read as an unparseable policy and deny everything.
public final class FileStore: ConsentStore, @unchecked Sendable {
    public enum StoreError: Error {
        case directoryNotWritable(URL)
    }

    public let directory: URL
    private let lock = Lock()

    public init(directory: URL) {
        self.directory = directory
        try? FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
    }

    /// A store under the app's Application Support directory, namespaced by
    /// bundle id so two apps from the same developer cannot read each other's
    /// consent.
    public convenience init(namespace: String = Bundle.main.bundleIdentifier ?? "com.c15t") throws {
        let base = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        self.init(directory: base.appendingPathComponent("c15t/\(namespace)", isDirectory: true))
    }

    public func data(for key: String) -> Data? {
        lock.withLock {
            guard let raw = try? Data(contentsOf: url(for: key)), !raw.isEmpty else {
                return nil
            }
            return raw
        }
    }

    @discardableResult
    public func set(_ data: Data?, for key: String) -> Bool {
        lock.withLock {
            let target = url(for: key)
            guard let data else {
                do {
                    try FileManager.default.removeItem(at: target)
                } catch {
                    return false
                }
                return true
            }
            do {
                try FileManager.default.createDirectory(
                    at: directory,
                    withIntermediateDirectories: true
                )
                try (data as NSData).write(
                    to: target,
                    options: [.atomic, .completeFileProtection]
                )
                return true
            } catch {
                return false
            }
        }
    }

    private func url(for key: String) -> URL {
        // Keys are dotted identifiers; map them onto a filesystem-safe name
        // without colliding with a key that already contains underscores.
        let name = key.unicodeScalars.map { scalar in
            CharacterSet.alphanumerics.contains(scalar) ? Character(scalar) : "_"
        }
        return directory.appendingPathComponent(String(name) + ".json")
    }
}

// MARK: - Keychain

#if canImport(Security)
import Security

/// Keychain-backed store: a generic password item per key.
///
/// The contract requires the snapshot and the records to sit in the Keychain, not
/// in a preferences file, because they identify a subject's decisions. Values are
/// stored as data under ``StorageKey`` names, and the item is protected on first
/// unlock so a background refresh works after a reboot but not before it.
public final class KeychainStore: ConsentStore, @unchecked Sendable {
    /// The Keychain service. One per app install; changing it orphans stored
    /// consent, which is the same outcome as a reinstall.
    public let service: String

    private let lock = Lock()

    public init(service: String = "com.c15t.core") {
        self.service = service
    }

    public func data(for key: String) -> Data? {
        lock.withLock {
            var query: [String: Any] = baseQuery(for: key)
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            query[kSecReturnData as String] = true

            var item: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &item)
            guard status == errSecSuccess, let data = item as? Data, !data.isEmpty else {
                return nil
            }
            return data
        }
    }

    @discardableResult
    public func set(_ data: Data?, for key: String) -> Bool {
        lock.withLock {
            if let data {
                var query: [String: Any] = baseQuery(for: key)
                let attributes: [String: Any] = [kSecValueData as String: data]
                let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
                if updateStatus == errSecSuccess {
                    return true
                }
                guard updateStatus == errSecItemNotFound else { return false }

                query[kSecValueData as String] = data
                query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
                return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
            }

            let status = SecItemDelete(baseQuery(for: key) as CFDictionary)
            return status == errSecSuccess || status == errSecItemNotFound
        }
    }

    /// Remove every item this store owns. Used by a full reset, which must not
    /// leave an orphaned subject id behind.
    public func removeAll() {
        lock.withLock {
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
            ]
            SecItemDelete(query as CFDictionary)
        }
    }

    private func baseQuery(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
    }
}
#endif
