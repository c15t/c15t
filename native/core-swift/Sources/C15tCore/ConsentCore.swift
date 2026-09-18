import Foundation

/// Retry policy for a failed init. The first call is attempt 1.
public struct InitRetry: Sendable, Equatable {
    public var maxAttempts: Int
    public var baseDelayMs: UInt64
    public var maxDelayMs: UInt64

    public init(maxAttempts: Int = 5, baseDelayMs: UInt64 = 1_000, maxDelayMs: UInt64 = 30_000) {
        self.maxAttempts = maxAttempts
        self.baseDelayMs = baseDelayMs
        self.maxDelayMs = maxDelayMs
    }

    /// Exponential backoff from `baseDelayMs`, capped at `maxDelayMs`.
    func delay(afterAttempt attempt: Int) -> UInt64 {
        guard attempt > 0 else { return baseDelayMs }
        let shifted = baseDelayMs << min(UInt64(attempt), 16)
        return min(shifted == 0 ? maxDelayMs : shifted, maxDelayMs)
    }

    public static let disabled = InitRetry(maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0)
}

/// Everything `bootstrap` needs. Pure data: nothing runs at construction.
public struct CoreConfig: @unchecked Sendable {
    /// Where the two protected items live.
    public let store: any ConsentStore
    /// `nil` makes the async commands no-ops, which is what an embedded or
    /// preview build wants. Use ``C15tTransport/offline()`` instead when the
    /// device is merely unreachable, so saves queue up for later.
    public let transport: (any C15tTransport)?
    /// Categories to offer. `nil` uses the full policy scope.
    public let consentCategories: [ConsentCategory]?
    public let overrides: ConsentOverrides
    public let user: KernelUser?
    /// The Global Privacy Control signal as the host app reports it.
    ///
    /// There is no user-agent GPC flag to read natively, so the value has to come
    /// from wherever the signal actually lives: a `WKWebView`'s
    /// `isGlobalPrivacyControlEnabled`, an equivalent Android check, or the React
    /// Native layer. `nil` means the host has no signal, which is not the same
    /// answer as `false`. Publisher test mode is a different switch and never
    /// stands in for this one.
    public let gpc: Bool?
    /// Evaluation clock in epoch milliseconds. Injectable so a test can put the
    /// clock anywhere it needs without waiting for it.
    public let now: @Sendable () -> Int64
    public let initRetry: InitRetry?
    /// Replay the offline queue at the end of bootstrap. On by default: the
    /// contract lists launch as a retry trigger, and bootstrap is launch.
    public let flushPendingOnBootstrap: Bool

    public init(
        store: any ConsentStore = InMemoryStore(),
        transport: (any C15tTransport)? = nil,
        consentCategories: [ConsentCategory]? = nil,
        overrides: ConsentOverrides = .default(),
        user: KernelUser? = nil,
        gpc: Bool? = nil,
        now: @escaping @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1_000) },
        initRetry: InitRetry? = InitRetry(),
        flushPendingOnBootstrap: Bool = true
    ) {
        self.store = store
        self.transport = transport
        self.consentCategories = consentCategories
        self.overrides = overrides
        self.user = user
        self.gpc = gpc
        self.now = now
        self.initRetry = initRetry
        self.flushPendingOnBootstrap = flushPendingOnBootstrap
    }
}

/// The native consent kernel.
///
/// A final class rather than an actor, because ``snapshot()`` and
/// ``isAllowed(_:)`` are synchronous and called from ad SDKs on the main thread.
/// An actor would turn both into suspending calls, which is exactly what the
/// contract forbids. Thread safety is one lock over in-memory state, and the
/// shape of ``Lock/withLock(_:)`` keeps that lock off every disk and network path:
/// mutations happen under it, I/O happens after it is released.
///
/// State is a single immutable ``ConsentSnapshot``. Anything that reads it takes a
/// copy of a value nobody can change underneath, so there is no torn read and no
/// need for a read lock beyond the pointer swap.
public final class ConsentCore: @unchecked Sendable {
    // MARK: - Mutable state, guarded by `lock`

    private let lock = Lock()
    private var currentSnapshot = ConsentSnapshot.coldStart
    private var bootstrapped = false
    private var config: CoreConfig?
    private var queue: PendingSaveQueue?
    private var identity: SubjectIdentity?
    private var resolvedPolicy: ResolvedPolicy?
    private var policyWire: JSONValue?
    private var noticeDismissal: NoticeDismissal?
    private var user: KernelUser?
    private var overrides = ConsentOverrides.default()
    /// The overrides the host configured, as opposed to the ones the snapshot carries.
    ///
    /// They stop being the same value the moment an init lands: ``applyInit(_:)`` folds the
    /// country and region the backend matched on into ``overrides``, which is what a save
    /// has to be sent against. So that copy claims a geography the app never asked for,
    /// and the host's own pin only survives on its own here. ``reset()`` needs the
    /// distinction: a wipe deletes the policy resolution, and a location that came out of
    /// it goes with it, while a country pinned for QA has to stay.
    private var configuredOverrides = ConsentOverrides.default()
    private var detectedGPC = false
    /// Highest revision already written to the store, so a slow write of an older
    /// envelope cannot land on top of a newer one.
    private var persistedRevision = 0
    /// Whether the last ``hydrate()`` found an envelope on disk. Backs
    /// ``hasStoredSnapshot``, which a binding layer reports in its handshake.
    private var restoredFromStore = false
    private var inFlightWork = 0
    private var idleWaiters: [CheckedContinuation<Void, Never>] = []
    /// Whether a delivery pass currently holds this core, and whether another has
    /// been asked for in the meantime. Both are in-memory flags on the core's own
    /// lock, and only ``requestDeliveryPass(ownSend:)`` and its bookkeeping helpers
    /// read them. See "The pending save queue" in `native/CONTRACT.md`.
    private var deliveryPassInFlight = false
    private var deliveryPassRequested = false
    /// Strong holds on per-category gate subscriptions, keyed by identity. The
    /// observer set itself stays weak, as the contract requires. Holds both gate
    /// flavours: the boolean one ``gate(_:_:)`` and the decision-carrying
    /// ``ConsentCore/gate(_:_:)`` overload, whose only owner would otherwise be a
    /// closure no one else retains.
    private var gateSubscriptions: [ObjectIdentifier: any SnapshotObserver] = [:]

    // MARK: - Collaborators

    private let events = EventHub()
    private let observers = ObserverSet()

    public init() {}

    // MARK: - Bootstrap

    /// Start the kernel. Idempotent and safe to call from any launch hook,
    /// including several of them, which is what a library that can be installed by
    /// both a Swift app and a React Native bridge has to tolerate.
    ///
    /// Hydration runs synchronously so that the first ``snapshot()`` after this
    /// returns already reflects stored consent with no network. The init request is
    /// what happens afterwards.
    public func bootstrap(_ config: CoreConfig) {
        let adopted = lock.withLock {
            guard !bootstrapped else { return false }
            bootstrapped = true
            self.config = config
            self.overrides = config.overrides
            self.configuredOverrides = config.overrides
            self.user = config.user
            self.queue = PendingSaveQueue(store: config.store, now: config.now)
            return true
        }
        // A second call is a no-op, not an error: re-adopting a store mid-session
        // would silently orphan the subject id.
        guard adopted else { return }

        hydrate()
        events.emit(.initialized)

        if config.flushPendingOnBootstrap {
            schedule { await self.requestDeliveryPass(ownSend: nil) }
        }
        scheduleInit(attempt: 1)
    }

    /// Whether ``bootstrap(_:)`` has taken effect.
    public var isBootstrapped: Bool {
        lock.withLock { bootstrapped }
    }

    /// Whether a flush request is waiting to be answered by the pass that holds the
    /// core.
    ///
    /// A test seam rather than a host API. ``flushPending()`` only asks, so a test
    /// that has to prove a second request arrived *while a send was still open* needs
    /// to see the request being recorded; without it the only evidence available is
    /// that a duplicate POST did not show up, which a slow scheduler fakes perfectly
    /// well.
    package var hasWaitingDeliveryPassRequest: Bool {
        lock.withLock { deliveryPassRequested }
    }

    /// The overrides in force, whether or not a policy has resolved.
    ///
    /// A binding layer merges a partial override document against this rather than
    /// against ``ConsentSnapshot/overrides``, because the snapshot only carries the
    /// context a policy was evaluated against: while ``ConsentSnapshot/policyPending``
    /// is set, nothing has been evaluated, and merging against a snapshot that has not
    /// caught up would drop the values an earlier call set.
    public var currentOverrides: ConsentOverrides {
        lock.withLock { overrides }
    }

