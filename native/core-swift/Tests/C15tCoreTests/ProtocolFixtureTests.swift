import CryptoKit
import Foundation
import XCTest

@testable import C15tCore

/// Runs every fixture in `native/protocol/index.json` against `ConsentCore`.
///
/// The TypeScript kernel produced these files, so a diff here is Swift and
/// JavaScript reading the same input differently, and `native/CONTRACT.md` rule 4
/// settles that argument in the kernel's favour. Two rules keep the suite honest:
///
/// - Nothing is enumerated by name. `index.json` decides what runs, and a fixture
///   file the index has forgotten is a failure, so a runner cannot quietly shrink.
/// - Every accepted difference is written in ``knownDivergences`` with the reason
///   and the task that owns the fix. A diff that is not listed fails, and a listed
///   difference that no longer reproduces fails too. Silence is not a pass.
final class ProtocolFixtureTests: XCTestCase {
    /// The task that owns aligning the native snapshot types with the kernel.
    ///
    /// `native/CONTRACT.md` "Corrections to this contract" settled the shape:
    /// overrides carry `gpc` and no `test`, privacy signals are a detected /
    /// override / active triple, and the overrides a decision was made against
    /// come from the location `/init` served. This build matches all three, so
    /// what is left in ``ledger`` is the standing-directive gap and the revision
    /// numbering the contract has not picked a side on yet.
    private static let alignmentTask =
        "native protocol alignment: recording standing GPC directives, and the revision numbering a fixture pins"

    // MARK: - Locating the fixtures

    /// `native/protocol`, resolved from this file's path because `swift test`
    /// makes no promise about the working directory.
    private static let protocolDirectory: URL = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .deletingLastPathComponent()
        .appendingPathComponent("protocol")

    private struct Index: Decodable {
        struct Entry: Decodable {
            let bytes: Int
            let file: String
            let id: String
            let kind: String
            let protocolVersion: Int
            let sha256: String
        }

        struct Header: Decodable {
            let name: String
            let value: String
        }

        let clock: Int64
        let count: Int
        let fixtures: [Entry]
        let policyContractHeader: Header
        let protocolVersion: Int
    }

    private enum Failure: Error, CustomStringConvertible {
        case unsupported(fixture: String, detail: String)

        var description: String {
            switch self {
            case let .unsupported(fixture, detail):
                return "\(fixture): \(detail)"
            }
        }
    }

    // MARK: - Suite

    func testIndexIsTheWholeDirectory() throws {
        let index = try loadIndex()
        XCTAssertEqual(
            index.count,
            index.fixtures.count,
            "index.json counts \(index.count) fixtures but lists \(index.fixtures.count)"
        )
        XCTAssertEqual(
            index.protocolVersion,
            C15tSDK.protocolVersion,
            "index.json is protocol \(index.protocolVersion); this build speaks \(C15tSDK.protocolVersion). Rebuild or regenerate, do not compare across versions."
        )
        XCTAssertEqual(
            index.policyContractHeader.name,
            C15tSDK.policyContractHeader,
            "the fixture index declares a different contract header than this build sends"
        )
        XCTAssertEqual(
            index.policyContractHeader.value,
            C15tSDK.protocolHeaders[C15tSDK.policyContractHeader],
            "the fixture index pins policy contract \(index.policyContractHeader.value); this build sends \(C15tSDK.protocolHeaders[C15tSDK.policyContractHeader] ?? "nothing")"
        )
        for entry in index.fixtures {
            XCTAssertEqual(
                entry.protocolVersion,
                index.protocolVersion,
                "\(entry.id): protocolVersion disagrees with the index"
            )
        }

        let listed = Set(index.fixtures.map(\.file))
        let onDisk = try FileManager.default.contentsOfDirectory(atPath: Self.protocolDirectory.path)
            .filter { $0.hasSuffix(".json") && $0 != "index.json" }
            .sorted()
        let unlisted = onDisk.filter { !listed.contains($0) }
        XCTAssertTrue(
            unlisted.isEmpty,
            "native/protocol holds \(unlisted.joined(separator: ", ")), which index.json does not list. A runner that reads files by glob would skip them silently: regenerate."
        )
    }

