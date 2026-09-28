#if canImport(C15tCore)
// SwiftPM builds the consent kernel as its own module. CocoaPods compiles the vendored
// copy into this module instead, where the import would fail, so it is conditional
// rather than assumed.
import C15tCore
#endif
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
///
/// The class deliberately omits the `NativeC15tSpec` conformance that the TypeScript
/// spec implies. Codegen emits that protocol into an ObjC++ umbrella header whose first
/// line is `#error This file must be compiled as Obj-C++`, so no Swift file can name it:
/// the conformance, and the `getTurboModule:` factory `RCTModuleProviders` requires, live
/// in `C15tReactNativeModule.mm`.
///
/// That split leaves one sharp edge. The generated JSI glue reaches this class by
/// `@selector`, and a selector that disagrees with the protocol still compiles, so every
/// method below states its Objective-C name rather than relying on inference, and
/// `src/specs/__tests__/ios-spec-surface.test.ts` fails the moment those names and the
/// protocol Codegen generates stop agreeing.
///
@objc(C15tReactNativeModule)
public final class C15tReactNativeModule: RCTEventEmitter {
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
    @objc(getBootstrap)
    public func getBootstrap() -> String {
        followCore()
        return handler.bootstrapPayload()
    }

    /// The current snapshot, encoded for the wire.
    @objc(getSnapshot)
    public func getSnapshot() -> String {
        followCore()
        return handler.snapshotPayload()
    }

    /// The platform tracking answer.
    ///
    /// No `followCore()`: this reads Apple, not the consent core, and the answer is the
    /// same whether or not a core was ever started. It is also not a consent read, and a
    /// host that treats it as one gets a category the subject never granted.
    @objc(getTrackingAuthorization)
    public func getTrackingAuthorization() -> String {
        handler.trackingAuthorizationPayload()
    }

    // MARK: - Async commands

    @objc(commit:resolve:reject:)
    public func commit(
        _ intent: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        followCore()
        resolve(handler.commitPayload(intent: intent))
    }

    @objc(setOverrides:resolve:reject:)
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
    @objc(dismissNotice)
    public func dismissNotice() {
        followCore()
        handler.dismissNotice()
    }

    @objc(refresh:reject:)
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

    @objc(identify:resolve:reject:)
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

    /// Ask Apple for tracking authorization.
    ///
    /// Nothing in this module calls it, and nothing else in the package does: the prompt
    /// belongs after the host's own consent UI, so that the system dialog is never the
    /// first thing a subject reads about tracking. It rejects when the build carries no
    /// prompt string, because Apple would then show nothing and spend the install's one
    /// dialog on a `denied` nobody chose.
    ///
    /// Resolves off Apple's callback, which is not the calling thread. Rationale: the
    /// promise blocks dispatch, and the alternative is a second hop that could queue behind
    /// the presentation this is waiting on.
    @objc(requestTrackingAuthorization:reject:)
    public func requestTrackingAuthorization(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        handler.requestTrackingAuthorization { result in
            switch result {
            case let .success(requestResult):
                resolve(C15tPayload.trackingRequestResult(requestResult))
            case let .failure(error):
                reject(error.code, error.message, nil)
            }
        }
    }

    @objc(logout:reject:)
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

    @objc(reset:reject:)
    public func reset(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        switch handler.reset() {
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

    @objc(addListener:)
    public override func addListener(_ eventName: String) {
        super.addListener(eventName)
        listenerCount += 1
        followCore()
    }

    @objc(removeListeners:)
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
