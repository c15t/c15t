import Foundation

/// Why a category may or may not run, as a host app's own SDK code needs to hear it.
///
/// ``ConsentCore/isAllowed(_:)`` answers `false` both for a subject who refused and for
/// a device whose policy has not resolved, and those need opposite handling: a refused
/// category stays off, an unresolved one stays off *and keeps listening*. A boolean
/// cannot carry the difference, so a gate that cannot tell them apart either
/// initializes on an unknown or switches off forever a category that was going to be
/// granted. This enum is the difference.
///
/// `pending` is not a promise that an answer is coming. A first launch with no network
/// stays `pending` for the life of the process, which is the safe answer and the one
/// that keeps the SDK switched off. The core grows no timeout, because whatever number
/// it picked would become a legally loadable answer the policy never gave; a host that
/// cannot wait that long bounds the wait itself.
///
/// See "Native SDK gating" in `native/CONTRACT.md`.
public enum ConsentDecision: String, Sendable, Equatable, Hashable, CaseIterable {
    /// The resolved policy and the subject's c15t choice permit the category.
    case granted
    /// The subject, the policy, or a privacy signal refused the category.
    case denied
    /// Nothing has been decided yet: hydration or the first init is still outstanding.
    case pending
}

extension ConsentDecision {
    /// Derive the decision for `category` from `snapshot` and from nothing else.
    ///
    /// Derivation rather than storage is what keeps a gate from ever disagreeing with
    /// the state the UI is showing: both read the same ``ConsentSnapshot``, so there is
    /// no second copy of the answer to fall out of step. Three rules, in order:
    ///
    /// - `necessary` is ``granted``. It is not something anyone gets to take away.
    /// - While ``ConsentSnapshot/ready`` is false or ``ConsentSnapshot/policyPending``
    ///   is true, ``pending``. The device has not been told yet, so nothing may read
    ///   the current `false` as a refusal.
    /// - Otherwise ``granted`` where the effective permission is true, ``denied`` where
    ///   it is false.
    ///
    /// No platform authorization takes part. ATT on iOS and the `AD_ID` runtime
    /// permission on Android are platform gates rather than consent, so a device with
    /// ATT granted and consent refused is `denied` here exactly as it is on a device
    /// that never asked: the answer is a function of the resolved policy and the
    /// subject's c15t choice only.
    ///
    /// - Parameters:
    ///   - snapshot: The state to answer from. A value type, so the derivation always
    ///     sees one consistent set of flags rather than a half-updated pair.
    ///   - category: The category to answer for.
    public init(snapshot: ConsentSnapshot, category: ConsentCategory) {
        // `necessary` is a legal basis rather than a choice, so it is granted ahead of
        // both lifecycle flags: an unresolved policy has not refused it either.
        guard category != .necessary else {
            self = .granted
            return
        }
        if !snapshot.ready || snapshot.policyPending {
            self = .pending
            return
        }
        self = snapshot.effectivePermissions.value(for: category) ? .granted : .denied
    }
}
