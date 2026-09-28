import Foundation
import C15tCore

// Measures the budgets in `native/CONTRACT.md` and prints numbers. Nothing here is
// a claim: every line is a measured distribution, and a budget that is not met
// prints OVER rather than being left out.

// MARK: - Canned backend

/// A backend that answers the same way every time, without a socket.
struct StubHTTP: HTTPTransport {
    let body: Data
    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        HTTPResponse(
            status: 200,
            headers: ["x-c15t-policy-contract": "1"],
            body: body
        )
    }
}

/// Fails every delivery, which is the case the 50 ms commit budget is about.
struct DeadTransport: C15tTransport {
    let domain: String = "consent.example.com"
    func performInit(_ context: InitContext) async -> Result<InitResponse, C15tError> {
        .failure(.offline)
    }

    func sendSave(_ body: Data) async -> Result<Void, C15tError> {
        .failure(.offline)
    }

    func patchIdentity(
        subjectId: String,
        externalId: String,
        identityProvider: String?
    ) async -> Result<Void, C15tError> {
        .failure(.offline)
    }
}

/// A realistic opt-out policy for Germany, with the fields a real `/init` sends.
let policyWire = """
{
  "version": 1,
  "status": "matched",
  "policyId": "de-optout",
  "matchedBy": "country",
  "fingerprints": {
    "policy": "b4e1a2c3d5f60718293a4b5c6d7e8f9012345678901234567890123456789abcd",
    "choice": "9f2c6d1e0a3b7c5d8e4f2a1b6c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d",
    "notice": "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091"
  },
  "policy": {
    "id": "de-optout",
    "model": "opt-out",
    "prompt": "choice",
    "scope": ["experience", "functionality", "marketing", "measurement"],
    "scopeMode": "strict",
    "preselectedCategories": ["functionality"],
    "actions": {
      "allowed": ["accept", "customize", "reject"],
      "equivalent": [["accept", "reject"]],
      "required": ["accept", "reject"]
    },
    "rights": ["disclosure", "opt-out", "preferences"],
    "validity": { "choiceMs": 31536000000, "noticeMs": 31536000000 },
    "privacySignals": { "gpc": { "denyCategories": ["marketing"] } },
    "proof": { "storeIp": false, "storeUserAgent": false, "storeLanguage": true },
    "copyRevision": "2026-09-01"
  }
}
"""

let initBody = """
{
  "policyResolution": \(policyWire),
  "location": { "country": "DE", "region": "BE", "language": "de" },
  "policySnapshotToken": "pst_01J9ZQ8H7G6F5E4D3C2B1A098765",
  "resolvedOverrides": { "country": "DE", "region": "BE", "language": "de", "gpc": false },
  "resolvedPrivacySignals": { "gpc": false },
  "translations": {
    "language": "de",
    "translations": {
      "banner": {
        "title": "Ihre Privatsphäre",
        "message": "Wir verwenden Cookies, um diese Website bereitzustellen.",
        "accept": "Alle akzeptieren",
        "reject": "Notwendige nur"
      }
    }
  }
}
""".data(using: .utf8)!

let clock = TestClock(milliseconds: 1_758_100_000_000)

/// A clock the bench can read without a syscall per call site.
final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Int64

    init(milliseconds: Int64) {
        value = milliseconds
    }

    var now: Int64 {
        lock.lock()
        defer { lock.unlock() }
        return value
    }

    var reading: @Sendable () -> Int64 {
        { self.now }
    }
}

// MARK: - Timing

struct Timing {
    let samples: [Double]

    init(_ samples: [Double]) {
        self.samples = samples
    }

    var count: Int { samples.count }
    var fastest: Double { samples.min() ?? 0 }
    var slowest: Double { samples.max() ?? 0 }
    var mean: Double { samples.isEmpty ? 0 : samples.reduce(0, +) / Double(samples.count) }

    func percentile(_ fraction: Double) -> Double {
        guard !samples.isEmpty else { return 0 }
        let sorted = samples.sorted()
        let index = min(sorted.count - 1, Int((Double(sorted.count) * fraction).rounded(.up)))
        return sorted[max(0, index)]
    }
}

func measure(
    iterations: Int,
    warmup: Int = 0,
    body: (Int) throws -> Void
) rethrows -> Timing {
    var samples: [Double] = []
    samples.reserveCapacity(iterations)
    for index in 0..<(iterations + warmup) {
        let start = DispatchTime.now().uptimeNanoseconds
        try body(index)
        let end = DispatchTime.now().uptimeNanoseconds
        if index >= warmup {
            samples.append(Double(end - start) / 1_000.0)
        }
    }
    return Timing(samples)
}