    /// Whether consent state exists on disk: either hydration restored an envelope
    /// or this session has persisted one since.
    ///
    /// A binding layer reports this in its handshake so JavaScript can tell "cold
    /// install, nothing stored" apart from "returning user, cached consent", which
    /// is the difference between showing a banner at first frame and waiting for the
    /// network to say the same thing. Reads stay synchronous either way.
    ///
    /// Deliberately not the same as ``ConsentSnapshot/ready``: `ready` says hydration
    /// completed against a store, and stays `false` for the whole session after a
    /// cold hydrate even once the first save has been written.
    public var hasStoredSnapshot: Bool {
        lock.withLock { restoredFromStore || persistedRevision > 0 }
    }

    // MARK: - Reads

    /// The current state. Synchronous, and never touches disk or the network.
    public func snapshot() -> ConsentSnapshot {
        lock.withLock { currentSnapshot }
    }

    /// The vendor list this device last was served, for a host app's own Swift code.
    ///
    /// The same value the React Native boundary reads at `snapshot.iab.gvl`, read off
    /// the same snapshot, so a dialog rendered natively and a dialog rendered in
    /// JavaScript cannot end up describing different vendors. Synchronous, and it never
    /// fetches: `nil` means no `/init` has served a list this build could read, which is
    /// the normal answer for every policy that is not `iab`.
    public func globalVendorList() -> GlobalVendorList? {
        lock.withLock { currentSnapshot.iab?.gvl }
    }

    /// Whether processing in `category` is permitted right now.
    ///
    /// Synchronous, and never touches disk or the network. While hydration or the
    /// policy is still outstanding this answers `false` for every optional
    /// category, whichever way the eventual default lands.
    public func isAllowed(_ category: ConsentCategory) -> Bool {
        lock.withLock {
            let state = currentSnapshot
            if state.policyPending, category != .necessary {
                return false
            }
            return state.effectivePermissions.value(for: category)
        }
    }

    /// Whether a real answer exists: the core has been told, either by hydration
    /// restoring an envelope or by the first init resolving a policy this build could
    /// read, and that policy is in force.
    ///
    /// The two flags a gate must consult, combined into the question a host asks first:
    /// ``ConsentCore/decision(for:)`` says what is permitted, and this says whether
    /// that answer is final yet or still `pending`. Synchronous, one read of in-memory
    /// state, no disk, no network, and no lock held across either, because ad SDKs call
    /// it from `applicationDidFinishLaunching` and a block there is a watchdog kill the
    /// host app takes.
    public func isReady() -> Bool {
        lock.withLock { currentSnapshot.ready && !currentSnapshot.policyPending }
    }

    /// Why `category` may or may not run, for a host app's own Swift code.
    ///
    /// This is the answer an analytics or advertising SDK needs when it starts before
    /// the React Native bundle exists, and it is a public API in its own right rather
    /// than a detail behind the bridge. ``isAllowed(_:)`` cannot carry it: `false` means
    /// both "the subject refused" and "nothing has resolved", and those need opposite
    /// handling. See ``ConsentDecision`` for what each case obliges the caller to do.
    ///
    /// Derived from ``snapshot()`` and nothing else, so the gate can never disagree with
    /// the state the UI is showing, and no platform authorization can move a category
    /// from `pending` or `denied` to `granted`. Same hot-path rule as ``isAllowed(_:)``:
    /// one read of in-memory state.
    ///
    /// - Parameter category: The category to answer for, `necessary` included.
    /// - Returns: `.granted`, `.denied`, or `.pending` for the current snapshot.
    public func decision(for category: ConsentCategory) -> ConsentDecision {
        lock.withLock { ConsentDecision(snapshot: currentSnapshot, category: category) }
    }


    /// Watch one category. Fires with the current value immediately, then on every
    /// change to that category.
    ///
    /// Firing immediately is what lets a script gate be written as "register and
    /// load if allowed" without a separate read, and without a race between the two.
    @discardableResult
    public func gate(
        _ category: OptionalConsentCategory,
        _ onChange: @escaping @Sendable (Bool) -> Void
    ) -> ConsentSubscription {
        let subscription = GateSubscription(category: category, onChange: onChange)
        let registration = observers.add(subscription)
        // The observer set holds the subscription weakly, and a closure is not an
        // object anyone else owns, so the core keeps it alive for exactly as long
        // as the registration does. Cancelling drops both ends together.
        let key = ObjectIdentifier(subscription)
        registration.addHandler { [weak self] in
            guard let self else { return }
            self.lock.withLock {
                self.gateSubscriptions.removeValue(forKey: key)
                ()
            }
        }
        lock.withLock { gateSubscriptions[key] = subscription }
        let allowed = lock.withLock {
            currentSnapshot.effectivePermissions.value(for: category)
        }
        onChange(allowed)
        return registration
    }

    /// Watch one category as a ``ConsentDecision``, and keep watching it.
    ///
    /// The rules the boolean ``gate(_:_:)`` already has, plus the one that matters to a
    /// late starter: a listener registered after the decision has been reached still
    /// receives that decision rather than silence, so an SDK that initializes two
    /// seconds into the launch does not have to know what it missed. The callback fires
    /// at registration with the current decision, again on every change of decision, and
    /// ``ConsentSubscription/cancel()`` on the returned handle ends it.
    ///
    /// `pending` is a real delivery, not a placeholder: a listener that hears it must
    /// stay registered, because the same handle is what tells it the answer. A host that
    /// only ever wants to start something reads ``decision(for:)`` once and registers
    /// only when that answer is `pending`.
    ///
    /// Delivery runs on whichever queue published the change, off the main thread unless
    /// the host arranges otherwise.
    ///
    /// - Parameters:
    ///   - category: The category to watch. Takes `necessary`, which always answers
    ///     `granted`, so that a gate written over every category needs no special case.
    ///   - onChange: Called with the current decision, then with each new one.
    /// - Returns: A handle that cancels the subscription.
    @discardableResult
    public func gate(
        _ category: ConsentCategory,
        _ onChange: @escaping @Sendable (ConsentDecision) -> Void
    ) -> ConsentSubscription {
        let subscription = DecisionGateSubscription(category: category, onChange: onChange)
        // Register before the first read, in that order: a change that lands between
        // the two is delivered by the observer, and the seed below then stands down
        // rather than putting an older decision on the end of the callback's sequence.
        // Missing a change would leave an SDK switched off with nothing left listening,
        // which is the failure this gate exists to prevent, so the possible cost here
        // is one redundant delivery instead.
        let registration = observers.add(subscription)
        let key = ObjectIdentifier(subscription)
        registration.addHandler { [weak self] in
            guard let self else { return }
            self.lock.withLock {
                self.gateSubscriptions.removeValue(forKey: key)
                ()
            }
        }
        lock.withLock { gateSubscriptions[key] = subscription }
        let current = lock.withLock {
            ConsentDecision(snapshot: currentSnapshot, category: category)
        }
        subscription.deliverInitial(current)
        return registration
    }

    /// Watch the whole snapshot. Held weakly.
    @discardableResult
    public func onChange(_ observer: any SnapshotObserver) -> ConsentSubscription {
        observers.add(observer)
    }

    /// Events as a stream, from the moment this is called.
    public var eventStream: AsyncStream<CoreEvent> {
        events.stream()
    }

    // MARK: - Writes

