import CryptoKit
import Foundation

@testable import C15tCore

/// What one surviving vendor claims about itself, as the web filter left it in the fixture.
///
/// ``bodyId`` is the id the surviving entry states in its own `id` field, which the key it is
/// served under may or may not agree with. The filter never consults it, so
/// ``bodyIdDiffersFromKey`` is the fixture recording a disagreement the producer planted rather
/// than a rule this target invented: a prune that keyed correctly and read bodies anyway returns
/// a different set with the same count, and only a key-by-key comparison can see that.
struct VendorSurvivalClaim {
    let bodyId: Int
    let bodyIdDiffersFromKey: Bool
    let carriesOptionalFields: Bool
    let key: Int
    let name: String
}

/// One `vendor-list-scope` fixture, read off the bytes `index.json` hashed.
///
/// ``scope`` is `nil` for the vector that declares no scope at all, `[]` for the vector that
/// declares an empty one, and the declared ids otherwise. Both no-scope shapes expect the served
/// document back, which is what ``unchanged`` records: the web's filter returned the document it
/// was handed rather than a rebuilt copy of it.
///
/// ``expectedVendorKeys`` is in web order. Swift's vendor collection is a dictionary, which has no
/// order to report, so this target compares key sets and per-key entries; the ordering claim is
/// graded where a collection carries order, which is `narrowToVendorIds` in the Kotlin core.
struct VendorListScopeVector {
    let expectedDocument: JSONValue
    let expectedVendorKeys: [Int]
    let file: String
    let id: String
    /// The served keys whose entry states a different id in its own body, ascending.
    let disagreeingKeys: [Int]
    let scope: [Int]?
    let scopeSize: Int
    let served: JSONValue
    let servedVendorKeys: [Int]
    let shape: String
    let surviving: [VendorSurvivalClaim]
    let unchanged: Bool
}

/// The only place this test target opens a `vendor-list-scope` fixture.
///
/// The vectors lane owns `native/protocol` and publishes through its `index.json`; this target
/// reads that directory and writes nothing to it. The oracle behind these files is
/// `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts`, called by the generator rather
/// than restated, so an expectation here is the browser build's answer and not Swift's opinion
/// about it.
///
/// ``all()`` enumerates through the index rather than globbing, and proves the bytes are the ones
/// the generator hashed before parsing them. A fixture whose digest moved was edited after it was
/// written, and grading this core against that would fail Swift for somebody else's keystrokes.
enum VendorListScopeFixtures {
    /// The kind these fixtures carry, and the only kind ``all()`` returns.
    static let kind = "vendor-list-scope"

    /// `native/protocol`, resolved from this file's path because `swift test` makes no promise
    /// about the working directory.
    static let directory: URL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("protocol")

    enum LoadError: Error, CustomStringConvertible {
        case missingField(file: String, detail: String)
        case hashMismatch(file: String, wanted: String, got: String)
        case malformed(file: String, detail: String)

        var description: String {
            switch self {
            case let .missingField(file, detail):
                return "\(file): \(detail)"
            case let .hashMismatch(file, wanted, got):
                return "\(file) hashes to \(got), index.json says \(wanted): regenerate rather than comparing"
            case let .malformed(file, detail):
                return "\(file): \(detail)"
            }
        }
    }

    private struct IndexEntry: Decodable {
        let file: String
        let id: String
        let kind: String
        let sha256: String
    }

    private struct Index: Decodable {
        let fixtures: [IndexEntry]
    }

    /// Every `vendor-list-scope` fixture the index lists, in a stable order.
    static func all() throws -> [VendorListScopeVector] {
        let data = try Data(contentsOf: directory.appendingPathComponent("index.json"))
        let index = try JSONDecoder().decode(Index.self, from: data)
        let listed = index.fixtures
            .filter { $0.kind == kind }
            .sorted { $0.file < $1.file }
        let vectors = try listed.map(load)

        // A file on disk the index never listed would be invisible to the loop above, which is
        // how a published vector quietly stops being graded.
        let onDisk = (try? FileManager.default.contentsOfDirectory(atPath: directory.path))?
            .filter { $0.hasPrefix("\(kind)-") && $0.hasSuffix(".json") } ?? []
        let unlisted = onDisk.filter { name in !listed.contains { $0.file == name } }.sorted()
        if !unlisted.isEmpty {
            throw LoadError.malformed(
                file: "index.json",
                detail: "holds \(unlisted.joined(separator: ", ")) on disk that it does not list"
            )
        }
        return vectors
    }

    /// The ids of every vector, so the kernel runner can prove it claims these too.
    static func ids() throws -> [String] { try all().map(\.id).sorted() }

    /// Read a fixture and prove the bytes are the ones the generator hashed.
    private static func load(_ entry: IndexEntry) throws -> VendorListScopeVector {
        let data = try Data(contentsOf: directory.appendingPathComponent(entry.file))
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == entry.sha256 else {
            throw LoadError.hashMismatch(file: entry.file, wanted: entry.sha256, got: digest)
        }
        guard let root = C15tJSON.parse(data) else {
            throw LoadError.malformed(file: entry.file, detail: "not JSON")
        }
        return try parse(root, entry: entry)
    }