    func testEveryFixtureMatchesTheKernel() async throws {
        let index = try loadIndex()
        var ran: [String] = []
        var unclaimed: [String] = []

        for entry in index.fixtures {
            switch entry.kind {
            case "evaluation":
                try await runEvaluation(entry)
                ran.append(entry.id)
            case "save-body":
                try await runSaveBody(entry)
                ran.append(entry.id)
            case "storage":
                // The web v3 record envelope is not the format either native core
                // writes: Swift stores a ``StoredEnvelope`` and Kotlin an encrypted
                // blob of its own. Claiming these would mean asserting against a
                // codec the contract does not share, so they are reported rather
                // than passed.
                unclaimed.append(entry.id)
            default:
                XCTFail("\(entry.id): kind \"\(entry.kind)\" has no runner here. Add one instead of skipping it.")
            }
        }

        print(
            "Protocol fixtures: ran \(ran.count) of \(index.count) from index.json"
                + (unclaimed.isEmpty
                    ? ""
                    : "; \(unclaimed.count) unclaimed (\(unclaimed.joined(separator: ", ")) — native envelope formats are not the web v3 codec)")
        )
        for id in ran {
            print("  ran \(id)")
        }
        judge(index)
        XCTAssertEqual(
            ran.count + unclaimed.count,
            index.count,
            "the runner accounted for \(ran.count + unclaimed.count) fixtures but the index lists \(index.count)"
        )
    }

    // MARK: - Per-kind runners