    /// Record a consent decision.
    ///
    /// Returns as soon as the decision is local and durable; delivery is
    /// asynchronous. `actionAt` is captured before any I/O and reused by every
    /// replay, so the receipt the backend stores is the receipt the subject made.
    ///
    /// ``CommitResult/Status-enum/committed`` asserts the device side only: the
    /// receipts are applied, the snapshot is stored, and the queue holds the bytes
    /// that owe delivery. What happens to those bytes is reported afterwards, as
    /// ``CoreEvent/saveDelivered`` or as an ``CoreEvent/error`` carrying one of
    /// `http-status` (retryable, entry kept), `save-rejected` (the backend refused
    /// these bytes, entry dropped), `save-undeliverable` (retries or the retention
    /// window ran out, entry dropped), or `transport-unavailable` (no sender on this
    /// launch, entry kept). A save that cannot even be queued answers ``rejected``
    /// with `queue-write-failed`, `not-bootstrapped`, `no-subject`, or
    /// `concurrent-change`, and changes nothing.
    @discardableResult
    public func save(_ intent: CommitIntent) -> CommitResult {
        // Captured first: a save that took 40 ms to build a body must still report
        // the instant the subject acted.
        let actionAt = (lock.withLock { config }?.now ?? Self.wallClock)()

        struct Planned {
            let payload: SavePayload
            let body: Data
            /// Read in the same locked pass as `config`, which is the pass that
            /// installs it. A planned action that reached this point therefore always
            /// has somewhere to record its obligation, and ``save(_:)`` never has to
            /// answer the question "committed, but stored where".
            let queue: PendingSaveQueue
            /// The state this action was built on, and the state to install once the
            /// obligation is on disk. See the guarded apply in the committed branch.
            let baseRevision: Int
            let next: ConsentSnapshot
            let result: CommitResult
        }

        let prepared: Result<Planned, CoreErrorInfo> = lock.withLock {
            guard let queue else {
                return .failure(CoreErrorInfo(
                    code: "not-bootstrapped",
                    message: "ConsentCore.save() called before bootstrap()."
                ))
            }
            guard let identity else {
                return .failure(CoreErrorInfo(
                    code: "no-subject",
                    message: "No subject identity is available."
                ))
            }
            guard let resolved = resolvedPolicy, !currentSnapshot.policyPending else {
                // Without a policy there is no scope, so "accept all" would have to
                // invent one. Refuse and leave the deny-all snapshot alone.
                return .failure(CoreErrorInfo(
                    code: "policy-pending",
                    message: "Cannot record a choice before the policy resolves."
                ))
            }

            let receipts = categories(
                for: intent,
                scope: resolved.policy.scope,
                current: currentSnapshot.explicitChoice
            )
            let action: ConsentAction
            switch intent {
            case .all: action = .all
            case .necessary: action = .necessary
            case .custom: action = .custom
            }

            let choice = ExplicitChoice(
                merging: receipts,
                into: currentSnapshot.explicitChoice,
                actionAt: actionAt,
                fingerprint: resolved.choiceFingerprint
            )
            let evaluation = PolicyEvaluator.evaluate(
                resolved,
                choice: choice,
                noticeDismissal: noticeDismissal,
                optOutDirectives: currentSnapshot.optOutDirectives,
                gpcActive: gpcSignal.active,
                now: actionAt
            )

            // The surface the subject acted on, read before the commit rewrites it.
            // `uiSource` records where the decision was made, so a save that clears
            // the prompt must not report "no surface": `buildSubjectPostBody` reads
            // the pre-commit `activeUI` for the same reason.
            let surfaceAtAction = currentSnapshot.activeUI
            // Computed, not installed. State moves only once the queue has the bytes
            // that owe delivery, so a save that cannot take on the obligation has
            // nothing to take back.
            let baseRevision = currentSnapshot.revision
            let next = currentSnapshot.byApplying { draft in
                draft.explicitChoice = choice
                draft.effectivePermissions = evaluation.permissions
                draft.restrictions = evaluation.restrictions
                draft.promptRequirement = evaluation.promptRequirement
                draft.nextDeadline = evaluation.nextDeadline
                draft.evaluatedAt = actionAt
                draft.model = resolved.policy.model.runtimeModel
                // Visibility follows the remaining obligation, not the fact that an
                // action was taken: a choice save under a notice rule still owes the
                // notice, so the first layer stays. Same rule as `deriveActiveUI`.
                draft.activeUI = evaluation.promptRequirement.kind == .none
                    ? ActiveUI.none
                    : ActiveUI.banner
                draft.error = nil
            }
            let payload = SavePayload(
                subjectId: identity.id,
                subject: ConsentSubject(
                    subjectId: identity.id,
                    externalId: user?.externalId,
                    identityProvider: user?.identityProvider
                ),
                choice: choice,
                confirmed: ConfirmedCoverage(categories: receipts, actionAt: actionAt),
                consents: evaluation.permissions,
                overrides: wireOverrides,
                user: user,
                model: resolved.policy.model.runtimeModel,
                uiSource: surfaceAtAction,
                consentAction: action,
                policySnapshotToken: next.policySnapshotToken,
                decisionInputs: DecisionInputs(
                    policyId: resolved.resolution.policyId,
                    fingerprint: resolved.resolution.fingerprint,
                    country: overrides.country,
                    region: overrides.region,
                    language: overrides.language,
                    gpc: gpcSignal.active
                ),
                givenAt: actionAt
            )

            do {
                let body = try SubjectPostBodyBuilder.body(
                    for: payload,
                    domain: config?.transport?.domain ?? ""
                )
                return .success(Planned(
                    payload: payload,
                    body: body,
                    queue: queue,
                    baseRevision: baseRevision,
                    next: next,
                    result: CommitResult(
                        status: .committed,
                        revision: next.revision,
                        permissions: next.effectivePermissions,
                        consentAction: action,
                        confirmed: receipts
                    )
                ))
            } catch {
                return .failure(CoreErrorInfo(
                    code: "encode-failed",
                    message: "Save body could not be encoded: \(error)"
                ))
            }
        }

        switch prepared {
        case let .failure(info):
            events.emit(.error(info))
            return CommitResult(
                status: .rejected,
                revision: snapshot().revision,
                permissions: snapshot().effectivePermissions,
                consentAction: intent.action,
                error: info
            )

        case let .success(plan):
            // Obligation first, state second. The queue write is synchronous and
            // lands before `save` returns, so a process that dies here still has the
            // action on disk, and nothing is announced until there is a durable
            // delivery obligation behind it. An entry that failed to persist is never
            // sent and never reported committed, because delivering something nothing
            // remembers is how duplicates happen and promising something nothing
            // remembers is how decisions go missing.
            guard let queuedID = plan.queue.enqueue(
                body: plan.body,
                subjectId: plan.payload.subjectId,
                actionAt: plan.payload.confirmed.actionAt
            ) else {
                let info = CoreErrorInfo(
                    code: "queue-write-failed",
                    message: "Pending save could not be persisted, so the decision was not recorded and nothing was sent."
                )
                events.emit(.error(info))
                return CommitResult(
                    status: .rejected,
                    revision: snapshot().revision,
                    permissions: snapshot().effectivePermissions,
                    consentAction: intent.action,
                    error: info
                )
            }

            // Install the choice the obligation was written for. The guard is what
            // keeps this atomic across the unlocked queue write: if another mutation
            // landed while the write was in flight, that one stands, this body is
            // withdrawn rather than replayed over it, and the caller is told the
            // action did not take.
            let applied = lock.withLock { () -> Bool in
                guard currentSnapshot.revision == plan.baseRevision else { return false }
                currentSnapshot = plan.next
                return true
            }
            guard applied else {
                plan.queue.remove(id: queuedID)
                let info = CoreErrorInfo(
                    code: "concurrent-change",
                    message: "Consent state changed while this save was being recorded, so it was withdrawn. Repeat the action against the current snapshot."
                )
                events.emit(.error(info))
                return CommitResult(
                    status: .rejected,
                    revision: snapshot().revision,
                    permissions: snapshot().effectivePermissions,
                    consentAction: intent.action,
                    error: info
                )
            }

            publish(persist: true)
            events.emit(.saveQueued(subjectId: plan.payload.subjectId))
            let body = plan.body
            let subjectId = plan.payload.subjectId
            let queue = plan.queue
            schedule {
                guard let transport = self.transport else {
                    // No transport on this launch. The entry stays queued for
                    // whichever launch finally has one, and that has to be said out
                    // loud: an obligation with no sender is invisible from
                    // `CommitResult`, which is the state this branch exists to avoid.
                    self.events.emit(.error(CoreErrorInfo(
                        code: "transport-unavailable",
                        message: "No transport is configured on this launch, so a queued consent save is waiting undelivered."
                    )))
                    return
                }
                // The first send takes the core the same way a replay does. It is a
                // pass over one entry, and a pass over the whole queue must not be
                // reading that entry at the same time -- see
                // ``requestDeliveryPass(ownSend:)``. When it loses that race it sends
                // nothing, because the pass that won covers this body on its way out.
                await self.requestDeliveryPass(ownSend: {
                    // The queue gets asked last. Both senders hold the pass when they
                    // reach here, so an entry that is already gone was landed by the
                    // pass that held the core before this one; re-sending the same
                    // frozen bytes would buy a second POST for one decision.
                    guard queue.isPending(id: queuedID) else { return }

                    switch await transport.sendSave(body) {
                    case .success:
                        queue.remove(id: queuedID)
                        self.events.emit(.saveDelivered(subjectId: subjectId))
                    case let .failure(error):
                        self.settleFailedSend(
                            error,
                            queue: queue,
                            entryID: queuedID,
                            subjectId: subjectId
                        )
                    }
                })
            }
            return plan.result
        }
    }

