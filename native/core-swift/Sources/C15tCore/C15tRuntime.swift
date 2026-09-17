import Foundation

/// The process-wide consent kernel, so a host app and its bindings share one core.
///
/// ``ConsentCore`` is a plain class, which means a React Native bridge and an
/// `AppDelegate` that both call `ConsentCore()` end up with two kernels over one
/// Keychain: two subject ids, two pending queues, two snapshots, and a write race
/// between them. This install point is what makes "attach to the running core"
/// possible instead of "start another one".
///
/// It mirrors the Kotlin `C15t` object, so a binding layer on either platform
/// reads the same way: install once, then reach the core through `current`.
///
/// Nothing here owns consent state. It holds a reference to the one ``ConsentCore``
/// and forwards reads, which keeps it out of the contract's "one kernel" rule
/// rather than making it a second one.
public final class C15t: @unchecked Sendable {
    private static let lock = Lock()
    private static var installed: ConsentCore?

    private init() {}

    /// Adopt a core the host app already owns.
    ///
    /// Call this before any binding layer starts when the app constructs and
    /// bootstraps its own kernel: the bindings then attach to it rather than
    /// installing a second one. Installing a second core while one is running
    /// returns `false` and leaves the running core alone, because silently
    /// swapping cores would orphan the subject id mid-session.
    ///
    /// - Parameter core: The core to publish as the process-wide instance.
    /// - Returns: `true` when `core` is the running instance after the call.
    @discardableResult
    public static func install(_ core: ConsentCore) -> Bool {
        lock.withLock {
            if let installed {
                return installed === core
            }
            installed = core
            return true
        }
    }

    /// Publish a core and start it with `config`.
    ///
    /// Convenience for the common case where nothing else owns the kernel. It is
    /// idempotent in the same way ``ConsentCore/bootstrap(_:)`` is: a second call
    /// returns the running core and ignores the new config, so two launch hooks
    /// cannot disagree about which store is authoritative.
    ///
    /// - Parameter config: Configuration to start with, used only on the call that
    ///   actually starts the core.
    /// - Returns: The running core.
    @discardableResult
    public static func bootstrap(_ config: CoreConfig) -> ConsentCore {
        let core = lock.withLock { () -> ConsentCore in
            if let installed {
                return installed
            }
            let created = ConsentCore()
            installed = created
            return created
        }
        core.bootstrap(config)
        return core
    }

    /// The running core, or `nil` before anything installed one.
    ///
    /// A binding layer that finds `nil` answers deny-all rather than starting a
    /// core with defaults it invented, which would put a store and a transport the
    /// app never chose behind a consent decision.
    public static var current: ConsentCore? {
        lock.withLock { installed }
    }

    /// The current snapshot, or a cold-start deny-all snapshot when no core runs.
    ///
    /// Failing closed here is deliberate: a caller that forgot to install a core
    /// gets the same answer as an un-hydrated cold start, which is the answer the
    /// contract requires when state is unavailable, rather than a crash or a guess.
    public static func snapshot() -> ConsentSnapshot {
        current?.snapshot() ?? .coldStart
    }

    /// Whether `category` may run, or `false` when no core runs.
    public static func isAllowed(_ category: ConsentCategory) -> Bool {
        guard let current else { return false }
        return current.isAllowed(category)
    }

    /// Whether the running core has consent on disk, or `false` with no core.
    public static var hasStoredSnapshot: Bool {
        current?.hasStoredSnapshot ?? false
    }

    /// Drop the installed core.
    ///
    /// Tests only. A production app installs once at launch and never needs this,
    /// and calling it mid-session strands any observer still holding the old core.
    public static func resetForTests() {
        lock.withLock { installed = nil }
    }
}
