import C15tCore
import Foundation

/// Why an async bridge call could not be carried out.
///
/// `code` is what JavaScript sees in the rejection, so the set is small and each one
/// names the fix.
public struct C15tBridgeError: Error, Equatable, Sendable {
    public let code: String
    public let message: String

    public init(code: String, message: String) {
        self.code = code
        self.message = message
    }

    /// No core is running, so nothing can be read or recorded.
    ///
    /// The message names both ways to end up here, because the launch hook that
    /// refuses a retired `Info.plist` key reports through the same answer as one that
    /// found no backend at all.
    public static let notBootstrapped = C15tBridgeError(
        code: "C15T_NOT_BOOTSTRAPPED",
        message: "c15t has no backend configured, so the consent core was not started. Set com.c15t.backend.url in Info.plist, or start the core yourself before React Native initializes. Check the console for a c15t configuration refusal if the key is already set."
    )

    /// The overrides document could not be read.
    public static let unreadableOverrides = C15tBridgeError(
        code: "C15T_OVERRIDES_REJECTED",
        message: "The overrides document could not be read, so nothing was changed."
    )

    /// The document carried a `gpc` that is neither a boolean nor null.
    ///
    /// Shares the rejection code with ``unreadableOverrides`` and differs in the
    /// message, because the caller's fix is one field rather than the whole document.
    public static let unreadableGpcOverride = C15tBridgeError(
        code: "C15T_OVERRIDES_REJECTED",
        message: "The overrides document carries a gpc that is neither true, false, nor null, so nothing was changed."
    )

    /// The overrides document names a field this build retired.
    ///
    /// Separate from ``unreadableOverrides`` on purpose: a host that sees this code has
    /// one line to delete, while the generic code means the document itself is
    /// malformed. The message names the field and the one that replaces it, so nobody
    /// has to guess whether an override they still believe is set actually applied.
    public static func retiredOverrides(_ fields: [String]) -> C15tBridgeError {
        C15tBridgeError(
            code: "C15T_OVERRIDES_RETIRED",
            message: "The overrides document carries the retired field(s) \(fields.joined(separator: ", ")), which this build does not reinterpret: publisher test mode is a client option and not an override, and v3 has no msa privacy signal. Send country, region, language, and gpc instead; nothing was changed."
        )
    }

    /// The core refused to re-resolve policy.
    public static let refreshFailed = C15tBridgeError(
        code: "C15T_REFRESH_FAILED",
        message: "The consent core could not re-resolve the policy."
    )

    /// The external id could not be attached.
    public static let identifyFailed = C15tBridgeError(
        code: "C15T_IDENTIFY_FAILED",
        message: "The subject could not be identified."
    )
}

/// Everything the TurboModule does, with no React Native in it.
///
/// The iOS module and the Kotlin module are both thin adapters over their core, and
/// the interesting failures live in the shared part: what a payload looks like on the
/// wire, which call needs a running core, what happens before one exists. Keeping
/// that here means it compiles and is tested outside an app build, and that the
/// RN-facing file stays a mapping between two type systems rather than a place where
/// consent behaviour can hide.
public struct C15tModuleHandler {
    /// Starts the core if no launch hook did. Injectable so a test can watch the
    /// call count instead of touching `Info.plist`.
    public let startCore: @Sendable () -> Bool

    public init(startCore: @escaping @Sendable () -> Bool = { C15tReactNativeBootstrap.start() }) {
        self.startCore = startCore
    }

    /// The `getBootstrap()` payload.
    ///
    /// Reads the snapshot the core already holds. It never waits for the network: the
    /// handshake has to answer during the first render, and a policy that has not
    /// resolved yet is already expressible as `policyPending`.
    public func bootstrapPayload() -> String {
        ensureCore()
        return C15tPayload.bootstrap(
            snapshot: C15t.snapshot(),
            hasStoredSnapshot: C15t.hasStoredSnapshot
        )
    }

    /// The `getSnapshot()` payload.
    public func snapshotPayload() -> String {
        ensureCore()
        return C15tPayload.snapshot(C15t.snapshot(), fallbackLanguage: deviceLanguage)
    }

    /// Apply a consent action, returning the `CommitResult` payload.
    ///
    /// An unreadable intent and a missing core both resolve rather than reject: the
    /// result type carries the reason, and JavaScript renders it.
    public func commitPayload(intent: String) -> String {
        guard let parsed = C15tPayload.parseCommitIntent(intent) else {
            return C15tPayload.invalidIntent(raw: intent)
        }
        guard ensureCore(), let core = C15t.current else {
            return C15tPayload.notBootstrapped()
        }
        return C15tPayload.commitResult(core.save(parsed), snapshot: core.snapshot())
    }

    /// Replace the geographic, language, and GPC overrides.
    ///
    /// Applied as a replacement rather than a merge, because the protocol
    /// distinguishes an explicit null from an omitted field and the core's own merge
    /// cannot. The core re-resolves policy as part of setting overrides.
    ///
    /// A refused document leaves the live overrides exactly as they were, which is the
    /// only reason a refusal can be readable at all: the caller can still ask.
    public func applyOverrides(_ json: String) -> Result<Void, C15tBridgeError> {
        guard ensureCore(), let core = C15t.current else { return .failure(.notBootstrapped) }
        switch C15tPayload.parseOverrides(json, current: core.currentOverrides) {
        case let .failure(error): return .failure(error)
        case let .success(overrides):
            core.setOverrides(overrides)
            return .success(())
        }
    }

    /// Record that the notice was dismissed. Local only, so nothing to reject.
    public func dismissNotice() {
        guard ensureCore(), let core = C15t.current else { return }
        core.dismissNotice()
    }

    /// Re-resolve policy and replay the offline queue.
    ///
    /// The contract says the JS-facing `refresh` covers the queue too, and the core's
    /// own refresh only re-runs init, so both go out here.
    public func refreshAll() -> Result<Void, C15tBridgeError> {
        guard ensureCore(), let core = C15t.current else { return .failure(.notBootstrapped) }
        core.refresh()
        core.flushPending()
        return .success(())
    }

    /// Attach an external id to the subject.
    public func identify(externalId: String) -> Result<Void, C15tBridgeError> {
        guard ensureCore(), let core = C15t.current else { return .failure(.notBootstrapped) }
        core.identify(KernelUser(externalId: externalId))
        return .success(())
    }

    /// Detach the external id. The c15t subject id is kept, so consent survives
    /// sign-out.
    public func logout() -> Result<Void, C15tBridgeError> {
        guard ensureCore(), let core = C15t.current else { return .failure(.notBootstrapped) }
        core.logout()
        return .success(())
    }

    /// Start the core if it is not running.
    ///
    /// - Returns: `true` when a core exists afterwards, so a caller can answer deny-all
    ///   rather than pretend.
    @discardableResult
    public func ensureCore() -> Bool {
        C15t.current != nil || startCore()
    }

    /// The device language, used when the snapshot has none.
    public var deviceLanguage: String {
        Locale.preferredLanguages.first ?? C15tPayload.defaultLanguage
    }
}