func report(
    _ label: String,
    _ timing: Timing,
    unit: String,
    budget: Double? = nil,
    use: String? = nil
) {
    var line = String(
        format: "%-46@ n=%-6d mean %@=%8.2f  p50=%8.2f  p95=%8.2f  max=%9.2f",
        label as NSString,
        timing.count,
        unit as NSString,
        timing.mean,
        timing.percentile(0.5),
        timing.percentile(0.95),
        timing.slowest
    )
    if let budget {
        let worst = timing.percentile(0.95)
        line += worst <= budget ? "  (budget \(budget), OK)" : "  (budget \(budget), OVER)"
    }
    print(line)
    if let use {
        print("  \(use)")
    }
}

func section(_ title: String) {
    print("\n\(title)")
    print(String(repeating: "-", count: title.count))
}

// MARK: - Setup

/// Run one real bootstrap against a canned backend so a store holds exactly the
/// envelope a shipped app would have written.
///
/// Every section that measures a consent action needs this: with an empty store
/// there is no policy, `save` refuses before the queue write, and the number
/// printed is the cost of a rejection.
@discardableResult
func seed(_ store: any ConsentStore) -> any ConsentStore {
    let seeder = ConsentCore()
    seeder.bootstrap(CoreConfig(
        store: store,
        transport: HostedTransport(
            baseURL: URL(string: "https://consent.example.com")!,
            client: StubHTTP(body: initBody)
        ),
        now: clock.reading
    ))
    // Wait for init, so the stored envelope carries a resolved policy.
    wait { seeder.snapshot().resolution.status == .matched }
    return store
}

func makeStore() -> InMemoryStore {
    let store = InMemoryStore()
    seed(store)
    return store
}

func wait(
    until condition: () -> Bool,
    timeoutMs: Int = 2_000
) {
    let deadline = Date().addingTimeInterval(Double(timeoutMs) / 1_000)
    while !condition(), Date() < deadline {}
}

print("C15tCore benchmarks")
print("reference: Apple silicon, in-process; budgets from native/CONTRACT.md")

let seedStore = makeStore()
let seededEnvelopeBytes = seedStore.data(for: "com.c15t.snapshot").map { Double($0.count) } ?? 0
print("stored envelope: \(Int(seededEnvelopeBytes)) bytes")

// MARK: - hydrate-from-store

section("hydrate-from-store  (budget 3 ms for a realistic payload)")
let hydrateTiming = measure(iterations: 300, warmup: 20) { _ in
    let core = ConsentCore()
    core.bootstrap(CoreConfig(store: seedStore, now: clock.reading, initRetry: .disabled))
}
report("bootstrap + hydrate, stored envelope", hydrateTiming, unit: "µs", budget: 3_000)

section("bootstrap() to first synchronous snapshot()")
let cold = ConsentCore()
let coldStore = makeStore()
let coldTiming = measure(iterations: 1) { _ in
    cold.bootstrap(CoreConfig(store: coldStore, now: clock.reading, initRetry: .disabled))
    _ = cold.snapshot()
}
report("cold (first touch this process)", coldTiming, unit: "µs", budget: 15_000)
report(
    "warm (repeat hydrate)",
    hydrateTiming,
    unit: "µs",
    budget: 5_000,
    use: "same measurement as above, against the 5 ms warm budget"
)
let coldSnapshot = cold.snapshot()
print(
    "  first snapshot after cold bootstrap: ready=\(coldSnapshot.ready) "
        + "policyPending=\(coldSnapshot.policyPending) "
        + "marketing=\(coldSnapshot.effectivePermissions.marketing)"
)

// MARK: - policy evaluation

section("policy evaluation  (wire already parsed, records in, permissions out)")
// The fingerprints the canned policy declares. Written down rather than read off
// the resolved value, so a receipt here is built the way a real one is: against
// the prompt currency the subject saw.
let choiceFingerprint =
    "9f2c6d1e0a3b7c5d8e4f2a1b6c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d"
let noticeFingerprint =
    "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091"
let resolved = resolvedPolicyForBench(
    choiceFingerprint: choiceFingerprint,
    noticeFingerprint: noticeFingerprint
)
let choice = ExplicitChoice(categories: [
    .functionality: CategoryDecision(
        value: true,
        confirmedAt: clock.now - 86_400_000,
        basis: .choiceV1(fingerprint: choiceFingerprint)
    ),
    .marketing: CategoryDecision(
        value: false,
        confirmedAt: clock.now - 86_400_000,
        basis: .choiceV1(fingerprint: choiceFingerprint)
    ),
])
let evaluationTiming = measure(iterations: 20_000, warmup: 500) { _ in
    let outcome = PolicyEvaluator.evaluate(
        resolved,
        choice: choice,
        noticeDismissal: nil,
        optOutDirectives: [],
        gpcActive: false,
        now: clock.now
    )
    blackHole(outcome.permissions.marketing)
}
report(
    "evaluate, 4 categories + receipts",
    evaluationTiming,
    unit: "µs",
    budget: 50,
    use: "excludes wire parsing, which the hydrate number above already pays for"
)

