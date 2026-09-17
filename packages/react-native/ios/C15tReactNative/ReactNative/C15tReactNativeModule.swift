import C15tCore
#if canImport(C15tReactNativeBridge)
// SwiftPM builds the wire layer as its own module. CocoaPods compiles it into this
// module instead, where the import would fail, so it is conditional rather than
// assumed.
import C15tReactNativeBridge
#endif
import Foundation
import React

/// The `C15t` TurboModule: the JavaScript surface in `src/specs/NativeC15t.ts`,
/// forwarded call for call to the Swift consent core.
///
/// Nothing in here decides anything about consent. It reads state the core already
/// holds, forwards the actions the user took, and reports the results as the JSON the
/// JavaScript protocol expects. That is deliberate: there is one consent kernel, and a
/// rule repeated here would be a second one to keep honest. The behaviour lives in
/// `C15tModuleHandler`, which has no React Native in it.
///
/// Threading. ``getBootstrap()`` and ``getSnapshot()`` are synchronous methods and do
/// no disk or network work: the core keeps one immutable snapshot in memory, so a read
/// is a lock plus an encode. They never hop to a core queue and wait, which is the
/// deadlock the New Architecture warns about for a synchronous module method, and ad
/// SDKs call both on the main thread. Everything that could block returns a promise,
/// and those promises resolve as soon as the local commit is durable, with delivery
/// left to the core's own scheduler.
@objc(C15tReactNativeModule)
public final class C15tReactNativeModule: RCTEventEmitter, NativeC15tSpec {
    private let handler = C15tModuleHandler()

    /// Held as a property: the core keeps snapshot observers weakly, so somebody has
    /// to own the observer or the callbacks would silently stop.
    private lazy var subscriber = C15tCoreSubscriber(sink: C15tReactEmitterSink(module: self))

    /// Live JavaScript listeners. A snapshot event is only a hint to go and read, so
    /// with no subscriber it is dropped rather than queued.
    private var listenerCount = 0

    public override init() {
        super.init()
        followCore()
    }

    @available(*, unavailable)
    required public init?(bridge: RCTBridge) {
        fatalError("init(bridge:) is unavailable: this module is New Architecture only")
    }

    // MARK: - Synchronous reads

    /// Handshake payload: the cached snapshot, never a network wait.
    public func getBootstrap() -> String {
        followCore()
        return handler.bootstrapPayload()
    }

    /// The current snapshot, encoded for the wire.
    public func getSnapshot() -> String {
        followCore()
        return handler.snapshotPayload()
    }

    // MARK: - Async commands

    public func commit(
        _ intent: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        followCore()
        resolve(handler.commitPayload(intent: intent))
    }

    public func setOverrides(
        _ overrides: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        switch handler.applyOverrides(overrides) {
        case .success:
            resolve(nil)
        case let .failure(error):
            reject(error.code, error.message, nil)
        }
    }

    /// Record that the notice was dismissed. Local and synchronous: it never writes to
    /// the backend, so there is nothing to reject.
    public func dismissNotice() {
        followCore()
        handler.dismissNotice()
    }

    public func refresh(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        switch handler.refreshAll() {
        case .success:
            resolve(nil)
        case let .failure(error):
            reject(error.code, error.message, nil)
        }
    }

    public func identify(
        _ externalId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        switch handler.identify(externalId: externalId) {
        case .success:
            resolve(nil)
        case let .failure(error):
            reject(error.code, error.message, nil)
        }
    }

    public func logout(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        switch handler.logout() {
        case .success:
            resolve(nil)
        case let .failure(error):
            reject(error.code, error.message, nil)
        }
    }

    // MARK: - Events

    public override func supportedEvents() -> [String]! {
        [
            C15tPayload.eventSnapshot,
            C15tPayload.eventError,
            C15tPayload.eventInitialized,
        ]
    }

    public override func addListener(_ eventName: String) {
        super.addListener(eventName)
        listenerCount += 1
        followCore()
    }

    public override func removeListeners(_ count: Double) {
        super.removeListeners(count)
        listenerCount = max(0, listenerCount - Int(count))
    }

    /// Send one event to JavaScript.
    ///
    /// Called from the core's queues, and `RCTEventEmitter` hands the payload to the
    /// dispatcher, so no main-thread hop is needed here.
    fileprivate func publish(event: String, payload: String) {
        guard listenerCount > 0 else { return }
        sendEvent(withName: event, body: payload)
    }

    // MARK: - Lifecycle

    public override static func requiresMainQueueSetup() -> Bool {
        false
    }

    public override func invalidate() {
        subscriber.detach()
        super.invalidate()
    }

    /// Start the core if no launch hook did, and follow it.
    ///
    /// Both are idempotent. A host that set the opt-out flag and never installed a
    /// core keeps getting deny-all answers, which is the contract's answer for state
    /// that does not exist.
    private func followCore() {
        guard handler.ensureCore(), let core = C15t.current else { return }
        subscriber.attach(to: core)
    }
}

/// Bridges the pump to `RCTEventEmitter`, holding the module weakly so the observer
/// the core retains does not keep a torn-down module alive.
private final class C15tReactEmitterSink: C15tEventSink, @unchecked Sendable {
    private weak var module: C15tReactNativeModule?

    init(module: C15tReactNativeModule) {
        self.module = module
    }

    func emit(event: String, payload: String) {
        module?.publish(event: event, payload: payload)
    }
}