    private static func parse(_ root: JSONValue, entry: IndexEntry) throws -> VendorListScopeVector {
        // `JSONValue` stores whole numbers as `Int64`, and every id in a vendor list is an `Int`
        // on both platforms. Reading through these two keeps a silently narrowing cast out of the
        // file: a number outside `Int` is a malformed fixture, not an id.
        guard let input = root["input"], let expected = root["expected"] else {
            throw LoadError.malformed(file: entry.file, detail: "no input or expected")
        }
        guard let served = input["document"], let expectedDocument = expected["document"] else {
            throw LoadError.malformed(file: entry.file, detail: "no input.document or expected.document")
        }
        guard let protocolVersion = root["protocolVersion"]?.intValue, protocolVersion == 1 else {
            throw LoadError.malformed(file: entry.file, detail: "protocolVersion is not this build's 1")
        }
        guard let scopeSize = id(input["scopeSize"]) else {
            throw LoadError.malformed(file: entry.file, detail: "no input.scopeSize")
        }
        guard let expectedVendorKeys = keyList(expected["vendorKeys"]) else {
            throw LoadError.malformed(file: entry.file, detail: "expected.vendorKeys is not a list of document keys")
        }
        guard let rawScope = input["vendorIds"] else {
            throw LoadError.malformed(file: entry.file, detail: "input.vendorIds is missing; the absent case is a JSON null, not an absent key")
        }
        let scope: [Int]?
        if rawScope.isNull {
            scope = nil
        } else {
            guard let ids = idList(rawScope) else {
                throw LoadError.malformed(file: entry.file, detail: "input.vendorIds is neither null nor a list of ids")
            }
            scope = ids
        }
        guard let transcript = expected["vendors"]?.arrayValue else {
            throw LoadError.malformed(file: entry.file, detail: "no expected.vendors transcript")
        }
        let surviving = try transcript.map { row -> VendorSurvivalClaim in
            guard let key = id(row["key"]), let name = row["name"]?.stringValue,
                  let bodyId = id(row["bodyId"]),
                  let differs = row["bodyIdDiffersFromKey"]?.boolValue,
                  let carriesOptional = row["carriesOptionalFields"]?.boolValue
            else {
                throw LoadError.malformed(file: entry.file, detail: "a surviving vendor is incomplete")
            }
            return VendorSurvivalClaim(
                bodyId: bodyId,
                bodyIdDiffersFromKey: differs,
                carriesOptionalFields: carriesOptional,
                key: key,
                name: name
            )
        }
        guard let servedVendors = served["vendors"]?.objectValue else {
            throw LoadError.malformed(file: entry.file, detail: "input.document.vendors is not a record")
        }
        guard let servedKeys = idKeys(servedVendors.keys) else {
            throw LoadError.malformed(file: entry.file, detail: "input.document.vendors has a key that is not an id")
        }

        // Which served records state a number that is not the key they live under. Read from the
        // document rather than trusted from a comment, because the planted pair is the whole
        // reason the key-authority vector can tell the two readings apart at all.
        let disagreeing = servedVendors
            .filter { name, record in
                guard let key = Int(name), let stated = id(record["id"]) else { return false }
                return key != stated
            }
            .keys
            .compactMap(Int.init)
            .sorted()

        return VendorListScopeVector(
            expectedDocument: expectedDocument,
            expectedVendorKeys: expectedVendorKeys,
            file: entry.file,
            id: entry.id,
            disagreeingKeys: disagreeing,
            scope: scope,
            scopeSize: scopeSize,
            served: served,
            servedVendorKeys: servedKeys,
            shape: root["shape"]?.stringValue ?? "",
            surviving: surviving,
            unchanged: expected["unchanged"]?.boolValue ?? false
        )
    }

    /// One id, or `nil` for anything that is not a whole number this platform can hold.
    /// Every served key as an id, ascending, or `nil` when one of them is not a number. A
    /// document whose keys are not ids is not the shape either core reads, so it stops here.
    private static func idKeys(_ keys: some Sequence<String>) -> [Int]? {
        var ids: [Int] = []
        for key in keys {
            guard let id = Int(key) else { return nil }
            ids.append(id)
        }
        return ids.sorted()
    }

    /// One id, or `nil` for anything that is not a whole number this platform can hold.
    private static func id(_ value: JSONValue?) -> Int? {
        guard let wide = value?.intValue, Int64(Int.min) <= wide, wide <= Int64(Int.max) else {
            return nil
        }
        return Int(wide)
    }

    /// A list of `vendors` keys, in published order.
    ///
    /// The web filter returns an object, so the keys it survived with come out of `Object.keys` --
    /// strings. The harness publishes them that way instead of quietly numbering them, which is
    /// what makes this list the document's own key order rather than a second answer about ids.
    /// Order matters here: the Kotlin core compares against it entry for entry.
    private static func keyList(_ value: JSONValue?) -> [Int]? {
        guard let items = value?.arrayValue else { return nil }
        var ids: [Int] = []
        ids.reserveCapacity(items.count)
        for item in items {
            guard let key = item.stringValue, let id = Int(key) else { return nil }
            ids.append(id)
        }
        return ids
    }

    /// A list where every member is an id, or `nil` when any member is not. Nothing is dropped
    /// on the floor here: a vector whose ids do not all read is a broken fixture, and grading
    /// against a partial id list would turn that into a green run.
    private static func idList(_ value: JSONValue?) -> [Int]? {
        guard let items = value?.arrayValue else { return nil }
        var ids: [Int] = []
        ids.reserveCapacity(items.count)
        for item in items {
            guard let id = id(item) else { return nil }
            ids.append(id)
        }
        return ids
    }
}