    /// Account for a first send that did not land.
    ///
    /// Two outcomes, and the difference is whether the same bytes could ever be
    /// accepted. A transport that could not reach the backend, or answered `503`,
    /// says nothing about the body, so the entry keeps its place in the queue with
    /// one attempt spent and the next launch tries again. A backend that refused the
    /// body on its own terms says something permanent, because the queue replays
    /// frozen bytes: `INPUT_VALIDATION_FAILED` on the first try is
    /// `INPUT_VALIDATION_FAILED` on the tenth.
    ///
    /// A permanently refused body is dropped rather than kept. It is not a lost
    /// decision: the subject's choice lives in the stored envelope either way, and
    /// an obligation no producer will ever accept is not worth twenty slots on
    /// every future launch. Dropping one is only survivable if it is announced, so
    /// every branch here emits, and the two that release the entry name the reason
    /// it stopped being owed.
    private func settleFailedSend(
        _ error: C15tError,
        queue: PendingSaveQueue,
        entryID: String,
        subjectId: String
    ) {
        guard error.isPermanentlyRejected else {
            // Leave it queued with one attempt spent. The decision is already local
            // and durable; the backend can wait.
            let outcome = queue.recordFailedAttempt(id: entryID)
            if outcome.dropsEntry {
                events.emit(.error(Self.undeliverableSave(subjectId: subjectId, error: error, outcome: outcome)))
                return
            }
            events.emit(.error(error.info))
            return
        }

        queue.remove(id: entryID)
        events.emit(.error(CoreErrorInfo(
            code: "save-rejected",
            message: "The backend refused this consent save, so it was dropped and will not be retried: \(error.message)"
        )))
    }

    /// The announcement for an obligation the queue released with the body never
    /// accepted.
    ///
    /// Both roads reach it: a save whose very first send spent the last attempt, and
    /// a replay that ran a body out. One message builder keeps them from drifting
    /// apart, because after this point nothing on the device remembers that the
    /// decision owed anyone anything, and a host that is not told has no way to
    /// learn it.
    private static func undeliverableSave(
        subjectId: String,
        error: C15tError,
        outcome: FailedAttempt
    ) -> CoreErrorInfo {
        let reason: String
        switch outcome {
        case let .droppedAfterAttempts(attempts):
            reason = "it was refused \(attempts) times, which is the ceiling of \(PendingSaveQueue.maxAttempts) attempts"
        case .droppedAsTooOld:
            let days = PendingSaveQueue.maxAgeMs / 86_400_000
            reason = "it waited longer than the queue's \(days) day retention window"
        case .retrying, .alreadyGone:
            // Unreachable: callers only announce a drop. Here so a future ceiling
            // cannot turn the message into a lie about why.
            reason = "it left the queue unaccepted"
        }
        return CoreErrorInfo(
            code: "save-undeliverable",
            message: "A queued consent save for \(subjectId) was dropped because \(reason). Last backend error: \(error.message)"
        )
    }

    /// Record that the notice was dismissed. Grants nothing: a dismissal is not a
    /// choice, and the optional categories stay wherever the policy left them.
    public func dismissNotice() {
        let at = (lock.withLock { config }?.now ?? Self.wallClock)()
        let changed = lock.withLock { () -> Bool in
            guard let resolved = resolvedPolicy, resolved.policy.prompt == .notice else {
                return false
            }
            noticeDismissal = NoticeDismissal(dismissedAt: at, fingerprint: resolved.noticeFingerprint)
            let evaluation = PolicyEvaluator.evaluate(
                resolved,
                choice: currentSnapshot.explicitChoice,
                noticeDismissal: noticeDismissal,
                optOutDirectives: currentSnapshot.optOutDirectives,
                gpcActive: gpcSignal.active,
                now: at
            )
            currentSnapshot = currentSnapshot.byApplying { draft in
                draft.promptRequirement = evaluation.promptRequirement
                draft.effectivePermissions = evaluation.permissions
                draft.restrictions = evaluation.restrictions
                draft.nextDeadline = evaluation.nextDeadline
                draft.evaluatedAt = at
                draft.activeUI = .none
            }
            return true
        }
        if changed {
            publish(persist: true)
        }
    }

    /// Re-run init. The contract's refresh, called on foreground or after a reachability
    /// change, and it is also what re-resolves policy after an override change.
    public func refresh() {
        scheduleInit(attempt: 1)
    }

    /// Attach an identified user. The c15t subject id does not change: an external
    /// id is a second key on the same subject, not a new subject.
    public func identify(_ user: KernelUser) {
        let identity = lock.withLock { () -> SubjectIdentity? in
            self.user = user
            currentSnapshot = currentSnapshot.byApplying { draft in
                draft.subject = self.identity.map { $0.snapshot(externalId: user.externalId) }
            }
            return self.identity
        }
        publish(persist: true)
        guard let identity else { return }
        schedule {
            guard let transport = self.transport else { return }
            if case let .failure(error) = await transport.patchIdentity(
                subjectId: identity.id,
                externalId: user.externalId,
                identityProvider: user.identityProvider
            ) {
                self.events.emit(.error(error.info))
            }
        }
    }

    /// Forget the external id. Consent records and the subject id stay: the
    /// subject's decisions belong to the device's subject, not to the account that
    /// happened to be signed in when they were made.
    public func logout() {
        lock.withLock {
            user = nil
            currentSnapshot = currentSnapshot.byApplying { draft in
                draft.subject = self.identity.map { $0.snapshot(externalId: nil) }
            }
        }
        publish(persist: true)
    }

    /// Change the geographic, language, or test context.
    ///
    /// Policy was resolved for the previous context, so this re-resolves it. The
    /// local re-evaluation happens immediately so a caller sees the override on the
    /// next read; the re-resolve refines it.
    public func setOverrides(_ overrides: ConsentOverrides) {
        let changed = lock.withLock { () -> Bool in
            guard self.overrides != overrides else { return false }
            self.overrides = overrides
            self.configuredOverrides = overrides
            reevaluateLocked(now: (config?.now ?? Self.wallClock)())
            return true
        }
        guard changed else { return }
        publish(persist: true)
        refresh()
    }

    /// Ask for everything the queue is holding to be delivered. Call on launch, on
    /// foreground, and on a reachability change.
    ///
    /// This is a request for a pass, not a pass of its own. One pass may be in flight
    /// per core, so a call that lands while another pass is sending is answered by
    /// that pass and returns without starting a second one -- see
    /// ``requestDeliveryPass(ownSend:)``. Nothing is weakened about the obligation:
    /// an entry waiting on the running pass is still owed, still counted by
    /// ``pendingSaveCount()``, and still announced by exactly one delivered event.
    public func flushPending() {
        schedule { await self.requestDeliveryPass(ownSend: nil) }
    }