    private func runEvaluation(_ entry: Index.Entry) async throws {
        let fixture = try loadFixture(entry)
        guard let input = fixture["input"], let expected = fixture["expected"]?["snapshot"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "no input or expected.snapshot")
        }
        let run = try makeRun(entry: entry, input: input)
        await run.core.bootstrapAndSettle(run.config)
        record(
            for: entry,
            path: "expected.snapshot",
            expected: expected,
            actual: try snapshotJSON(run.core)
        )
    }

    private func runSaveBody(_ entry: Index.Entry) async throws {
        let fixture = try loadFixture(entry)
        guard let input = fixture["input"], let expected = fixture["expected"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "no input or expected")
        }
        let run = try makeRun(entry: entry, input: input)
        await run.core.bootstrapAndSettle(run.config)
        record(
            for: entry,
            path: "expected.snapshotBefore",
            expected: expected["snapshotBefore"] ?? .null,
            actual: try snapshotJSON(run.core)
        )

        let intent = try commitIntent(entry: entry, input["intent"] ?? .null)
        run.core.save(intent)
        await run.core.waitUntilIdle()
        record(
            for: entry,
            path: "expected.snapshotAfter",
            expected: expected["snapshotAfter"] ?? .null,
            actual: try snapshotJSON(run.core)
        )

        guard let request = run.http.recordedSaveRequests.last else {
            record(for: entry, path: "expected.request", detail: "the core sent no save request")
            return
        }
        guard let bodyValue = request.body.flatMap({ C15tJSON.parse($0) }) else {
            record(for: entry, path: "expected.request.body", detail: "no JSON body on the save request")
            return
        }
        var headers = JSONValue.object([:])
        if case var .object(fields) = headers {
            for (name, value) in request.headers { fields[name] = .string(value) }
            headers = .object(fields)
        }
        let actual = JSONValue.object([
            "body": bodyValue,
            "headers": headers,
            "method": .string(request.method.rawValue),
            "path": .string(request.url.path),
        ])
        // `x-c15t-version` is platform telemetry and the contract says the fixtures
        // deliberately do not pin it, so extra header keys are not a difference.
        record(
            for: entry,
            path: "expected.request",
            expected: expected["request"] ?? .null,
            actual: actual,
            extraFieldsAllowedUnder: ["expected.request.headers"]
        )
    }

    // MARK: - Running one fixture

    private struct Run {
        let core: ConsentCore
        let config: CoreConfig
        let http: StubHTTP
    }

    /// Build a core that has been handed exactly the fixture input.
    ///
    /// The init response goes in at the HTTP seam, header and status included, so
    /// the contract negotiation is part of the run rather than a fixture that
    /// assumes it. Anything the input carries that this build cannot express is an
    /// error here, not a value dropped on the floor.
    private func makeRun(entry: Index.Entry, input: JSONValue) throws -> Run {
        guard let now = input["now"]?.intValue else {
            throw Failure.unsupported(fixture: entry.id, detail: "input.now is missing")
        }
        let store = InMemoryStore()

        guard let subjectId = input["storedRecords"]?["subject"]?["subjectId"]?.stringValue else {
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "storedRecords.subject.subjectId is missing. A fixture that lets the core generate an identity is not deterministic."
            )
        }
        store.set(Data("{\"id\":\"\(subjectId)\"}".utf8), for: StorageKey.subject)

        var seeded = ConsentSnapshot(revision: 0)
        if let choice = input["storedRecords"]?["choice"], !choice.isNull {
            seeded = ConsentSnapshot(
                revision: 0,
                explicitChoice: try decode(ExplicitChoice.self, choice, entry)
            )
        }
        var dismissal: NoticeDismissal?
        if let stored = input["storedRecords"]?["noticeDismissal"], !stored.isNull {
            dismissal = try decode(NoticeDismissal.self, stored, entry)
        }
        // The policy wire stays out of the envelope on purpose: the fixture feeds
        // the policy through the transport, which is what a relaunch does.
        let envelope = StoredEnvelope(
            snapshot: seeded,
            noticeDismissal: dismissal,
            policyResolution: nil,
            storedAt: now
        )
        store.set(try C15tJSON.encode(envelope), for: StorageKey.snapshot)

        // The fixture states the two GPC facts separately and they are not the same
        // fact: `overrides.gpc` is what the app pinned, `privacySignals.gpc.detected`
        // is what the device reported. Folding one into the other is what a boolean
        // pair allowed, and it loses the distinction the evaluator needs.
        let overrideGPC = input["overrides"]?["gpc"]?.boolValue
        let detectedFromFixture = input["privacySignals"]?["gpc"]?["detected"]?.boolValue
        let overrides = ConsentOverrides(
            country: input["overrides"]?["country"]?.stringValue,
            region: input["overrides"]?["region"]?.stringValue,
            language: input["overrides"]?["language"]?.stringValue ?? "en",
            gpc: overrideGPC
        )
        var user: KernelUser?
        if let value = input["user"], !value.isNull {
            user = try decode(KernelUser.self, value, entry)
        }

        guard let transport = input["transport"], let body = transport["body"],
              let bodyData = C15tJSON.encode(body)
        else {
            throw Failure.unsupported(fixture: entry.id, detail: "input.transport.body is missing")
        }
        var headers: [String: String] = [:]
        for (name, value) in transport["headers"]?.objectValue ?? [:] {
            guard let text = value.stringValue else {
                throw Failure.unsupported(
                    fixture: entry.id,
                    detail: "input.transport.headers.\(name) is not a string"
                )
            }
            headers[name] = text
        }
        let http = StubHTTP()
        http.enqueueInit(
            HTTPResponse(
                status: Int(transport["status"]?.intValue ?? 200),
                headers: headers,
                body: bodyData
            )
        )

        let clock = TestClock(now)
        let config = CoreConfig(
            store: store,
            transport: Fixture.transport(http),
            overrides: overrides,
            user: user,
            gpc: detectedFromFixture,
            now: clock.reading,
            initRetry: .disabled
        )
        return Run(core: ConsentCore(), config: config, http: http)
    }

    private func snapshotJSON(_ core: ConsentCore) throws -> JSONValue {
        guard let value = C15tJSON.parse(try C15tJSON.encode(core.snapshot())) else {
            throw Failure.unsupported(fixture: "core", detail: "the snapshot did not serialize to JSON")
        }
        return value
    }

    private func commitIntent(entry: Index.Entry, _ intent: JSONValue) throws -> CommitIntent {
        switch intent["action"]?.stringValue {
        case "all": return .all
        case "necessary": return .necessary
        case "explicit":
            var map: [OptionalConsentCategory: Bool] = [:]
            for (name, value) in intent["consents"]?.objectValue ?? [:] {
                guard let category = OptionalConsentCategory(rawValue: name),
                      let allowed = value.boolValue
                else {
                    throw Failure.unsupported(
                        fixture: entry.id,
                        detail: "intent.consents.\(name) is not a category and a boolean"
                    )
                }
                map[category] = allowed
            }
            return .custom(map)
        case let other:
            throw Failure.unsupported(fixture: entry.id, detail: "intent.action \(other.map { "\($0)" } ?? "nil") is unknown")
        }
    }

    private func decode<T: Decodable>(_ type: T.Type, _ value: JSONValue, _ entry: Index.Entry) throws -> T {
        guard let data = C15tJSON.encode(value) else {
            throw Failure.unsupported(fixture: entry.id, detail: "\(type) would not serialize")
        }
        do {
            return try C15tJSON.decode(type, from: data)
        } catch {
            throw Failure.unsupported(fixture: entry.id, detail: "\(type) rejected the fixture: \(error)")
        }
    }

    // MARK: - Index and file access

    private func loadIndex() throws -> Index {
        let url = Self.protocolDirectory.appendingPathComponent("index.json")
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(Index.self, from: data)
    }

    /// Read a fixture, proving the bytes are the ones the generator hashed.
    ///
    /// A stale checkout looks exactly like a conformance failure, and the two
    /// deserve different messages.
    private func loadFixture(_ entry: Index.Entry) throws -> JSONValue {
        let url = Self.protocolDirectory.appendingPathComponent(entry.file)
        let data = try Data(contentsOf: url)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        XCTAssertEqual(
            digest,
            entry.sha256,
            "\(entry.file) is not the file index.json hashed. Run `bun run --cwd packages/react-native generate:fixtures`."
        )
        guard let parsed = C15tJSON.parse(data) else {
            throw Failure.unsupported(fixture: entry.id, detail: "\(entry.file) is not JSON")
        }
        guard parsed["protocolVersion"]?.intValue == Int64(C15tSDK.protocolVersion) else {
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "fixture protocolVersion \(parsed["protocolVersion"]?.intValue ?? -1) is not this build's \(C15tSDK.protocolVersion)"
            )
        }
        return parsed
    }

    // MARK: - Assertions

    /// One observed difference, kept as a path plus a human-readable detail so the
    /// ledger can match on the path and still print something useful.
    private struct Diff {
        let path: String
        let detail: String
    }

    /// Everything observed, held until the whole index has run.
    ///
    /// A fixture asserts two snapshots and a request, and the ledger is written per
    /// fixture, so judging each subtree as it arrives would call the second half of
    /// the ledger stale.
    private var recorded: [String: [Diff]] = [:]

    private func record(
        for entry: Index.Entry,
        path: String,
        expected: JSONValue,
        actual: JSONValue,
        extraFieldsAllowedUnder: Set<String> = []
    ) {
        var diffs: [Diff] = []
        collectDiffs(
            expected: expected,
            actual: actual,
            path: path,
            extraFieldsAllowedUnder: extraFieldsAllowedUnder,
            into: &diffs
        )
        recorded[entry.id, default: []].append(contentsOf: diffs)
    }

    private func record(for entry: Index.Entry, path: String, detail: String) {
        recorded[entry.id, default: []].append(Diff(path: path, detail: detail))
    }

    /// Compare what was observed against what the core is allowed to get wrong.
    ///
    /// An unlisted difference fails, and a ledger row that no longer reproduces
    /// fails too, so the list cannot rot into a way of passing by forgetting.
    private func judge(_ index: Index) {
        for entry in index.fixtures {
            let diffs = recorded[entry.id] ?? []
            let allowed = Self.divergences(for: entry.id)
            let failures = diffs.filter { diff in !allowed.contains { $0.covers(diff.path) } }
            let spent = Set(
                diffs.compactMap { diff in allowed.first { $0.covers(diff.path) }?.path }
            )
            let stale = allowed.map(\.path).filter { !spent.contains($0) }

            if !failures.isEmpty {
                let body = failures.map { "  \($0.path): \($0.detail)" }.joined(separator: "\n")
                XCTFail(
                    """
                    \(entry.id) disagrees with the kernel in \(failures.count) place(s):
                    \(body)
                    Fix the Swift core, not the fixture. If the field really belongs to \
                    \(Self.alignmentTask), list it in the ledger with the reason.
                    """
                )
            }
            if !stale.isEmpty {
                let names = stale.joined(separator: ", ")
                XCTFail(
                    "\(entry.id): the ledger still lists \(names), which no longer "
                        + "differ. The core matches the kernel here, so drop the row."
                )
            }
        }
    }

    private func collectDiffs(
        expected: JSONValue,
        actual: JSONValue?,
        path: String,
        extraFieldsAllowedUnder: Set<String>,
        into diffs: inout [Diff]
    ) {
        if expected.isNull, actual == nil || actual?.isNull == true {
            return
        }
        guard let actual else {
            diffs.append(Diff(path: path, detail: "expected \(render(expected)), the core produced nothing"))
            return
        }
        switch (expected, actual) {
        case let (.object(wanted), .object(got)):
            for key in wanted.keys.sorted() {
                collectDiffs(
                    expected: wanted[key] ?? .null,
                    actual: got[key],
                    path: "\(path).\(key)",
                    extraFieldsAllowedUnder: extraFieldsAllowedUnder,
                    into: &diffs
                )
            }
            if !extraFieldsAllowedUnder.contains(path) {
                // A key the fixture leaves out and the core spells `null` is the same
                // answer as the other way round, so only a value carries signal.
                // Everything else the core invents still gets reported.
                for key in got.keys.sorted() where wanted[key] == nil && !got[key]!.isNull {
                    diffs.append(Diff(
                        path: "\(path).\(key)",
                        detail: "the core produced \(render(got[key] ?? .null)), which the fixture does not carry"
                    ))
                }
            }
        case let (.array(wanted), .array(got)):
            if wanted.count != got.count {
                diffs.append(Diff(
                    path: path,
                    detail: "expected \(wanted.count) item(s) [\(wanted.map(render).joined(separator: ", "))]"
                        + ", the core produced \(got.count) [\(got.map(render).joined(separator: ", "))]"
                ))
            }
            for index in 0..<min(wanted.count, got.count) {
                collectDiffs(
                    expected: wanted[index],
                    actual: got[index],
                    path: "\(path)[\(index)]",
                    extraFieldsAllowedUnder: extraFieldsAllowedUnder,
                    into: &diffs
                )
            }
        default:
            if !matches(expected, actual) {
                diffs.append(Diff(
                    path: path,
                    detail: "expected \(render(expected)), the core produced \(render(actual))"
                ))
            }
        }
    }

    /// Value equality with the two tolerances that are not contract: `null` against
    /// absent, and an integer against the same number spelled as a double.
    private func matches(_ expected: JSONValue, _ actual: JSONValue) -> Bool {
        if expected.isNull { return actual.isNull }
        switch (expected, actual) {
        case let (.object(wanted), .object(got)):
            guard wanted.keys == got.keys else { return false }
            return wanted.allSatisfy { key, value in matches(value, got[key] ?? .null) }
        case let (.array(wanted), .array(got)):
            guard wanted.count == got.count else { return false }
            return zip(wanted, got).allSatisfy { matches($0, $1) }
        case let (.integer(wanted), .integer(got)): return wanted == got
        case let (.integer(wanted), .number(got)): return Double(wanted) == got
        case let (.number(wanted), .integer(got)): return wanted == Double(got)
        case let (.number(wanted), .number(got)): return wanted == got
        case let (.bool(wanted), .bool(got)): return wanted == got
        case let (.string(wanted), .string(got)): return wanted == got
        default: return false
        }
    }

    private func render(_ value: JSONValue) -> String {
        var text: String
        switch value {
        case .null: text = "null"
        case let .bool(flag): text = flag ? "true" : "false"
        case let .integer(number): text = String(number)
        case let .number(number): text = String(number)
        case let .string(contents): text = "\"\(contents)\""
        case let .array(items): text = "[\(items.map(render).joined(separator: ", "))]"
        case let .object(fields):
            text = "{\(fields.keys.sorted().map { "\"\($0)\": \(render(fields[$0] ?? .null))" }.joined(separator: ", "))}"
        }
        return text.count > 220 ? "\(text.prefix(220))…" : text
    }

    // MARK: - Accepted differences

    /// A field this build cannot match yet, and who owns changing it.
    private struct Divergence {
        /// Dotted path, with a trailing `*` meaning "this path and everything under it".
        let path: String
        let reason: String

        func covers(_ candidate: String) -> Bool {
            if path.hasSuffix("*") {
                return candidate.hasPrefix(String(path.dropLast()))
            }
            return candidate == path
        }
    }


    /// The snapshot fields a fixture can assert on, by the name the fixture uses.
    ///
    /// Overrides and privacy signals are absent from this list. The first draft of
    /// `native/CONTRACT.md` gave this build a `test` override and a `gpc`/`msa`
    /// boolean pair, and its Corrections section retired both; the core now carries
    /// `gpc` inside the overrides, a detected / override / active triple, and the
    /// overrides the served location resolved, so every snapshot field under those
    /// two paths matches the kernel and has no business being listed here.
    private enum Field: String {
        case restrictionMarketing = "restrictions.marketing"
        case restrictionMeasurement = "restrictions.measurement"
        case revision = "revision"
        case directives = "optOutDirectives"
        case deadline = "nextDeadline"
    }

    /// One row per snapshot a fixture asserts: which fields this build cannot match
    /// yet, and why. Nothing here is a fixture problem. Every row is a Swift defect
    /// with an owner, and the runner fails if a row stops reproducing.
    private static let ledger: [(fixture: String, root: String, fields: [Field])] = [
        ("evaluation-eu-opt-in", "expected.snapshot", [.revision]),
        ("evaluation-us-ccpa-opt-out", "expected.snapshot", [.revision]),
        ("evaluation-no-rule-matched", "expected.snapshot", [.revision]),
        ("evaluation-gpc-signal-present", "expected.snapshot", [.directives, .restrictionMarketing, .restrictionMeasurement]),
        ("evaluation-notice-pending", "expected.snapshot", [.revision]),
        ("evaluation-eu-explicit-grants", "expected.snapshot", [.revision]),
        ("evaluation-eu-partial-denials", "expected.snapshot", [.revision]),
        ("evaluation-notice-dismissed", "expected.snapshot", [.revision]),
        ("save-body-all", "expected.snapshotBefore", [.revision]),
        ("save-body-all", "expected.snapshotAfter", [.revision]),
        ("save-body-necessary", "expected.snapshotBefore", [.revision]),
        ("save-body-necessary", "expected.snapshotAfter", [.revision]),
        ("save-body-explicit-partial", "expected.snapshotBefore", [.revision]),
        ("save-body-explicit-partial", "expected.snapshotAfter", [.revision]),
        ("save-body-ccpa-gpc", "expected.snapshotBefore", [.directives, .restrictionMarketing, .restrictionMeasurement]),
        ("save-body-ccpa-gpc", "expected.snapshotAfter", [.directives, .restrictionMarketing, .restrictionMeasurement, .deadline]),
    ]

    private static func divergences(for id: String) -> [Divergence] {
        ledger.filter { $0.fixture == id }.map { row in
            row.fields.map { field in
                Divergence(path: "\(row.root).\(field.rawValue)", reason: reason(for: field))
            }
        }
        .flatMap { $0 }
    }

    private static func reason(for field: Field) -> String {
        switch field {
        case .restrictionMarketing, .restrictionMeasurement:
            return reasonDirectiveRestriction
        case .revision:
            return reasonRevision
        case .directives:
            return reasonDirectives
        case .deadline:
            return reasonDeadline
        }
    }

    /// `JSONEncoder` cannot key a JSON object by an enum, so a
    /// `[OptionalConsentCategory: [RestrictionReason]]` comes out as a flat
    /// `[key, value, ...]` array. `getSnapshot()` hands that to JavaScript, where
    /// nothing can read it. Snapshot coding, same task.
    /// The category is denied by GPC in both cores, so the `gpc` reason agrees. The
    /// kernel charges one more reason because it recorded a standing directive from
    /// the live signal, and this build records none. Same defect as ``reasonDirectives``.
    private static let reasonDirectiveRestriction =
        "the kernel also charges a directive-denied category with an opt-out-directive reason; this build records no directive, so its reason list is one short."

    /// `hydrate()` runs the evaluator and takes a revision, so every native number is
    /// one ahead of the kernel's, which counts committed state changes only. The
    /// counter is local to a launch; the contract has not said which step is allowed
    /// to cost one.
    private static let reasonRevision =
        "hydrate() counts as a mutation here, so the native revision runs one ahead of the kernel numbering."

    /// A live GPC signal produces a standing directive in the kernel, and the
    /// directive is what keeps denying after the signal goes away. This build only
    /// replays directives the backend returns in `records`.
    private static let reasonDirectives =
        "the core never records a directive from a live GPC signal, so optOutDirectives stays empty where the kernel holds one."

    /// Under an opt-out rule the choice expiring changes neither permissions nor the
    /// prompt, so the kernel reports no deadline. This one reports the expiry anyway.
    private static let reasonDeadline =
        "the core reports a choice expiry the kernel does not: nothing changes when it passes under an opt-out rule."
}
