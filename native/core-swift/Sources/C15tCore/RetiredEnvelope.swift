import Foundation

/// Guard against stored envelopes written before the protocol was corrected.
///
/// `native/CONTRACT.md` first described overrides with a `test` field and privacy
/// signals as a `gpc`/`msa` boolean pair. Neither exists in the kernel, so a device
/// holding an envelope in that shape has stored something this build cannot name.
/// The honest options are reinterpret or discard, and reinterpreting is the wrong
/// one: `test` was never a GPC override, and a boolean `gpc` cannot say whether the
/// app or the device caused it. Serving a permission derived from a guessed field is
/// exactly what contract rule 5 forbids.
///
/// So each decoder that used those fields calls ``reject(_:ifPresentIn:)`` and
/// throws. ``ConsentStore`` read paths already treat an undecodable envelope as
/// nothing stored, which yields `ready: false`, `policyPending: true`, and every
/// optional category denied until the next `/init` resolves a real policy. The
/// subject id lives in its own item, so failing closed here does not cost the device
/// its identity.
enum RetiredEnvelope {
    /// The sentence every rejection ends with, so the log says what happens next.
    static let guidance =
        "a stored snapshot written by an older build cannot be read; consent resets to "
        + "deny-all and the next /init resolves it again"

    /// Throw when a key that exists only to be refused is present.
    ///
    /// `KeyedDecodingContainer.allKeys` reports the keys a type declares, never ones
    /// it does not, so a retired field is invisible unless its decoder keeps a coding
    /// key for it. Each type that retired a field declares that key in `CodingKeys`
    /// solely so this check can see it, and never decodes it.
    ///
    /// - Throws: `DecodingError.dataCorrupted` naming the field.
    static func reject<Key: CodingKey>(
        _ key: Key,
        ifPresentIn container: KeyedDecodingContainer<Key>
    ) throws {
        guard container.contains(key) else { return }
        throw DecodingError.dataCorrupted(
            DecodingError.Context(
                codingPath: container.codingPath,
                debugDescription: "stored value carries the retired field "
                    + "\"\(key.stringValue)\", which this build does not reinterpret: "
                    + guidance
            )
        )
    }

    /// Encode an optional as its value, or an explicit `null` when unset.
    ///
    /// The synthesized `encode(to:)` omits nils, which would hand the JavaScript
    /// layer `{country, language}` where the protocol declares four keys, while the
    /// Kotlin core writes all four. `native/CONTRACT.md` keeps an empty `iab` written
    /// as an explicit null for the same reason: a reader never branches on presence.
    static func write<Value: Encodable, Key: CodingKey>(
        _ value: Value?,
        forKey key: Key,
        in container: inout KeyedEncodingContainer<Key>
    ) throws {
        if let value {
            try container.encode(value, forKey: key)
        } else {
            try container.encodeNil(forKey: key)
        }
    }
}