    /// Wipe consent and return the device to the state a first launch is in.
    ///
    /// The snapshot installed here is ``ConsentSnapshot/coldStart``, and the difference
    /// between it and a recorded denial is the whole point of the method. A denial is an
    /// ``ExplicitChoice`` that says the subject answered, so ``PolicyEvaluator`` finds a
    /// current receipt, owes nothing, and no prompt ever comes back. This installs no
    /// receipt at all, so the choice is owed again and the banner returns once the init
    /// below lands. `native/CONTRACT.md` states this under "Wiping consent (reset)".
    ///
    /// Three things it has to do that clearing the store does not cover:
    ///
    /// - Publish. This is a committed mutation, so it bumps the revision by one and goes
    ///   out through ``onChange(_:)`` like any other mutation. Installing the baseline
    ///   quietly would leave every ``gate(_:_:)`` in the process holding a decision the
    ///   device no longer remembers, and restarting the numbering at the cold-start
    ///   revision would hand each subscriber a snapshot older than the one it holds and
    ///   switch persistence off for the session, because ``persistEnvelope()`` refuses a
    ///   write that is not ahead of the last one.
    /// - Leave no envelope behind. The deletion is the durable effect, so this is the one
    ///   mutation that publishes without persisting. ``persistedRevision`` and
    ///   ``restoredFromStore`` go with it: both answer "is consent on disk", and after a
    ///   wipe the honest answer is no.
    /// - Re-run init. A first launch does not sit at `policyPending` once the network
    ///   answers, and stopping at the baseline would leave the app there until the next
    ///   launch, with the subject withdrawn from everything and nothing asking them to
    ///   decide again. A caller must not have to remember to refresh after this.
    ///
    /// What survives is configuration rather than consent: the subject id with its external
    /// id, the overrides the host pinned, and the configured category scope. A host that pinned a
    /// country for QA or switched GPC on would otherwise get a different policy resolved
    /// than the one its app is configured to evaluate.
    ///
    /// A save a delivery pass had already handed to the transport can still land after the
    /// queue is dropped, and that pass finds its entry gone when it settles. Nothing here
    /// waits for it. The entries still queued carry a decision the subject just withdrew,
    /// and the one already on the wire was current when it was made.
    public func reset() {
        let wired = lock.withLock { () -> (store: any ConsentStore, queue: PendingSaveQueue)? in
            let now = (config?.now ?? Self.wallClock)()
            resolvedPolicy = nil
            policyWire = nil
            noticeDismissal = nil
            currentSnapshot = currentSnapshot.byApplying { draft in
                // Every field a cold start leaves at its default is set here rather than
                // carried over. A draft copy that forgets one keeps a withdrawn decision
                // alive in a snapshot that claims to hold none, and that is the exact
                // failure this method exists to prevent.
                draft.policyPending = true
                draft.ready = false
                draft.model = .optIn
                draft.activeUI = .none
                draft.promptRequirement = .none
                draft.effectivePermissions = .necessaryOnly
                draft.explicitChoice = nil
                draft.restrictions = [:]
                draft.resolution = .pending
                draft.policySnapshotToken = nil
                draft.location = nil
                draft.translations = nil
                // The list came with a policy claim, so it goes with one; a wipe leaves no
                // IAB state behind, and the next init serves it again if the matched
                // model is still `iab`.
                draft.iab = nil
                draft.optOutDirectives = []
                draft.nextDeadline = nil
                draft.error = nil
                draft.evaluatedAt = now
                if let identity {
                    draft.subject = identity.snapshot(externalId: user?.externalId)
                }
                draft.consentCategories = decidedCategories(nil)
                // The host's pins, not ``overrides``. See ``configuredOverrides``: the
                // folded country came from the resolution this wipe is deleting, and
                // keeping it would leave the answer one field off a first launch's.
                draft.overrides = configuredOverrides
                draft.privacySignals = PrivacySignals(
                    gpc: GpcSignal.derive(
                        override: configuredOverrides.gpc,
                        detected: detectedGPCSignal
                    )
                )
            }
            persistedRevision = 0
            restoredFromStore = false
            guard let config, let queue else { return nil }
            return (config.store, queue)
        }
        // Storage first, outside the lock, so nothing is announced about a device whose
        // bytes are still there. A core that was never bootstrapped has no store and no
        // queue to clear, and its in-memory state is already the baseline above.
        if let wired {
            wired.queue.clear()
            wired.store.set(nil, for: StorageKey.snapshot)
            wired.store.set(nil, for: StorageKey.pendingSaves)
        }
        publish(persist: false)
        scheduleInit(attempt: 1)
    }

    /// Everything waiting to reach the backend.
    public func pendingSaveCount() -> Int {
        lock.withLock { queue }.map { $0.count() } ?? 0
    }

    /// The queued bodies, oldest action first. A replay must resend these bytes
    /// verbatim, so they are readable rather than inferred from a mock.
    package func pendingSaveBodies() -> [Data] {
        lock.withLock { queue }?.entries().map(\.body) ?? []
    }

    // MARK: - Hydration

    /// Restore the stored envelope and make it answerable.
    ///
    /// An envelope here is what sets ``ConsentSnapshot/ready`` during hydration. A
    /// first launch finds none and stays not-ready until the first init resolves, which
    /// ``applyInit`` does in its resolved branch.
    ///
    /// Reads the cache once, synchronously, and re-runs the evaluator against the
    /// current clock. Re-evaluating is the difference between a cached snapshot and
    /// a stale one: a choice that expired overnight must not open a tag this
    /// morning just because the network is not available yet.
    @discardableResult
    public func hydrate() -> ConsentSnapshot {
        guard let config = lock.withLock({ self.config }) else { return snapshot() }

        // Identity first, on disk, outside the lock.
        let identityRead = SubjectIdentity.loadOrCreate(from: config.store)
        let identity = identityRead.identity
        if let unusable = identityRead.unusable {
            // The id the records are keyed to is one the producer refuses, so those
            // records describe a subject no query returns. Keep them and the next
            // launch attributes them to the id minted a moment ago: one subject split
            // across two ids, silently. `native/CONTRACT.md` prices the refused id at
            // nothing, so everything written under it goes with it -- the envelope and
            // the queued bodies alike, since those bytes were already refused for
            // carrying this id and replaying them buys a guaranteed rejection.
            config.store.set(nil, for: StorageKey.snapshot)
            config.store.set(nil, for: StorageKey.pendingSaves)
            announceUnusableSubjectId(unusable)
        }
        let envelopeData = config.store.data(for: StorageKey.snapshot)
        let envelope = envelopeData.flatMap(StoredEnvelope.decode)

        let restored = lock.withLock { () -> ConsentSnapshot in
            self.identity = identity
            self.restoredFromStore = envelope != nil

            var draft = ConsentSnapshot.Draft(current: envelope?.snapshot ?? .coldStart)
            draft.subject = identity.snapshot(externalId: self.user?.externalId)
            draft.overrides = overrides
            draft.ready = envelope != nil

            self.policyWire = envelope?.policyResolution
            self.noticeDismissal = envelope?.noticeDismissal

            if let wire = envelope?.policyResolution {
                switch PolicyWireReader.read(wire) {
                case let .resolved(resolved):
                    self.resolvedPolicy = resolved
                    draft.resolution = resolved.resolution
                    draft.model = resolved.policy.model.runtimeModel
                    draft.policyPending = false
                    draft.error = nil
                case let .rejected(reason, message):
                    self.resolvedPolicy = nil
                    draft.policyPending = true
                    draft.effectivePermissions = ConsentSnapshot.failClosedPermissions
                    draft.activeUI = .none
                    draft.promptRequirement = .none
                    draft.restrictions = [:]
                    draft.error = CoreErrorInfo(code: reason.rawValue, message: message)
                }
            } else {
                self.resolvedPolicy = nil
                draft.policyPending = true
                // Provisional: nothing has resolved, so no surface is claimed.
                draft.activeUI = .none
                draft.effectivePermissions = .necessaryOnly
                draft.promptRequirement = .none
            }

            // The subject-facing list, against whatever this store says is in force.
            draft.consentCategories = decidedCategories(self.resolvedPolicy)

            // Continue the stored numbering rather than restarting at 1, so a
            // subscriber that saw revision 3 before the relaunch cannot treat the
            // restored snapshot as older than the state it already holds.
            let restoredRevision = envelope?.snapshot.revision ?? 0
            let base = draft.build(
                revision: max(currentSnapshot.revision, restoredRevision) + 1
            )
            currentSnapshot = base
            // Re-evaluate on the restored records at the current time. A rejected
            // wire has nothing to evaluate against, so it keeps deny-all.
            reevaluateLocked(now: config.now())
            return currentSnapshot
        }

        publish(persist: true)
        if let error = restored.error {
            events.emit(.error(error))
        }
        return restored
    }

    // MARK: - Idle

