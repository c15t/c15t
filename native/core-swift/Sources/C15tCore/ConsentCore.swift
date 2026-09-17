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
    private var detectedGPC = false
    /// Highest revision already written to the store, so a slow write of an older
    /// envelope cannot land on top of a newer one.
    private var persistedRevision = 0
    /// Whether the last ``hydrate()`` found an envelope on disk. Backs
    /// ``hasStoredSnapshot``, which a binding layer reports in its handshake.
    private var restoredFromStore = false
    private var inFlightWork = 0
    private var idleWaiters: [CheckedContinuation<Void, Never>] = []
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
            schedule { await self.replayQueue() }
        }
        scheduleInit(attempt: 1)
    }

    /// Whether ``bootstrap(_:)`` has taken effect.
    public var isBootstrapped: Bool {
        lock.withLock { bootstrapped }
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
    @discardableResult
    public func save(_ intent: CommitIntent) -> CommitResult {
        // Captured first: a save that took 40 ms to build a body must still report
        // the instant the subject acted.
        let actionAt = (lock.withLock { config }?.now ?? Self.wallClock)()

        struct Planned {
            let payload: SavePayload
            let body: Data
            let result: CommitResult
        }

        let prepared: Result<Planned, CoreErrorInfo> = lock.withLock {
            guard config != nil else {
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
            let next = currentSnapshot.byApplying { draft in
                draft.explicitChoice = choice
                draft.effectivePermissions = evaluation.permissions
                draft.restrictions = evaluation.restrictions
                draft.promptRequirement = evaluation.promptRequirement
                draft.nextDeadline = evaluation.nextDeadline
                draft.evaluatedAt = actionAt
                draft.model = resolved.policy.model
                // Visibility follows the remaining obligation, not the fact that an
                // action was taken: a choice save under a notice rule still owes the
                // notice, so the first layer stays. Same rule as `deriveActiveUI`.
                draft.activeUI = evaluation.promptRequirement.kind == .none
                    ? ActiveUI.none
                    : ActiveUI.banner
                draft.error = nil
            }
            currentSnapshot = next

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
                model: resolved.policy.model,
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
            publish(persist: true)

            // Persist, then send. The queue write is synchronous and lands before
            // `save` returns, so a process that dies here still has the action on
            // disk; an entry that failed to persist is never sent, because
            // delivering something nothing remembers is how duplicates happen.
            guard let queue = lock.withLock({ self.queue }) else { return plan.result }
            let queuedID = queue.enqueue(
                body: plan.body,
                subjectId: plan.payload.subjectId,
                actionAt: plan.payload.confirmed.actionAt
            )
            guard let queuedID else {
                events.emit(.error(CoreErrorInfo(
                    code: "queue-write-failed",
                    message: "Pending save could not be persisted, so it was not sent."
                )))
                return plan.result
            }

            events.emit(.saveQueued(subjectId: plan.payload.subjectId))
            let body = plan.body
            let subjectId = plan.payload.subjectId
            schedule {
                guard let transport = self.transport else {
                    // No transport: the entry stays queued for whichever launch
                    // finally has one.
                    return
                }
                switch await transport.sendSave(body) {
                case .success:
                    queue.remove(id: queuedID)
                    self.events.emit(.saveDelivered(subjectId: subjectId))
                case let .failure(error):
                    // Leave it queued with one attempt spent. The decision is
                    // already local and durable; the backend can wait.
                    self.events.emit(.error(error.info))
                }
            }
            return plan.result
        }
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
            reevaluateLocked(now: (config?.now ?? Self.wallClock)())
            return true
        }
        guard changed else { return }
        publish(persist: true)
        refresh()
    }

    /// Retry everything the queue is holding. Call on launch, on foreground, and on
    /// a reachability change.
    public func flushPending() {
        schedule { await self.replayQueue() }
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
        let identity = SubjectIdentity.loadOrCreate(from: config.store)
        let envelopeData = config.store.data(for: StorageKey.snapshot)
        let envelope = envelopeData.flatMap(StoredEnvelope.decode)

        let restored = lock.withLock { () -> ConsentSnapshot in
            self.identity = identity
            self.restoredFromStore = envelope != nil

            var draft = ConsentSnapshot.Draft(current: envelope?.snapshot ?? .coldStart)
            draft.subject = identity.snapshot(externalId: self.user?.externalId)
            draft.overrides = overrides
            draft.consentCategories = config.consentCategories
            draft.ready = envelope != nil

            self.policyWire = envelope?.policyResolution
            self.noticeDismissal = envelope?.noticeDismissal

            if let wire = envelope?.policyResolution {
                switch PolicyWireReader.read(wire) {
                case let .resolved(resolved):
                    self.resolvedPolicy = resolved
                    draft.resolution = resolved.resolution
                    draft.model = resolved.policy.model
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
            draft.model = resolved.policy.model
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
                draft.model = resolved.policy.model
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

            currentSnapshot = draft.build(revision: currentSnapshot.revision + 1)
        }

        publish(persist: true)
        if let error = snapshot().error {
            events.emit(.error(error))
        }
        // A save queued while the policy was still pending, or while the transport
        // was unreachable, gets another pass now that init has answered.
        schedule { await self.replayQueue() }
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

    private func replayQueue() async {
        guard let transport = self.transport else { return }
        let queue = lock.withLock { self.queue }
        guard let queue else { return }
        // Nothing can be delivered to a producer whose contract this build cannot
        // read, and the queue already holds the bodies for a later attempt.
        let report = await queue.replay(using: transport) { entry, result in
            self.events.emit(.saveReplayed(subjectId: entry.subjectId, ok: result.isSuccess))
        }
        if let error = report.lastError {
            events.emit(.error(error))
        }
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