// MARK: - snapshot() / isAllowed()

section("snapshot() and isAllowed()  (must be synchronous reads)")
let readCore = ConsentCore()
readCore.bootstrap(CoreConfig(store: seedStore, now: clock.reading, initRetry: .disabled))
let snapshotTiming = measure(iterations: 500_000, warmup: 10_000) { _ in
    blackHole(readCore.snapshot().effectivePermissions.marketing)
}
report(
    "snapshot()",
    snapshotTiming,
    unit: "µs",
    use: "no new snapshot is built per call: the stored value is read under a lock"
)
let allowedTiming = measure(iterations: 500_000, warmup: 10_000) { _ in
    blackHole(readCore.isAllowed(.marketing))
}
report("isAllowed(.marketing)", allowedTiming, unit: "µs")

// MARK: - save acknowledge, no network

section("consent action to native commit acknowledged, no network  (budget 50 ms)")
let memorySaveCore = ConsentCore()
memorySaveCore.bootstrap(CoreConfig(
    store: seedStore,
    transport: DeadTransport(),
    now: clock.reading,
    initRetry: .disabled
))
let memorySaveTiming = measure(iterations: 500, warmup: 25) { _ in
    let result = memorySaveCore.save(.all)
    blackHole(result.status)
}
report("save(.all), in-memory store", memorySaveTiming, unit: "µs", budget: 50_000)

let directory = FileManager.default.temporaryDirectory
    .appendingPathComponent("c15t-bench-\(UUID().uuidString)", isDirectory: true)
let fileStore = FileStore(directory: directory)
seed(fileStore)
let fileSaveCore = ConsentCore()
fileSaveCore.bootstrap(CoreConfig(
    store: fileStore,
    transport: DeadTransport(),
    now: clock.reading,
    initRetry: .disabled
))
let fileSaveTiming = measure(iterations: 200, warmup: 10) { _ in
    let result = fileSaveCore.save(.custom([.measurement: true]))
    blackHole(result.status)
}
report(
    "save(.custom), FileStore + dead transport",
    fileSaveTiming,
    unit: "µs",
    budget: 50_000,
    use: "includes the persist-before-send write, which is the cost being budgeted"
)
wait { fileSaveCore.pendingSaveCount() == 20 }
print(
    "  queued payloads after the run: \(fileSaveCore.pendingSaveCount()) of 200 actions "
        + "(cap 20, oldest dropped), all still waiting on the dead transport"
)
try? FileManager.default.removeItem(at: directory)

// MARK: - queue replay

section("pending queue replay, transport already failed once")
let queueCore = ConsentCore()
let queueStore = makeStore()
queueCore.bootstrap(CoreConfig(
    store: queueStore,
    transport: DeadTransport(),
    now: clock.reading,
    initRetry: .disabled
))
for _ in 0..<10 {
    queueCore.save(.all)
}
wait { queueCore.pendingSaveCount() == 10 }
let replayTiming = measure(iterations: 200, warmup: 10) { _ in
    blackHole(queueCore.pendingSaveBodies().count)
}
report(
    "read 10 queued bodies",
    replayTiming,
    unit: "µs",
    use: "replay sends these bytes verbatim; nothing is re-encoded"
)
print("  bodies held: \(queueCore.pendingSaveBodies().count), cap 20, oldest dropped first")

print("\nDone.")

/// Keeps a measured value from being optimized away.
func blackHole<T>(_ value: T) {
    withExtendedLifetime(value) {}
}

func resolvedPolicyForBench(
    choiceFingerprint: String,
    noticeFingerprint: String
) -> ResolvedPolicy {
    ResolvedPolicy(
        resolution: PolicyResolutionInfo(
            status: .matched,
            policyId: "de-optout",
            fingerprint: "b4e1a2c3d5f60718293a4b5c6d7e8f9012345678901234567890123456789abcd"
        ),
        policy: EvaluationPolicy(
            model: .optOut,
            prompt: .choice,
            scope: [.experience, .functionality, .marketing, .measurement],
            scopeMode: .strict,
            gpcDenyCategories: [.marketing],
            choiceMaxAgeMs: 31_536_000_000,
            noticeMaxAgeMs: 31_536_000_000
        ),
        choiceFingerprint: choiceFingerprint,
        noticeFingerprint: noticeFingerprint
    )
}
