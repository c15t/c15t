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

        // The vendor-scope vectors are graded by `VendorListScopeTests`, for the same reason the
        // TC Strings have their own file: narrowing a vendor list is not something `C15tSDK` does
        // on a kernel call, so this runner has no action to replay against them. What it can prove
        // is the handoff -- the file that grades them reaches exactly the entries this index lists,
        // which is what turns the branch below into accounting rather than an excuse.
        let vendorScopeIDs = Set(index.fixtures.filter { $0.kind == VendorListScopeFixtures.kind }.map(\.id))
        XCTAssertEqual(
            try VendorListScopeFixtures.ids(),
            vendorScopeIDs.sorted(),
            "the vendor-scope loader does not reach exactly the fixtures index.json lists, which would "
                + "make the claim below a claim rather than a fact"
        )

        for entry in index.fixtures {
            switch entry.kind {
            case "evaluation":
                try await runEvaluation(entry)
                ran.append(entry.id)
            case "save-body":
                try await runSaveBody(entry)
                ran.append(entry.id)
            case "revision-trace":
                try await runRevisionTrace(entry)
                ran.append(entry.id)
            case "native-envelope":
                try await runNativeEnvelope(entry)
                ran.append(entry.id)
            case "reset-consent":
                try await runResetConsent(entry)
                ran.append(entry.id)
            case "tc-string":
                try runTcString(entry)
                ran.append(entry.id)
            case VendorListScopeFixtures.kind:
                // VendorListScopeTests grades all of these against the same index, and the check
                // above proved it reaches these exact ids, so this branch is accounting.
                ran.append(entry.id)
            default:
                XCTFail("\(entry.id): kind \"\(entry.kind)\" has no runner here. Add one instead of skipping it.")
            }
        }

        // Derived from the kinds this file claims rather than from a list of excuses,
        // so the count is zero by construction and stays zero only while every kind in
        // the index has a branch above.
        let unclaimed = index.fixtures
            .filter { !Self.claimedKinds.contains($0.kind) }
            .map(\.id)
        print(
            "Protocol fixtures: ran \(ran.count) of \(index.count) from index.json; "
                + "\(unclaimed.count) unclaimed"
                + (unclaimed.isEmpty ? "" : " (\(unclaimed.joined(separator: ", ")))")
        )
        for id in ran {
            print("  ran \(id)")
        }
        // The tc-string lane has to account for each fixture of its kind, not merely
        // avoid failing: `claimedKinds` already says the kind is claimed, so a runner
        // that returned early would leave `unclaimed` empty and the suite green. The
        // count has to be earned.
        let tcStringIDs = Set(index.fixtures.filter { $0.kind == "tc-string" }.map(\.id))
        let tcStringClaimed = ran.filter { tcStringIDs.contains($0) }.count
        print(
            "TC fixtures: claimed \(tcStringClaimed) of \(tcStringIDs.count) tc-string fixtures from "
                + "index.json; \(tcStringIDs.count - tcStringClaimed) unclaimed "
                + "(\(tcStringEncodeSkipped) decode-only by the fixture's own instruction, "
                + "\(tcStringIDs.count - tcStringEncodeSkipped) claiming a byte-exact encode)"
        )
        let vendorScopeClaimed = ran.filter { vendorScopeIDs.contains($0) }.count
        print(
            "Vendor scope fixtures: claimed \(vendorScopeClaimed) of \(vendorScopeIDs.count) "
                + "vendor-list-scope fixtures from index.json; "
                + "\(vendorScopeIDs.count - vendorScopeClaimed) unclaimed"
        )
        XCTAssertEqual(
            vendorScopeClaimed,
            vendorScopeIDs.count,
            "the vendor-scope runner claimed \(vendorScopeClaimed) of \(vendorScopeIDs.count). A "
                + "vendor-list-scope fixture that is neither run nor named is a fixture that cannot fail."
        )
        XCTAssertEqual(
            tcStringClaimed,
            tcStringIDs.count,
            "the tc-string runner claimed \(tcStringClaimed) of \(tcStringIDs.count). A tc-string fixture "
                + "that is neither run nor named is a fixture that cannot fail."
        )
        judge(index)
        XCTAssertEqual(
            ran.count + unclaimed.count,
            index.count,
            "the runner accounted for \(ran.count + unclaimed.count) fixtures but the index lists \(index.count)"
        )
        XCTAssertTrue(
            unclaimed.isEmpty,
            "index.json holds \(unclaimed.joined(separator: ", ")), which no runner here claims. A fixture nobody runs is a fixture that cannot fail."
        )
    }

    // MARK: - Per-kind runners

    /// Replay a mutation sequence and compare the revision trace it leaves.
    ///
    /// Two numbers per step, from two independent observations of the core: how
    /// much the revision moved, and how many times the snapshot observers were
    /// woken. The second one is the half a revision cannot prove. A core that bumps
    /// the counter and never tells the observers has produced exactly the trace the
    /// kernel produced, while the React Native pump -- which reads `onChange`, not
    /// the event hub -- never hears that anything changed, which is the
    /// unsupported-contract bug this fixture was written to keep fixed.
    ///
    /// The observer attaches after bootstrap has settled, because hydration and
    /// bootstrap are mutations in some cores and not in others. That is also why the
    /// fixture pins deltas and not absolute revisions: `native/CONTRACT.md` refuses
    /// to compare the numbering a core starts from.
    /// Run a `reset-consent` fixture.
    ///
    /// The device is a real one by the time the wipe lands: it booted over the fixture's
    /// stored subject, resolved a policy from the transport, and took the fixture's action
    /// through ``ConsentCore/save(_:)``, so the receipt being deleted is one this core
    /// wrote. Then three answers are read off it, in this order:
    ///
    /// - the baseline ``ConsentCore/reset()`` publishes, which has to be the cold-start
    ///   state the contract table describes with the identity and the host's own
    ///   configuration still on it, and the one revision bump the wipe is worth;
    /// - what the store holds at that same instant, read from inside the publication. That
    ///   is the only moment the deletion is observable, because the init the wipe re-runs
    ///   then caches the policy it resolves exactly as a first launch's caches one;
    /// - the snapshot the device settles on once that init has landed, which is what the
    ///   kernel produced for a device that never decided at all.
    private func runResetConsent(_ entry: Index.Entry) async throws {
        let fixture = try loadFixture(entry)
        guard let input = fixture["input"],
              let expected = fixture["expected"],
              let baseline = expected["baseline"],
              let intent = input["intent"]
        else {
            throw Failure.unsupported(fixture: entry.id, detail: "no input, input.intent or expected.baseline")
        }
        let run = try makeRun(entry: entry, input: input)
        await run.core.bootstrapAndSettle(run.config)
        run.core.save(try commitIntent(entry: entry, intent))
        await run.core.waitUntilIdle()
        guard run.core.snapshot().explicitChoice != nil else {
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "the action left no receipt on the device, so there was nothing for the wipe to delete"
            )
        }
        let revisionBefore = run.core.snapshot().revision

        // The wipe re-runs init, and the fixture serves it the same /init it serves
        // bootstrap. Queueing a second answer is what makes that visible: a core that never
        // re-resolved would ask once and the run would end with the device parked on the
        // baseline.
        guard let transport = input["transport"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "no transport to serve the wipe's init")
        }
        run.http.enqueueInit(try Self.initResponse(from: transport, entry: entry))

        let witness = WipeWitness(store: run.store)
        let subscription = run.core.onChange(witness)
        run.core.reset()
        subscription.cancel()

        guard let published = witness.baselineSnapshot else {
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "reset() published no snapshot, so every gate in the process still holds the decision it deleted"
            )
        }
        record(
            for: entry,
            path: "expected.baseline.revisionDelta",
            expected: baseline["revisionDelta"] ?? .null,
            actual: .integer(Int64(published.revision - revisionBefore))
        )
        record(
            for: entry,
            path: "expected.baseline.snapshot",
            expected: baseline["snapshot"] ?? .null,
            actual: try snapshotJSON(published)
        )
        record(
            for: entry,
            path: "expected.baseline.disk",
            expected: baseline["disk"] ?? .null,
            actual: witness.baselineDisk ?? .null
        )

        await run.core.waitUntilIdle()
        record(
            for: entry,
            path: "expected.afterInit.snapshot",
            expected: expected["afterInit"]?["snapshot"] ?? .null,
            actual: try snapshotJSON(run.core)
        )
    }

    /// Holds the first publication after it is attached, and the store's contents at that
    /// instant.
    ///
    /// The store has to be read from inside the callback. A wipe deletes and then re-runs
    /// init, and that init caches the policy it resolves, so by the time the call stack
    /// unwinds the bytes the wipe removed have been replaced by bytes that are allowed.
    private final class WipeWitness: SnapshotObserver, @unchecked Sendable {
        private let store: any ConsentStore
        private let lock = NSLock()
        private var first: ConsentSnapshot?
        private var disk: JSONValue?

        init(store: any ConsentStore) {
            self.store = store
        }

        var baselineSnapshot: ConsentSnapshot? {
            lock.lock()
            defer { lock.unlock() }
            return first
        }

        var baselineDisk: JSONValue? {
            lock.lock()
            defer { lock.unlock() }
            return disk
        }

        func consentDidChange(_ snapshot: ConsentSnapshot) {
            lock.lock()
            guard first == nil else {
                lock.unlock()
                return
            }
            first = snapshot
            disk = .object([
                "envelope": .bool(store.data(for: StorageKey.snapshot) != nil),
                "pendingSaves": .bool(store.data(for: StorageKey.pendingSaves) != nil),
                "subject": .bool(store.data(for: StorageKey.subject) != nil),
            ])
            lock.unlock()
        }
    }

    private func runRevisionTrace(_ entry: Index.Entry) async throws {
        let fixture = try loadFixture(entry)
        guard let input = fixture["input"],
              let steps = input["steps"]?.arrayValue,
              let expected = fixture["expected"]?["trace"]?.arrayValue
        else {
            throw Failure.unsupported(fixture: entry.id, detail: "no input.steps or expected.trace")
        }
        let run = try makeRun(entry: entry, input: input)
        await run.core.bootstrapAndSettle(run.config)

        let witness = RevisionWitness()
        let subscription = run.core.onChange(witness)
        var observations: [JSONValue] = []
        var initResponses = 1
        for step in steps {
            let op = step["op"]?.stringValue
            let before = run.core.snapshot().revision
            witness.reset()
            switch op {
            case "init":
                guard let transport = step["transport"] else {
                    throw Failure.unsupported(
                        fixture: entry.id,
                        detail: "step \(step["step"]?.stringValue ?? "?") is an init with no transport"
                    )
                }
                run.http.enqueueInit(try Self.initResponse(from: transport, entry: entry))
                initResponses += 1
                run.core.refresh()
                await run.core.waitUntilIdle()
            case "save":
                run.core.save(try commitIntent(entry: entry, step["intent"] ?? .null))
                await run.core.waitUntilIdle()
            case "dismiss-notice":
                run.core.dismissNotice()
                await run.core.waitUntilIdle()
            case let other:
                throw Failure.unsupported(
                    fixture: entry.id,
                    detail: "op \(other.map { "\($0)" } ?? "nil") has no runner here"
                )
            }
            observations.append(
                .object([
                    "publications": .integer(Int64(witness.count)),
                    "revisionDelta": .integer(Int64(run.core.snapshot().revision - before)),
                    "step": .string(step["step"]?.stringValue ?? ""),
                ])
            )
        }
        subscription.cancel()

        // A step whose init never arrived would score a publication the core did not
        // earn, so the script and the requests have to line up.
        XCTAssertEqual(
            run.http.recordedInitRequests.count,
            initResponses,
            "\(entry.id): the core made \(run.http.recordedInitRequests.count) init requests for a script of \(initResponses). A step that did not reach the transport makes the trace meaningless."
        )
        record(
            for: entry,
            path: "expected.trace",
            expected: .array(expected),
            actual: .array(observations)
        )
    }

    /// Counts snapshot publications, which is all a trace needs from an observer.
    ///
    /// Held strongly by the caller: the core's observer set is weak, so an observer
    /// nobody owns stops being an observer.
    private final class RevisionWitness: SnapshotObserver, @unchecked Sendable {
        private let lock = NSLock()
        private var publications = 0

        var count: Int {
            lock.lock()
            defer { lock.unlock() }
            return publications
        }

        func reset() {
            lock.lock()
            publications = 0
            lock.unlock()
        }

        func consentDidChange(_ snapshot: ConsentSnapshot) {
            lock.lock()
            publications += 1
            lock.unlock()
        }
    }

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

    /// Run a `tc-string` fixture against both halves of the codec.
    ///
    /// Two assertions per fixture, and the fixture itself decides how many of them
    /// are owed. Decoding runs against `expected.encode.tcString`, which is the only
    /// string a fixture carries, and the answer is compared field by field to
    /// `expected.decode.fields`. Encoding runs against `input.model`,
    /// `input.encodingOptions` and `input.vendorList`, and where `expects.encode` is
    /// true the bytes have to be identical -- not equal once projected to a map, which
    /// is the difference between a codec that agrees with web and one that roughly
    /// agrees with it.
    ///
    /// Ten fixtures set `expects.encode` false because the reference encoder cannot
    /// write that shape at all: publisher restrictions need a GVL attached to encode,
    /// `purposeOneTreatment` with a global scope, custom purposes wide enough to make
    /// the string one no CMP publishes. Encoding is skipped there by the fixture's
    /// instruction, and the skip is counted rather than hidden, because ten silent
    /// skips would look exactly like a passing suite.
    private func runTcString(_ entry: Index.Entry) throws {
        let vector = try TcSharedFixtures.vector(id: entry.id)
        XCTAssertEqual(
            vector.file,
            entry.file,
            "\(entry.id): the fixture index and the parsed file disagree about which file this is"
        )
        tcStringEncodeSkipped += vector.expectsEncode ? 0 : 1

        if vector.expectsDecode {
            switch TcStringWireReader.read(vector.expectedTCString) {
            case let .decoded(decoded):
                record(
                    for: entry,
                    path: "expected.decode.fields",
                    expected: TcDecodedFieldReport.canonicalRestrictionOrder(vector.expectedFields),
                    actual: TcDecodedFieldReport.canonicalRestrictionOrder(
                        TcDecodedFieldReport.fields(of: decoded)
                    )
                )
            case let .rejected(reason, message):
                record(
                    for: entry,
                    path: "expected.decode",
                    detail: "the decoder refused a string the reference produced (\(reason.rawValue)): \(message)"
                )
            }
        } else {
            record(for: entry, path: "expects.decode", detail: "the fixture does not expect a decode, so nothing asserted here")
        }

        guard vector.expectsEncode else {
            return
        }
        switch TcStringEncoder.encode(vector.model, vendorList: vector.vendorList, options: vector.options) {
        case let .encoded(produced):
            record(
                for: entry,
                path: "expected.encode.tcString",
                expected: .string(vector.expectedTCString),
                actual: .string(produced)
            )
            let segments = produced.split(separator: ".").map { String($0) }
            record(
                for: entry,
                path: "expected.encode.segments",
                expected: .array(vector.expectedSegments.map { JSONValue.string($0) }),
                actual: .array(segments.map { JSONValue.string($0) })
            )
            record(
                for: entry,
                path: "expected.encode.segmentTypes",
                expected: .array(vector.expectedSegmentTypes.map { JSONValue.integer(Int64($0)) }),
                actual: .array(Self.segmentTypes(of: produced).map { JSONValue.integer(Int64($0)) })
            )
        case let .rejected(reason, message):
            record(
                for: entry,
                path: "expected.encode.tcString",
                detail: "the encoder refused consent state the reference encoded (\(reason.rawValue)): \(message)"
            )
        }
    }

    /// Which segment type each segment of a produced string declares, for a failure
    /// message that names the segment instead of pointing at a base64 difference.
    private static func segmentTypes(of string: String) -> [Int] {
        string.split(separator: ".").enumerated().map { offset, part in
            guard offset > 0, let decoded = TcBase64URL.decode(part) else {
                return 0
            }
            var reader = TcBitReader(bytes: decoded.bytes, bitCount: decoded.bitCount)
            return Int(reader.readUnsigned(TcBitWidth.segmentType) ?? 0)
        }
    }

    // MARK: - Running one fixture

    private struct Run {
        let core: ConsentCore
        let config: CoreConfig
        let http: StubHTTP
        /// What the core has written by the time it is idle. The envelope fixtures
        /// read the stored bytes back out of here rather than trusting that a write
        /// happened.
        let store: InMemoryStore
    }

    /// Build a core that has been handed exactly the fixture input.
    ///
    /// The init response goes in at the HTTP seam, header and status included, so
    /// the contract negotiation is part of the run rather than a fixture that
    /// assumes it. Anything the input carries that this build cannot express is an
    /// error here, not a value dropped on the floor.
    ///
    /// `input.hydrated` decides whether the snapshot slot holds an envelope at all. A
    /// fixture that says `false` is a first launch: the identity slot is filled and the
    /// envelope slot is empty, which is the arrangement the contract keeps them in --
    /// refusing an envelope must never cost a device its identity. Seeding an envelope
    /// regardless would let `hydrate()` latch `ready` on bytes the fixture says are not
    /// there, and the init whose latch is under test would never be asked to produce it.
    private func makeRun(entry: Index.Entry, input: JSONValue) throws -> Run {
        let store = InMemoryStore()
        let http = StubHTTP()
        guard let bootstrapTransport = input["transport"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "input.transport is missing")
        }
        http.enqueueInit(try Self.initResponse(from: bootstrapTransport, entry: entry))
        let config = try makeConfig(entry: entry, input: input, store: store, http: http)

        guard let now = input["now"]?.intValue else {
            throw Failure.unsupported(fixture: entry.id, detail: "input.now is missing")
        }
        if input["hydrated"]?.boolValue ?? true {
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
        } else {
            // The claim has to hold in the store or the fixture proves nothing: a seeded
            // envelope would let `hydrate()` raise `ready` and the init whose latch is
            // under test would never be asked to. Asserted rather than trusted, so a
            // runner that starts seeding again fails loudly instead of passing empty.
            XCTAssertNil(
                store.data(for: StorageKey.snapshot),
                "\(entry.id): hydrated is false but the snapshot slot holds bytes, so hydration and not the init would be what latches `ready`"
            )
        }

        return Run(core: ConsentCore(), config: config, http: http, store: store)
    }

    /// Wire a core to the device half of a fixture: identity, overrides, signals,
    /// clock, and the store it boots over.
    ///
    /// The first launch and a relaunch share this, so the only difference between
    /// them is the store's contents and whether anything answers the transport. A
    /// nil `http` is the offline case, which is what forces a core to answer out of
    /// its own envelope.
    private func makeConfig(
        entry: Index.Entry,
        input: JSONValue,
        store: InMemoryStore,
        http: StubHTTP?
    ) throws -> CoreConfig {
        guard let now = input["now"]?.intValue else {
            throw Failure.unsupported(fixture: entry.id, detail: "input.now is missing")
        }
        guard let subjectId = input["storedRecords"]?["subject"]?["subjectId"]?.stringValue else {
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "storedRecords.subject.subjectId is missing. A fixture that lets the core generate an identity is not deterministic."
            )
        }
        store.set(Data("{\"id\":\"\(subjectId)\"}".utf8), for: StorageKey.subject)

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
        let clock = TestClock(now)
        return CoreConfig(
            store: store,
            transport: http.map { Fixture.transport($0) },
            overrides: overrides,
            user: user,
            gpc: detectedFromFixture,
            now: clock.reading,
            initRetry: .disabled
        )
    }

    // MARK: - Stored envelopes

    /// Every fixture kind this runner has a function for.
    ///
    /// This sits next to the dispatch on purpose. The dispatch fails on a kind it has
    /// no branch for rather than skipping it, so the only way to grow this list is to
    /// write the runner, and the unclaimed count below can only be non-zero when a
    /// kind was added to one place and not the other.
    private static let claimedKinds: Set<String> = [
        "evaluation", "native-envelope", "reset-consent", "revision-trace", "save-body", "tc-string",
        VendorListScopeFixtures.kind,
    ]

    /// Run a `native-envelope` fixture.
    ///
    /// Every case of this kind starts the same way: a core boots over the fixture
    /// input, takes the action, and writes its envelope. The bytes under test have to
    /// be the core's own, because a hand-written envelope would only prove that this
    /// runner and this core agree about a shape nothing is ever stored in.
    ///
    /// Then the two directions split. A write case reads its own bytes back through
    /// its own decoder and asks whether the envelope carries the fields the contract
    /// says it carries, and whether a relaunch with no backend left answers with the
    /// stored decision. A read case breaks the bytes first and asks whether a relaunch
    /// answers the way an empty store does. Reading an envelope halfway would answer
    /// like a returning user, which is a permission invented out of garbage.
    private func runNativeEnvelope(_ entry: Index.Entry) async throws {
        let fixture = try loadFixture(entry)
        guard let input = fixture["input"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "no input")
        }
        guard let expected = fixture["expected"] else {
            throw Failure.unsupported(fixture: entry.id, detail: "no expected")
        }
        guard let subjectId = input["storedRecords"]?["subject"]?["subjectId"]?.stringValue else {
            throw Failure.unsupported(fixture: entry.id, detail: "storedRecords.subject.subjectId is missing")
        }

        let run = try makeRun(entry: entry, input: input)
        await run.core.bootstrapAndSettle(run.config)
        if let action = input["action"], !action.isNull {
            if action["action"]?.stringValue == "dismiss-notice" {
                run.core.dismissNotice()
            } else {
                run.core.save(try commitIntent(entry: entry, action))
            }
            await run.core.waitUntilIdle()
        }
        guard let written = run.store.data(for: StorageKey.snapshot) else {
            record(
                for: entry,
                path: "expected.write",
                detail: "the core never wrote anything under \(StorageKey.snapshot)"
            )
            return
        }

        // Reading back and writing again has to be the identity on the core's own
        // bytes. Anything the round trip drops is a field the next launch never sees.
        guard let decoded = StoredEnvelope.decode(written) else {
            record(
                for: entry,
                path: "expected.write.decoded",
                detail: "the core wrote an envelope that its own decoder refuses, so no expectation about its contents can be checked"
            )
            return
        }
        if let rewritten = try? C15tJSON.encode(decoded), rewritten != written {
            record(
                for: entry,
                path: "expected.write.decoded",
                detail: "decoding the envelope and storing it again turned \(written.count) bytes into \(rewritten.count); the next relaunch loses whatever the rewrite dropped"
            )
        }

        try recordEnvelopeFields(for: entry, fixture: fixture, raw: written)

        if let expectedSnapshot = expected["snapshot"] {
            record(
                for: entry,
                path: "expected.snapshot",
                expected: expectedSnapshot,
                actual: try value(of: decoded.snapshot, entry: entry)
            )
        }
        let live = run.core.snapshot()
        if decoded.snapshot != live {
            record(
                for: entry,
                path: "expected.write.storedSnapshotMatchesLive",
                detail: "the envelope holds revision \(decoded.snapshot.revision) while the session is on \(live.revision): a cold start would answer with state the running core has already left behind"
            )
        }

        let defect = input["defect"]
        let bytes = try defect.flatMap {
            try Self.defectiveBytes($0, from: written, entry: entry)
        } ?? written
        let offline = try await relaunch(
            entry: entry,
            input: input,
            subjectId: subjectId,
            bytes: bytes
        )
        if let decision = expected["relaunch"]?["decision"] {
            record(
                for: entry,
                path: "expected.relaunch.decision",
                expected: decision,
                actual: offline.decision
            )
        }

        guard expected["read"].map({ !$0.isNull }) ?? false else { return }
        // `stored: false` is the same claim as `decoded: false` seen from the other
        // side: hydration restored nothing, so the core behaves as though the item
        // were empty. `hasStoredSnapshot` cannot carry it, because hydrating over
        // unreadable bytes still persists the deny-all snapshot it settled on.
        if StoredEnvelope.decode(bytes) != nil {
            record(
                for: entry,
                path: "expected.read.decoded",
                detail: "the core decoded bytes the fixture says are unreadable, so whatever it restored came from a shape the contract does not have"
            )
        }
        let fresh = try await relaunch(
            entry: entry,
            input: input,
            subjectId: subjectId,
            bytes: nil
        )
        if !matches(offline.snapshot, fresh.snapshot) {
            record(
                for: entry,
                path: "expected.read.identicalToFreshInstall",
                detail: "unreadable bytes left the core answering something an empty store does not: \(difference(between: fresh.snapshot, and: offline.snapshot))"
            )
        }
    }

    /// A core booted over `bytes` with nothing on the other end of the transport.
    ///
    /// Passing no `StubHTTP` at all is the point: with no answer coming, the snapshot
    /// can only be the one the envelope supplied, which is the only thing an envelope
    /// is for. `bytes: nil` is the same device with an empty store, and the two are
    /// supposed to be indistinguishable when the bytes are unreadable.
    private func relaunch(
        entry: Index.Entry,
        input: JSONValue,
        subjectId: String,
        bytes: Data?
    ) async throws -> Relaunch {
        let store = InMemoryStore()
        if let bytes {
            store.set(bytes, for: StorageKey.snapshot)
        }
        let config = try makeConfig(entry: entry, input: input, store: store, http: nil)
        let core = ConsentCore()
        await core.bootstrapAndSettle(config)
        return Relaunch(core: core, snapshot: try snapshotJSON(core))
    }

    /// A relaunch, plus what it answers.
    private struct Relaunch {
        let core: ConsentCore
        let snapshot: JSONValue

        /// What a gate on the device is told, category by category.
        ///
        /// Read through `isAllowed` rather than the snapshot's permission map, because
        /// that is the call an ad SDK actually makes and it is the stricter of the two
        /// while a policy is outstanding.
        var decision: JSONValue {
            var allowed: [String: JSONValue] = [:]
            for category in ConsentCategory.allCases {
                allowed[category.rawValue] = .bool(core.isAllowed(category))
            }
            let state = core.snapshot()
            return .object([
                "allowed": .object(allowed),
                "policyPending": .bool(state.policyPending),
                "ready": .bool(state.ready),
            ])
        }
    }

    /// Check the stored field set against the field set the fixture declares.
    ///
    /// The names come from the fixture's `carriers` map rather than from literals
    /// here, so the shared file owns the field set and this runner only contributes
    /// the spelling this core happens to use. A field with no entry for this core is
    /// one it does not carry at all, which `native/CONTRACT.md` records as a
    /// difference between the two implementations rather than a defect.
    private func recordEnvelopeFields(
        for entry: Index.Entry,
        fixture: JSONValue,
        raw: Data
    ) throws {
        let stored = try Self.jsonObject(raw, entry: entry)
        for field in fixture["fields"]?.arrayValue ?? [] {
            guard let key = field["key"]?.stringValue,
                  let name = field["carriers"]?["swift"]?.stringValue,
                  let expect = field["expect"]
            else { continue }
            let path = "expected.fields.\(key)"
            let required = field["requiredBy"]?.arrayValue?.contains {
                $0.stringValue == "swift"
            } ?? false
            let value = stored[name]
            // A field the fixture expects to be empty may legitimately be missing.
            // `Codable`'s synthesized encoder drops a nil property rather than
            // writing `"field":null`, so demanding the key back would test the
            // encoder's optionality instead of the contract.
            if required, value == nil, expect != .string("empty") {
                record(
                    for: entry,
                    path: path,
                    detail: "the envelope carries no `\(name)` key, which the fixture says this core always writes"
                )
                continue
            }
            switch expect {
            case .string("present"):
                if value == nil || value?.isNull == true {
                    record(
                        for: entry,
                        path: path,
                        detail: "expected a `\(name)` the core actually filled in, and the envelope holds \(value.map { render($0) } ?? "nothing")"
                    )
                }
            case .string("empty"):
                if let value, !value.isNull {
                    record(
                        for: entry,
                        path: path,
                        detail: "expected `\(name)` to be absent or null, and the envelope holds \(render(value))"
                    )
                }
            default:
                if !matches(expect, value ?? .null) {
                    record(
                        for: entry,
                        path: path,
                        detail: "expected \(render(expect)), and the envelope holds \(value.map { render($0) } ?? "nothing")"
                    )
                }
            }
        }
    }

    /// Break a valid envelope the way the named defect describes.
    ///
    /// The defects are operations rather than literal bytes because the base envelope
    /// is only valid for the core that wrote it, and that core is the one being
    /// tested. Only `foreign-wire` ships bytes, and it ships someone else's.
    private static func defectiveBytes(
        _ defect: JSONValue,
        from written: Data,
        entry: Index.Entry
    ) throws -> Data {
        switch defect["kind"]?.stringValue {
        case "unknown-field":
            var tree = try jsonObject(written, entry: entry)
            guard let name = defect["addField"]?.stringValue else {
                throw Failure.unsupported(fixture: entry.id, detail: "an unknown-field defect names no field")
            }
            tree[name] = defect["value"] ?? .bool(true)
            return try encodeValue(.object(tree), entry: entry)

        case "truncate":
            // Everything from the last comma onwards is gone: a writer interrupted
            // halfway through its final field. What is left is a prefix of a real
            // grant, which is exactly the trap.
            guard let cut = written.lastIndex(of: UInt8(ascii: ",")) else {
                throw Failure.unsupported(
                    fixture: entry.id,
                    detail: "the envelope this core wrote holds no comma, so there is no write to cut short here"
                )
            }
            return Data(written[..<cut])

        case "pre-correction":
            // The same facts in the shape the first draft of native/CONTRACT.md
            // described: `test` as an override, and `gpc`/`msa` as a boolean pair.
            var tree = try jsonObject(written, entry: entry)
            var snapshot = tree["snapshot"]?.objectValue ?? [:]
            let overrides = snapshot["overrides"]?.objectValue ?? [:]
            snapshot["overrides"] = .object([
                "country": overrides["country"] ?? .null,
                "gpc": .bool(overrides["gpc"]?.boolValue ?? false),
                "language": overrides["language"] ?? .string("en"),
                "region": overrides["region"] ?? .null,
                "test": .bool(false),
            ])
            let active = snapshot["privacySignals"]?["gpc"]?["active"]?.boolValue ?? false
            snapshot["privacySignals"] = .object([
                "gpc": .bool(active),
                "msa": .bool(false),
            ])
            tree["snapshot"] = .object(snapshot)
            return try encodeValue(.object(tree), entry: entry)

        case "foreign-wire":
            guard let text = defect["envelope"]?.stringValue else {
                throw Failure.unsupported(fixture: entry.id, detail: "a foreign-wire defect carries no envelope")
            }
            return Data(text.utf8)

        case let other:
            throw Failure.unsupported(
                fixture: entry.id,
                detail: "defect \(other.map { "\($0)" } ?? "nil") has no runner here"
            )
        }
    }

    private static func jsonObject(_ data: Data, entry: Index.Entry) throws -> [String: JSONValue] {
        guard let parsed = C15tJSON.parse(data), case let .object(fields) = parsed else {
            throw Failure.unsupported(fixture: entry.id, detail: "the stored envelope is not a JSON object")
        }
        return fields
    }

    private static func encodeValue(_ value: JSONValue, entry: Index.Entry) throws -> Data {
        guard let data = C15tJSON.encode(value) else {
            throw Failure.unsupported(fixture: entry.id, detail: "the envelope would not encode")
        }
        return data
    }

    private func value(of snapshot: ConsentSnapshot, entry: Index.Entry) throws -> JSONValue {
        guard let data = try? C15tJSON.encode(snapshot), let value = C15tJSON.parse(data) else {
            throw Failure.unsupported(fixture: entry.id, detail: "the stored snapshot did not serialize to JSON")
        }
        return value
    }

    /// Name what two snapshots disagree about, for a failure message.
    private func difference(between expected: JSONValue, and actual: JSONValue) -> String {
        var diffs: [Diff] = []
        collectDiffs(
            expected: expected,
            actual: actual,
            path: "snapshot",
            extraFieldsAllowedUnder: [],
            into: &diffs
        )
        guard !diffs.isEmpty else { return "the two differ somewhere the walker cannot see" }
        return diffs.map { "\($0.path): \($0.detail)" }.joined(separator: "; ")
    }

    private func snapshotJSON(_ core: ConsentCore) throws -> JSONValue {
        try snapshotJSON(core.snapshot())
    }

    private func snapshotJSON(_ snapshot: ConsentSnapshot) throws -> JSONValue {
        guard let value = C15tJSON.parse(try C15tJSON.encode(snapshot)) else {
            throw Failure.unsupported(fixture: "core", detail: "the snapshot did not serialize to JSON")
        }
        return value
    }

    /// Turn a fixture `transport` into the response a transport double serves.
    ///
    /// Status and headers go through untouched, because the contract declaration is
    /// the thing under test in the revision trace: a body served under a contract
    /// this build does not speak is not evidence, and a runner that normalised the
    /// header away would hide that.
    private static func initResponse(
        from transport: JSONValue,
        entry: Index.Entry
    ) throws -> HTTPResponse {
        guard let body = transport["body"], let bodyData = C15tJSON.encode(body) else {
            throw Failure.unsupported(fixture: entry.id, detail: "transport.body is missing")
        }
        var headers: [String: String] = [:]
        for (name, value) in transport["headers"]?.objectValue ?? [:] {
            guard let text = value.stringValue else {
                throw Failure.unsupported(
                    fixture: entry.id,
                    detail: "transport.headers.\(name) is not a string"
                )
            }
            headers[name] = text
        }
        return HTTPResponse(
            status: Int(transport["status"]?.intValue ?? 200),
            headers: headers,
            body: bodyData
        )
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

    /// How many tc-string fixtures told the runner not to encode, counted during the
    /// run so the printed claim line can name what it is not claiming.
    private var tcStringEncodeSkipped = 0

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
        // A wipe is a committed mutation, so it publishes current + 1, and the delta the
        // fixture pins is asserted by its runner. Where the device's counting started is the
        // half `native/CONTRACT.md` leaves to each core, so the absolute runs ahead here for
        // the same reason every other fixture's does.
        ("reset-consent-opt-in-grants", "expected.baseline.snapshot", [.revision]),
        ("reset-consent-opt-in-grants", "expected.afterInit.snapshot", [.revision]),
        ("reset-consent-recorded-denial", "expected.baseline.snapshot", [.revision]),
        ("reset-consent-recorded-denial", "expected.afterInit.snapshot", [.revision]),
        ("evaluation-eu-opt-in", "expected.snapshot", [.revision]),
        ("evaluation-us-ccpa-opt-out", "expected.snapshot", [.revision]),
        ("evaluation-no-rule-matched", "expected.snapshot", [.revision]),
        ("evaluation-gpc-signal-present", "expected.snapshot", [.directives, .restrictionMarketing, .restrictionMeasurement]),
        ("evaluation-notice-pending", "expected.snapshot", [.revision]),
        ("evaluation-eu-explicit-grants", "expected.snapshot", [.revision]),
        ("evaluation-eu-partial-denials", "expected.snapshot", [.revision]),
        ("evaluation-notice-dismissed", "expected.snapshot", [.revision]),
        // A first launch has no envelope to hydrate, so `ready` can only arrive with the
        // init -- and it does. The revision runs ahead here for the same reason as every
        // other evaluation row: hydrate() takes one even from an empty store.
        ("evaluation-eu-fresh-install", "expected.snapshot", [.revision]),
        ("evaluation-us-ccpa-fresh-install", "expected.snapshot", [.revision]),
        ("save-body-all", "expected.snapshotBefore", [.revision]),
        ("save-body-all", "expected.snapshotAfter", [.revision]),
        ("save-body-necessary", "expected.snapshotBefore", [.revision]),
        ("save-body-necessary", "expected.snapshotAfter", [.revision]),
        ("save-body-explicit-partial", "expected.snapshotBefore", [.revision]),
        ("save-body-explicit-partial", "expected.snapshotAfter", [.revision]),
        ("save-body-ccpa-gpc", "expected.snapshotBefore", [.directives, .restrictionMarketing, .restrictionMeasurement]),
        ("save-body-ccpa-gpc", "expected.snapshotAfter", [.directives, .restrictionMarketing, .restrictionMeasurement, .deadline]),
        // The stored snapshot of a `native-envelope` write case is the same snapshot
        // an evaluation fixture asserts after the same action, so it runs one ahead
        // for the same reason. The read cases assert no snapshot: their bytes are
        // supposed to yield nothing, and they are checked against an empty store.
        ("native-envelope-opt-in-grants", "expected.snapshot", [.revision]),
        ("native-envelope-partial-denials", "expected.snapshot", [.revision]),
        ("native-envelope-notice-dismissed", "expected.snapshot", [.revision]),
        ("native-envelope-opt-out-grants", "expected.snapshot", [.deadline, .revision]),
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
