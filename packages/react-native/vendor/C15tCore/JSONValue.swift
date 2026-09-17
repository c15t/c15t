import Foundation

/// A lossless JSON tree.
///
/// Two parts of the core need JSON it cannot statically type: the raw
/// `policyResolution` wire value, which must be validated before any of it is
/// trusted, and opaque response fields (`translations`) that the core stores and
/// hands back untouched. Parsing into `JSONValue` instead of `Any` keeps the
/// fail-closed checks in one place and keeps the result `Sendable`.
public enum JSONValue: Sendable, Equatable {
    case null
    case bool(Bool)
    case number(Double)
    case integer(Int64)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    /// The value stored under `key`, or `nil` when this is not an object or the
    /// key is absent. Absent and explicit-null are distinguishable through
    /// ``object(_:)`` because only the latter stores `.null`.
    public subscript(key: String) -> JSONValue? {
        guard case let .object(fields) = self else { return nil }
        return fields[key]
    }

    public var arrayValue: [JSONValue]? {
        if case let .array(items) = self { return items }
        return nil
    }

    public var objectValue: [String: JSONValue]? {
        if case let .object(fields) = self { return fields }
        return nil
    }

    public var stringValue: String? {
        if case let .string(value) = self { return value }
        return nil
    }

    public var boolValue: Bool? {
        if case let .bool(value) = self { return value }
        return nil
    }

    /// Integral view of a number, `nil` unless the value is a whole number that
        /// fits `Int64`. Epoch milliseconds go through this so a float or a
    /// fractional timestamp never becomes a permission decision.
    public var intValue: Int64? {
        switch self {
        case let .integer(value): return value
        case let .number(value):
            guard value.isFinite, value == value.rounded(),
                  value >= Double(Int64.min), value <= Double(Int64.max)
            else { return nil }
            return Int64(value)
        default: return nil
        }
    }

    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }

    /// Strict string-set view: an array of strings with no repeats.
    /// The policy wire reader requires exactly that shape.
    var strictStringArray: [String]? {
        guard let items = arrayValue else { return nil }
        var seen = Set<String>()
        var result: [String] = []
        result.reserveCapacity(items.count)
        for item in items {
            guard let string = item.stringValue else { return nil }
            guard !seen.contains(string) else { return nil }
            seen.insert(string)
            result.append(string)
        }
        return result
    }
}

extension JSONValue: Codable {
    public init(from decoder: any Decoder) throws {
        if let container = try? decoder.singleValueContainer(), container.decodeNil() {
            self = .null
            return
        }
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Int64.self) {
            self = .integer(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Value is not representable as JSON"
            )
        }
    }

    public func encode(to encoder: any Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case let .bool(value): try container.encode(value)
        case let .integer(value): try container.encode(value)
        case let .number(value): try container.encode(value)
        case let .string(value): try container.encode(value)
        case let .array(value): try container.encode(value)
        case let .object(value): try container.encode(value)
        }
    }
}

/// JSON helpers shared by the transports and the persistence layer.
enum C15tJSON {
    /// Encoder used for every outbound body and stored envelope.
    ///
    /// `sortedKeys` makes the output a pure function of the value, which is what
    /// lets a queued payload be compared byte-for-byte across a relaunch.
    static let output: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }()

    static let input = JSONDecoder()

    static func encode(_ value: some Encodable) throws -> Data {
        try output.encode(value)
    }

    static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        try input.decode(type, from: data)
    }

    /// Parse untrusted response bytes. Returns `nil` rather than throwing so
    /// callers treat "not JSON" as just another shape to fail closed on.
    static func parse(_ data: Data) -> JSONValue? {
        try? input.decode(JSONValue.self, from: data)
    }

    static func encode(_ value: JSONValue) -> Data? {
        try? output.encode(value)
    }
}