    /// Await everything the core has scheduled.
    ///
    /// A binding layer rarely wants this; a test wants it constantly, because
    /// "the payload was persisted before the call" and "the replay sent the same
    /// bytes" are only observable once the scheduled work has landed.
    public func waitUntilIdle() async {
        while true {
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                let busy = lock.withLock {
                    if inFlightWork == 0 {
                        return false
                    }
                    idleWaiters.append(continuation)
                    return true
                }
                if !busy {
                    continuation.resume()
                    return
                }
            }
            let busy = lock.withLock { inFlightWork > 0 }
            if !busy { return }
        }
    }

    // MARK: - Internals

    /// Whether ``subject-id-unusable`` has been announced this launch.
    ///
    /// ``hydrate()`` is public and a binding layer can call it again after a store
    /// swap, so the flag lives here rather than relying on bootstrap's once-only guard.
    private var unusableSubjectIdAnnounced = false

    /// Say once per launch why a returning user is being asked for consent again.
    ///
    /// The host gets the refused id, which shape it was, and what the core gave up,
    /// because "the app forgot my choices" is only explainable if the message says whose
    /// format refused the id and that the server never held the decision it is missing.
    private func announceUnusableSubjectId(_ unusable: UnusableSubjectId) {
        let alreadyAnnounced = lock.withLock {
            if unusableSubjectIdAnnounced { return true }
            unusableSubjectIdAnnounced = true
            return false
        }
        guard !alreadyAnnounced else { return }

        let origin = unusable.legacyShape
            ? "it has the UUID shape this SDK wrote before the sub_ format existed"
            : "it is a format this SDK never wrote"
        events.emit(.error(CoreErrorInfo(
            code: "subject-id-unusable",
            message: "c15t: the stored subject id \(unusable.id) \(origin), and the c15t "
                + "backend only accepts ids matching ^sub_[1-9A-HJ-NP-Za-km-z]+$, so this "
                + "build cannot use that identity. The consent saved under it was discarded "
                + "with it, because the backend refused every save that carried it and holds "
                + "no decision for it. A new subject id was minted, so the app asks for "
                + "consent again; nothing the subject chose was overwritten on the server."
        )))
    }

    private static let wallClock: @Sendable () -> Int64 = {
        Int64(Date().timeIntervalSince1970 * 1_000)
    }

    private var transport: (any C15tTransport)? {
        lock.withLock { config?.transport }
    }

    /// What the device reports, with no override applied: the host's report when
    /// it made one, otherwise what the backend resolved. Callers must already
    /// hold the lock.
    private var detectedGPCSignal: Bool {
        config?.gpc ?? detectedGPC
    }

    /// The GPC signal to honor, in the detected / override / active shape the
    /// kernel uses. The snapshot's copy is an output of this, never an input, so
    /// a stored value can never keep denying after the signal is gone. An app
    /// override wins over a detection, which is what makes it an override.
    /// Callers must already hold the lock.
    private var gpcSignal: GpcSignal {
        GpcSignal.derive(override: overrides.gpc, detected: detectedGPCSignal)
    }

    /// Overrides in wire form. Callers must already hold the lock.
    private var wireOverrides: KernelOverridesWire {
        KernelOverridesWire(
            country: overrides.country,
            region: overrides.region,
            language: overrides.language,
            gpc: gpcSignal.active
        )
    }

    /// The categories the consent surfaces list right now.
    ///
    /// The same derivation the web dialog uses (`getDisplayedConsents` in
    /// `use-manager.ts`): `necessary` first, then the policy scope narrowed by the
    /// host's own declaration. A host that declares nothing is asked about the whole
    /// scope; a name the host declares that the resolved policy does not govern is
    /// dropped, because a row the evaluator will not honour is a row that cannot be
    /// honoured. Before any policy resolves the evaluator runs the safe fallback
    /// rule over every optional category, so the scope behind the list is the full
    /// optional set -- the same rows the web shows while it waits for init.
    ///
    /// The list is `necessary` plus the optional names in canonical (sorted) order;
    /// the JavaScript layer restyles that into display order, and both native cores
    /// emit this exact shape so the protocol fixtures can pin them together.
    ///
    /// Callers must already hold the lock, because the answer reads ``config``.
    private func decidedCategories(_ resolved: ResolvedPolicy?) -> [ConsentCategory] {
        var declared: Set<ConsentCategory>?
        if let list = config?.consentCategories, !list.isEmpty {
            declared = Set(list)
        }
        let scope: Set<ConsentCategory>
        if let resolved {
            scope = Set(resolved.policy.scope.map(\.category))
        } else {
            scope = Set(OptionalConsentCategory.allCases.map(\.category))
        }
        let optional = OptionalConsentCategory.allCases
            .lazy
            .map(\.category)
            .filter { category in
                guard scope.contains(category) else { return false }
                guard let declared else { return true }
                return declared.contains(category)
            }
            .sorted { $0.rawValue < $1.rawValue }
        return [ConsentCategory.necessary] + Array(optional)
    }

    /// Map an intent onto the receipts it confirms. Callers must already hold the
    /// lock, because the answer depends on the active scope.
    private func categories(
        for intent: CommitIntent,
        scope: [OptionalConsentCategory],
        current: ExplicitChoice?
    ) -> [OptionalConsentCategory: Bool] {
        switch intent {
        case .all:
            var receipts: [OptionalConsentCategory: Bool] = [:]
            for category in scope { receipts[category] = true }
            return receipts
        case .necessary:
            var receipts: [OptionalConsentCategory: Bool] = [:]
            for category in scope { receipts[category] = false }
            return receipts
        case let .custom(map):
            // Exactly what the form sent. Categories outside scope are still
            // recorded: the evaluator masks them, and a later policy that brings
            // them into scope should find the answer the subject already gave.
            return map
        }
    }

    /// Re-run the evaluator against the current policy and records. Callers must
    /// already hold the lock.
    private func reevaluateLocked(now: Int64) {
        guard let resolved = resolvedPolicy, !currentSnapshot.policyPending else { return }
        let evaluation = PolicyEvaluator.evaluate(
            resolved,
            choice: currentSnapshot.explicitChoice,
            noticeDismissal: noticeDismissal,
            optOutDirectives: currentSnapshot.optOutDirectives,
            gpcActive: gpcSignal.active,
            now: now
        )
        currentSnapshot = currentSnapshot.byApplying { draft in
            draft.effectivePermissions = evaluation.permissions
            draft.restrictions = evaluation.restrictions
            draft.promptRequirement = evaluation.promptRequirement
            draft.nextDeadline = evaluation.nextDeadline
            draft.evaluatedAt = now
            draft.model = resolved.policy.model.runtimeModel
            draft.activeUI = evaluation.promptRequirement.kind == .none
                ? ActiveUI.none
                : ActiveUI.banner
        }
    }

    /// Publish the current snapshot to observers, then persist it.
    ///
    /// Both halves read the snapshot under the lock and do their work outside it.
    private func publish(persist: Bool) {
        let state = lock.withLock { currentSnapshot }
        events.emit(.snapshot(revision: state.revision))
        observers.notify(state)
        if persist {
            persistEnvelope()
        }
    }

    /// Write the envelope. Encoding happens under the lock; the write does not.
    private func persistEnvelope() {
        struct Write {
            let store: any ConsentStore
            let data: Data
            let revision: Int
        }
        let pending: Write? = lock.withLock {
            guard let config, currentSnapshot.revision > persistedRevision else { return nil }
            let envelope = StoredEnvelope(
                snapshot: currentSnapshot,
                noticeDismissal: noticeDismissal,
                policyResolution: policyWire,
                storedAt: config.now()
            )
            guard let data = try? C15tJSON.encode(envelope) else { return nil }
            // Claim the revision before releasing the lock, so two overlapping
            // publishes cannot both decide they are the newest writer.
            persistedRevision = currentSnapshot.revision
            return Write(store: config.store, data: data, revision: currentSnapshot.revision)
        }
        guard let pending else { return }
        // The write is outside the lock. A failed write leaves the claimed revision
        // alone on purpose: the next mutation writes again, and rolling the claim
        // back would let an older envelope overtake a newer one.
        _ = pending.store.encode(pending.data, for: StorageKey.snapshot)
    }

    // MARK: - Async work

    private func schedule(_ work: @escaping @Sendable () async -> Void) {
        beginWork()
        Task.detached(priority: .userInitiated) {
            await work()
            self.endWork()
        }
    }

    private func scheduleInit(attempt: Int) {
        beginWork()
        Task.detached(priority: .userInitiated) {
            await self.runInit(attempt: attempt)
            self.endWork()
        }
    }

    private func beginWork() {
        lock.withLock { inFlightWork += 1 }
    }

    private func endWork() {
        let waiters = lock.withLock { () -> [CheckedContinuation<Void, Never>] in
            inFlightWork -= 1
            guard inFlightWork == 0 else { return [] }
            let pending = idleWaiters
            idleWaiters = []
            return pending
        }
        for waiter in waiters {
            waiter.resume()
        }
    }

    private func runInit(attempt: Int) async {
        guard let config = lock.withLock({ self.config }) else { return }
        guard let transport = config.transport else { return }
        let context = lock.withLock {
            InitContext(
                overrides: wireOverrides,
                user: user,
                subjectId: identity?.id ?? ""
            )
        }

        let result = await transport.performInit(context)
        switch result {
        case let .success(response):
            applyInit(response)
        case let .failure(error):
            reportInitFailure(error, attempt: attempt, retry: config.initRetry)
        }
    }

    /// Fold an init response into state.
    ///
    /// The policy wire is read strictly before any of it is used, and a wire this
    /// build cannot read leaves every optional category denied rather than falling
    /// back to a best guess. Every other field is applied only when present, which is
    /// how the web transport behaves with an omitted field too.
    private func applyInit(_ response: InitResponse) {
        lock.withLock {
            let nowMs = (config?.now ?? Self.wallClock)()

            if let detected = response.resolvedPrivacySignals?.gpc {
                detectedGPC = detected
            }

            var draft = ConsentSnapshot.Draft(current: currentSnapshot)
            // The overrides a decision was actually made against, which is what the
            // backend recomputes before it accepts a save. `mapResolvedOverrides`
            // and the merge in `@c15t/core` fold the served location and translation
            // language over the app's own overrides, so a device that pinned nothing
            // still reports the country and region it was matched on. `gpc` survives
            // from the app because `/init` never derives it.
            draft.overrides = ConsentOverrides(
                country: response.resolvedOverrides?.country
                    ?? response.location?.countryCode
                    ?? overrides.country,
                region: response.resolvedOverrides?.region
                    ?? response.location?.regionCode
                    ?? overrides.region,
                language: response.resolvedOverrides?.language
                    ?? response.translations?.language
                    ?? overrides.language,
                gpc: response.resolvedOverrides?.gpc ?? overrides.gpc
            )
            overrides = draft.overrides
            draft.privacySignals = PrivacySignals(gpc: gpcSignal)
            if let location = response.location { draft.location = location }
            if let translations = response.translations { draft.translations = translations }
            if let token = response.policySnapshotToken { draft.policySnapshotToken = token }
            // The vendor list is folded here, beside the other served-metadata fields,
            // and before the policy branch, on purpose.
            //
            // Only when present: a later `/init` that serves no `gvl` leaves the list the
            // core already has. That is the retention the dialog needs. Once a purpose
            // name or vendor name has been on screen, replacing it with nothing does not
            // take a permission away -- it renders an empty dialog against a consent the
            // subject just gave -- and the backend omits the field routinely, because
            // `buildInitResponse` only embeds it while the matched model is `iab`. The
            // web keeps its module-level GVL cache for the same reason. A newer list
            // replaces an older one whole, so the device can never hold two vendors'
            // worth of `vendorListVersion`.
            //
            // Same retention rules as the matched policy, which means stored on the
            // snapshot and written with it in the same envelope: one write, one read,
            // wiped by ``reset()`` alongside `policyWire`. It rides the snapshot rather
            // than taking an envelope key of its own, because the bridge reads the
            // snapshot and a second copy of one fact is two answers.
            if let gvl = response.gvl {
                draft.iab = KernelIABState(gvl: gvl)
            }

            // Server-mapped receipts merge in per category, newest wins. A local
            // receipt that has not reached the backend yet is newer than anything
            // the server can say about it, and must survive the round trip.
            if let records = response.records {
                draft.explicitChoice = merge(records: records)
                draft.optOutDirectives = records.optOutDirectives
            }

            switch PolicyWireReader.read(response.policyResolution) {
            case let .resolved(resolved):
                self.resolvedPolicy = resolved
                policyWire = response.policyResolution
                draft.policyPending = false
                // `ready` means the core has been told, not that a file was there to
                // read. Hydration is one way to be told; a first init that resolved is
                // the other, and without it a fresh install would answer `pending` for
                // the whole of the launch that most needs an answer. Only the `.resolved`
                // branch raises it: a failed init leaves the flag where it was, so a
                // device that has never been told stays fail-closed and a device that
                // lost signal keeps the snapshot the contract says it may serve.
                draft.ready = true
                draft.resolution = resolved.resolution
                draft.model = resolved.policy.model.runtimeModel
                draft.error = nil

                let evaluation = PolicyEvaluator.evaluate(
                    resolved,
                    choice: draft.explicitChoice,
                    noticeDismissal: noticeDismissal,
                    optOutDirectives: draft.optOutDirectives,
                    gpcActive: gpcSignal.active,
                    now: nowMs
                )
                draft.effectivePermissions = evaluation.permissions
                draft.restrictions = evaluation.restrictions
                draft.promptRequirement = evaluation.promptRequirement
                draft.nextDeadline = evaluation.nextDeadline
                draft.evaluatedAt = nowMs
                // `ready` is a hydration flag, not a network flag: an init that
                // answered does not make an unstored first launch "restored".
                // A pending prompt is the banner's cue; nothing owed means nothing
                // to show.
                draft.activeUI = evaluation.promptRequirement.kind == .none
                    ? ActiveUI.none
                    : ActiveUI.banner

            case let .rejected(reason, message):
                // Fail closed, and say so. An unparseable policy is not "no
                // policy": it is a policy this build must not act on.
                self.resolvedPolicy = nil
                policyWire = response.policyResolution
                draft.policyPending = true
                draft.effectivePermissions = ConsentSnapshot.failClosedPermissions
                draft.restrictions = [:]
                draft.promptRequirement = .none
                draft.activeUI = .none
                draft.nextDeadline = nil
                draft.error = CoreErrorInfo(code: reason.rawValue, message: message)
            }

            // The same list rule the web dialog applies to the resolution it just
            // read: the rejected branch has no scope of its own, so the list falls
            // back to the full optional set the pending evaluator uses.
            draft.consentCategories = decidedCategories(self.resolvedPolicy)
            currentSnapshot = draft.build(revision: currentSnapshot.revision + 1)
        }

        publish(persist: true)
        if let error = snapshot().error {
            events.emit(.error(error))
        }
        // A save queued while the policy was still pending, or while the transport
        // was unreachable, gets another pass now that init has answered.
        schedule { await self.requestDeliveryPass(ownSend: nil) }
    }

    /// Merge server receipts with local ones, keeping the newer confirmation per
    /// category.
    private func merge(records: HydrationRecords) -> ExplicitChoice? {
        guard let incoming = records.choice else {
            noticeDismissal = noticeDismissal ?? records.noticeDismissal
            return currentSnapshot.explicitChoice
        }
        var categories = currentSnapshot.explicitChoice?.categories ?? [:]
        for (category, incomingDecision) in incoming.categories {
            guard let existing = categories[category] else {
                categories[category] = incomingDecision
                continue
            }
            if incomingDecision.confirmedAt > existing.confirmedAt {
                categories[category] = incomingDecision
            }
        }
        if noticeDismissal == nil {
            noticeDismissal = records.noticeDismissal
        }
        return ExplicitChoice(categories: categories)
    }

    private func reportInitFailure(
        _ error: C15tError,
        attempt: Int,
        retry: InitRetry?
    ) {
        events.emit(.error(error.info))
        // An unsupported contract will not fix itself on a retry: the producer is
        // speaking a wire this build cannot read, and no amount of asking changes
        // that. Say it once, stop asking, and stay exactly where the core is.
        if error.code == PolicyFailureReason.unsupportedContract.rawValue {
            lock.withLock {
                currentSnapshot = currentSnapshot.byApplying { draft in
                    draft.error = error.info
                }
            }
            // `error` is a snapshot field, so this is a committed change like every
            // other one, and ``publish(persist:)`` is the one path that announces it:
            // the revision event, the snapshot observers, and the envelope write
            // together. Emitting a `.snapshot` event alone announces a revision to a
            // listener list the bridge is not on -- `C15tCoreSubscriber` feeds the
            // React Native pump from `onChange`, not from the event hub -- so the new
            // revision would never reach JavaScript, and a relaunch would forget a
            // misconfiguration that has not changed. The pair is the rule: see
            // "Revisions and error writes" in `native/CONTRACT.md`.
            publish(persist: true)
            return
        }

        guard let retry, attempt < retry.maxAttempts else { return }
        let delayMs = retry.delay(afterAttempt: attempt)
        schedule {
            if delayMs > 0 {
                try? await Task.sleep(nanoseconds: delayMs * 1_000_000)
            }
            if Task.isCancelled { return }
            await self.runInit(attempt: attempt + 1)
        }
    }

    // MARK: - Delivery passes

    /// Ask for a delivery pass, and run one when no other pass holds this core.
    ///
    /// Contract: `native/CONTRACT.md`, "The pending save queue" -- only one pass may
    /// be in flight per core, and this is the only place in the Swift core that
    /// answers that question. Two passes reading the queue at once is the defect the
    /// contract describes: a pass reads the queue once and then sends entry by entry,
    /// so every entry it read stays readable until its own send lands, and the second
    /// pass resends whatever the first is still sending. The bytes are frozen and
    /// carry the same consent id, so the backend dedupes and no stored state moves --
    /// the only trace is a second `POST /subjects` for a decision the subject already
    /// saw delivered, once per entry per wake-up.
    ///
    /// The guard is the guarantee, not the shape of the concurrency. This core hands
    /// its work to detached tasks on Swift's shared cooperative pool, and a foreground
    /// transition is exactly the moment several callers arrive together: the platform
    /// observer asks for a flush and the `refresh()` it then triggers reaches here
    /// again from the resolved init. Anything that waits on one queue would still
    /// let a host that calls ``flushPending()`` from its own thread start a second
    /// read while a send is open, so the rule is held here rather than left to
    /// whoever happens to call first.
    ///
    /// A request that finds the core held neither waits nor starts a pass. It records
    /// itself and returns: ``flushPending()`` reaches here from a lifecycle callback,
    /// and sitting behind somebody else's network timeout would block it. The pass
    /// that holds the core answers it by reading the queue again on the way out, which
    /// is what covers an entry queued after that pass had already read.
    ///
    /// - Parameter ownSend: the first send of the entry a save just queued, taken
    ///   before the queue is read, or `nil` for a pass over the whole queue. It goes
    ///   through the same guard a replay does, so a save's own send and a replay can
    ///   never hold the same entry at the same time; when the guard is already held,
    ///   the pass that holds it covers this entry on its re-read.
    private func requestDeliveryPass(ownSend: (@Sendable () async -> Void)?) async {
        // A save asks for one send, not for a pass over the queue. Reading the whole
        // queue on every save would spend an attempt on each older entry every time a
        // subject tapped a banner, and attempts end in released entries, so this
        // thread takes that cost on only when somebody actually asked for a pass.
        var owesPass = ownSend == nil
        var pendingSend = ownSend

        while true {
            guard acquireDeliveryPass() else {
                markDeliveryPassRequested()
                return
            }
            owesPass = owesPass || takeDeliveryPassRequest()

            var stoppedForUnreachableTransport = false
            do {
                // Handed back in a `defer`, so a pass that ever learns to throw or
                // cancel mid-flight cannot leave this core locked for the rest of the
                // launch with every later flush quietly declined.
                defer { releaseDeliveryPass() }

                if let send = pendingSend {
                    await send()
                    pendingSend = nil
                }
                if owesPass {
                    var report = await runDeliveryPass()
                    // Requests that landed during that read are answered by another
                    // read, taken before the send, so an entry queued while this pass
                    // was in the network is delivered now rather than at the next
                    // launch, foreground, or network change.
                    //
                    // An endpoint that could not be reached cancels the extra reads. A
                    // pass spends an attempt on everything it sends, so reading a dead
                    // backend twice does not deliver the late entry -- it ages every
                    // entry behind it toward the ceiling that releases them. The request
                    // stays recorded for whoever takes the pass next, and the next launch,
                    // foreground, or reachability change answers it over a connection that
                    // exists at all.
                    while !report.transportUnreachable, takeDeliveryPassRequest() {
                        report = await runDeliveryPass()
                    }
                    stoppedForUnreachableTransport = report.transportUnreachable
                }
            }

            // Read after the hand-back rather than claimed by it, for two reasons. A flush
            // that arrives between the check and the release would otherwise be declined
            // and then find the holder already gone, leaving a recorded request with
            // nobody left to answer it. And a pass giving up on a dead endpoint has to
            // leave that request where the next caller can still find it.
            if stoppedForUnreachableTransport || !isDeliveryPassRequested { return }
            owesPass = true
        }
    }

    /// Take the core for one delivery pass. `false` when a pass already holds it.
    private func acquireDeliveryPass() -> Bool {
        lock.withLock {
            guard !deliveryPassInFlight else { return false }
            deliveryPassInFlight = true
            return true
        }
    }

    /// Hand the core back. The request flag is left where it is on purpose: whoever
    /// takes the pass next is the one that claims it.
    private func releaseDeliveryPass() {
        lock.withLock { deliveryPassInFlight = false }
    }

    /// Whether somebody asked for a pass that nobody has claimed yet.
    private var isDeliveryPassRequested: Bool {
        lock.withLock { deliveryPassRequested }
    }

    private func markDeliveryPassRequested() {
        lock.withLock { deliveryPassRequested = true }
    }

    /// Claim a recorded request, `false` when there is nothing to claim.
    private func takeDeliveryPassRequest() -> Bool {
        lock.withLock {
            guard deliveryPassRequested else { return false }
            deliveryPassRequested = false
            return true
        }
    }

    /// One read of the queue and the sends it owed, oldest first.
    ///
    /// Only ``requestDeliveryPass(ownSend:)`` may call this, which is what keeps a
    /// second copy of the loop from reading the queue while a send from the first is
    /// still open.
    private func runDeliveryPass() async -> ReplayReport {
        guard let transport = self.transport else { return .empty }
        let queue = lock.withLock { self.queue }
        guard let queue else { return .empty }
        // Nothing can be delivered to a producer whose contract this build cannot
        // read, and the queue already holds the bodies for a later attempt.
        let report = await queue.replay(using: transport) { entry, result in
            self.events.emit(.saveReplayed(subjectId: entry.subjectId, ok: result.isSuccess))
        } onDrop: { entry, error, outcome in
            // A pass that reported only deliveries would leave this entry missing
            // from both the queue and the record of what happened to it.
            self.events.emit(.error(Self.undeliverableSave(
                subjectId: entry.subjectId,
                error: error,
                outcome: outcome
            )))
        }
        if let error = report.lastError {
            events.emit(.error(error))
        }
        return report
    }

    // MARK: - Gate plumbing

    /// Keeps a per-category gate closure alive for as long as its registration.
    private final class GateSubscription: SnapshotObserver, @unchecked Sendable {
        private let category: OptionalConsentCategory
        private let onChange: @Sendable (Bool) -> Void
        private let stateLock = Lock()
        private var lastValue: Bool?
        init(category: OptionalConsentCategory, onChange: @escaping @Sendable (Bool) -> Void) {
            self.category = category
            self.onChange = onChange
        }

        func consentDidChange(_ snapshot: ConsentSnapshot) {
            let value = snapshot.effectivePermissions.value(for: category)
            let changed = stateLock.withLock {
                let previous = lastValue
                lastValue = value
                return previous != value
            }
            if changed {
                onChange(value)
            }
        }
    }

    /// Keeps a per-category decision gate alive for as long as its registration, and
    /// keeps its callback in order.
    ///
    /// The decision is what changed, not the snapshot: a revision that rewrites the
    /// prompt or the location without moving this category's permission must not wake a
    /// gate. One lock over the last delivered decision, held for the comparison alone,
    /// which is what makes the registration seed and a concurrent publication unable to
    /// arrive out of order.
    private final class DecisionGateSubscription: SnapshotObserver, @unchecked Sendable {
        private let category: ConsentCategory
        private let onChange: @Sendable (ConsentDecision) -> Void
        private let stateLock = Lock()
        private var lastDecision: ConsentDecision?

        init(
            category: ConsentCategory,
            onChange: @escaping @Sendable (ConsentDecision) -> Void
        ) {
            self.category = category
            self.onChange = onChange
        }

        /// Deliver the decision in force at registration, unless a publication already
        /// delivered a newer one while the registration was being wired up.
        func deliverInitial(_ decision: ConsentDecision) {
            let shouldDeliver = stateLock.withLock {
                guard lastDecision == nil else { return false }
                lastDecision = decision
                return true
            }
            if shouldDeliver {
                onChange(decision)
            }
        }

        func consentDidChange(_ snapshot: ConsentSnapshot) {
            let decision = ConsentDecision(snapshot: snapshot, category: category)
            let changed = stateLock.withLock {
                let previous = lastDecision
                lastDecision = decision
                return previous != decision
            }
            if changed {
                onChange(decision)
            }
        }
    }
}

extension Result {
    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }
}

extension CommitIntent {
    var action: ConsentAction {
        switch self {
        case .all: return .all
        case .necessary: return .necessary
        case .custom: return .custom
        }
    }
}
