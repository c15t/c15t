import C15tCore
import C15tReactNativeBridge
import Foundation
import XCTest

/// A sink that records what the pump decided to send, in order.
final class RecordingSink: C15tEventSink, @unchecked Sendable {
    private let lock = NSLock()
    private var received: [(event: String, payload: String)] = []

    func emit(event: String, payload: String) {
        lock.lock()
        received.append((event, payload))
        lock.unlock()
    }

    var events: [String] {
        lock.lock()
        defer { lock.unlock() }
        return received.map(\.event)
    }

    func payloads(for event: String) -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return received.filter { $0.event == event }.map(\.payload)
    }
}

/// Parse a bridge payload back into a dictionary so assertions name fields instead
/// of comparing whole strings.
func jsonObject(_ raw: String) -> [String: Any] {
    guard let data = raw.data(using: .utf8),
          let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
        XCTFail("payload is not a JSON object: \(raw)")
        return [:]
    }
    return parsed
}

/// Assert a key is present and holds a real JSON null.
///
/// `JSONSerialization` hands back `NSNull` for null, so `XCTAssertNil` would pass on
/// a key that is simply absent, which is the exact distinction the protocol cares
/// about. This checks presence and null separately.
func assertJSONNull(_ payload: [String: Any], _ key: String, file: StaticString = #filePath, line: UInt = #line) {
    XCTAssertTrue(payload.keys.contains(key), "\(key) must be present", file: file, line: line)
    XCTAssertTrue(payload[key] is NSNull, "\(key) must be explicit null, got \(String(describing: payload[key]))", file: file, line: line)
}

/// Assert a bridge call failed with the expected reason.
///
/// `Result<Void, _>` is not `Equatable`, so comparing the failure by hand is the only
/// way to check the reason rather than merely that something went wrong.
func assertBridgeFailure<ResultType>(
    _ result: Result<ResultType, C15tBridgeError>,
    _ expected: C15tBridgeError,
    file: StaticString = #filePath,
    line: UInt = #line
) {
    guard case let .failure(error) = result else {
        return XCTFail("expected \(expected.code), got success", file: file, line: line)
    }
    XCTAssertEqual(error, expected, file: file, line: line)
}

/// A memory-backed configuration, so no test touches the Keychain or the network.
func memoryConfiguration() -> C15tBridgeConfiguration {
    C15tBridgeConfiguration(
        autoBootstrap: true,
        transportMode: .disabled,
        backendURL: nil,
        domain: nil,
        storageMode: .memory,
        keychainService: C15tBridgeConfiguration.defaultKeychainService,
        overrides: ConsentOverrides(country: nil, region: nil, language: "de", gpc: nil),
        consentCategories: nil,
        gpc: nil
    )
}
