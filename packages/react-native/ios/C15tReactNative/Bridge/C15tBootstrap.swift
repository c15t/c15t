import C15tCore
import Foundation

/// Everything the iOS bridge needs from the host app, read from `Info.plist`.
///
/// The consent core needs a store, a transport, and a language before the first
/// JavaScript frame, which is before any Swift or JavaScript the app writes has run.
/// `Info.plist` is the one place available that early, it is what Expo already
/// surfaces through `app.json`'s `ios.infoPlist`, and it keeps the Android and iOS
/// set-up stories the same shape: declare the backend, install, rebuild.
///
/// An app that needs more than these keys can install a configured core itself with
/// ``C15tReactNativeBootstrap/install(_:)`` and set `com.c15t.reactnative.AutoBootstrap`
/// to `false`.
public struct C15tBridgeConfiguration: Sendable, Equatable {
    /// How the core reaches a backend.
    ///
    /// The raw values are the spellings accepted in `Info.plist`, which is why
    /// `self-hosted` is kebab-case: an `Info.plist` value is typed by hand, and
    /// `selfHosted` is the kind of thing people write as `self-hosted`.
    public enum TransportMode: String, Sendable {
        /// The c15t cloud project URL in `com.c15t.backend.url`.
        case hosted = "hosted"
        /// A self-hosted `@c15t/backend` base URL, same wire.
        case selfHosted = "self-hosted"
        /// Never send. Saves queue up and apply locally.
        case offline = "offline"
        /// No transport at all: async commands become no-ops. For preview builds.
        ///
        /// Named `disabled`, not `none`. An enum case called `none` is shadowed by
        /// `Optional.none` wherever an optional mode is in scope, which the Xcode
        /// compiler rejects outright; the `Info.plist` spelling stays `none`.
        case disabled = "none"

        /// Read a mode name tolerantly, so casing and separator choices in the plist
        /// do not silently fall back to a different mode.
        ///
        /// - Returns: The mode, or `nil` for a name this build does not know. An
        ///   unknown name is treated as "not declared" and inferred from the URL.
        public static func parse(_ raw: String) -> TransportMode? {
            switch raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
            case "hosted", "host", "cloud": return .hosted
            case "self-hosted", "selfhosted", "self_hosted": return .selfHosted
            case "offline": return .offline
            case "none": return .disabled
            default: return nil
            }
        }
    }

    /// Where the snapshot envelope and consent records live.
    public enum StorageMode: String, Sendable {
        /// Keychain generic password items. The contract's requirement, and the default.
        case keychain = "keychain"
        /// Application Support. Development only: consent is readable without the
        /// Keychain's protections, and a device backup carries it.
        case file = "file"
        /// Nothing survives relaunch. Tests and preview builds.
        case memory = "memory"

        /// Read a storage name tolerantly, the same way ``TransportMode/parse(_:)``
        /// does, so a typo becomes the Keychain rather than a plaintext store.
        public static func parse(_ raw: String) -> StorageMode? {
            switch raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() {
            case "keychain": return .keychain
            case "file", "disk": return .file
            case "memory", "in-memory": return .memory
            default: return nil
            }
        }
    }

    /// Build a configuration directly, for a host that wants to start the core from
    /// code rather than from `Info.plist`.
    ///
    /// Every parameter is defaulted so an app that only cares about the backend names
    /// the two fields that matter and inherits the contract's defaults elsewhere.
    public init(
        autoBootstrap: Bool = true,
        transportMode: TransportMode = .offline,
        backendURL: URL? = nil,
        initURL: URL? = nil,
        domain: String? = nil,
        storageMode: StorageMode = .keychain,
        keychainService: String = C15tBridgeConfiguration.defaultKeychainService,
        overrides: ConsentOverrides = .default(),
        consentCategories: [ConsentCategory]? = nil,
        gpc: Bool? = nil
    ) {
        self.autoBootstrap = autoBootstrap
        self.transportMode = transportMode
        self.backendURL = backendURL
        self.initURL = initURL
        self.domain = domain
        self.storageMode = storageMode
        self.keychainService = keychainService
        self.overrides = overrides
        self.consentCategories = consentCategories
        self.gpc = gpc
    }

    /// Whether the launch hook should start the core.
    public var autoBootstrap: Bool
    public var transportMode: TransportMode
    /// Hosted project URL or self-hosted base URL, depending on `transportMode`.
    public var backendURL: URL?
    /// The URL used for `GET /init`, or `nil` for `${backendURL}/init`.
    ///
    /// The override exists for a same-origin proxy that resolves init from its own
    /// route while consent saves still go to the backend. It is honoured exactly the
    /// way `@c15t/core` and the Android core honour theirs: the value is used as
    /// given, and only an absent key falls back to `${backendURL}/init`.
    public var initURL: URL?
    /// The `domain` field sent on `POST /subjects`.
    public var domain: String?
    public var storageMode: StorageMode
    public var keychainService: String
    public var overrides: ConsentOverrides
    /// Categories to offer. `nil` uses the full policy scope.
    public var consentCategories: [ConsentCategory]?
    /// The host app's Global Privacy Control signal, or `nil` when it has none.
    public var gpc: Bool?

    /// Keys read out of `Info.plist`. All optional.
    public enum InfoPlistKey {
        public static let autoBootstrap = "com.c15t.reactnative.AutoBootstrap"
        public static let backendURL = "com.c15t.backend.url"
        public static let transportMode = "com.c15t.backend.mode"
        public static let domain = "com.c15t.backend.domain"
        public static let initURL = "com.c15t.backend.initUrl"
        public static let storageMode = "com.c15t.storage"
        public static let keychainService = "com.c15t.keychain.service"
        public static let country = "com.c15t.country"
        public static let region = "com.c15t.region"
        public static let language = "com.c15t.language"
        public static let categories = "com.c15t.categories"
        public static let gpc = "com.c15t.gpc"
    }

    /// A key a host app may still have in `Info.plist` that this build does not model.
    ///
    /// `replacement` is why the pair exists: the useful answer to a retired key is not
    /// "ignored", it is "here is what to write instead". Dropping the key quietly would
    /// leave a host believing a mode was on that nothing turned on.
    public struct RetiredInfoPlistKey: Sendable, Equatable {
        public let key: String
        public let replacement: String

        public init(key: String, replacement: String) {
            self.key = key
            self.replacement = replacement
        }
    }

    /// The retired keys this build looks for, and the key a host should write instead.
    ///
    /// `com.c15t.test` set the publisher test mode the first draft of
    /// `native/CONTRACT.md` described as an override. It never was one: test mode is a
    /// client option that never reaches a save body, and ``ConsentOverrides`` has no
    /// property for it. ``RetiredEnvelope`` refuses a stored envelope that carries
    /// `overrides.test`; refusing the plist key here is the same rule on the way in.
    /// `com.c15t.gpc` is offered because it is the key a host reaching for test mode
    /// usually wants, and it is the GPC signal, which is a different thing: it feeds
    /// the core's detection, never ``ConsentOverrides/gpc``. The Expo config plugin
    /// writes none of these keys.
    public static let retiredInfoPlistKeys: [RetiredInfoPlistKey] = [
        RetiredInfoPlistKey(key: "com.c15t.test", replacement: "com.c15t.gpc"),
    ]

    /// The retired keys present in `infoPlist`, in declaration order.
    public static func retiredKeys(in infoPlist: [String: Any]) -> [RetiredInfoPlistKey] {
        retiredInfoPlistKeys.filter { infoPlist[$0.key] != nil }
    }

    /// The reason this build will not start a core from `infoPlist`, or `nil`.
    ///
    /// - Returns: An error naming every retired key found and what replaces it. It is
    ///   the same sentence the launch hook logs and the module reports, so the console
    ///   and the JavaScript rejection cannot disagree.
    public static func retirementIssue(in infoPlist: [String: Any]) -> C15tBridgeError? {
        let retired = retiredKeys(in: infoPlist)
        guard !retired.isEmpty else { return nil }
        let named = retired
            .map { "\($0.key) (use \($0.replacement) instead)" }
            .joined(separator: ", ")
        return C15tBridgeError(
            code: "C15T_CONFIGURATION_RETIRED",
            message: "Info.plist declares the retired key(s) \(named), which this build does "
                + "not reinterpret: publisher test mode is a client option that never reaches "
                + "a save body, and there is no test-mode override in the protocol. The "
                + "consent core was not started, so consent reads deny-all until the key is "
                + "removed or the core is installed from code."
        )
    }

    /// The default Keychain service, which matches the core's own default so a core
    /// installed by the app and one installed by the bridge read the same items.
    public static let defaultKeychainService = "com.c15t.core"

    /// Read the configuration a host app declared.
    ///
    /// Bad values fall back to the safe option rather than failing the launch: an
    /// unparseable storage mode becomes the Keychain, and a malformed URL becomes no
    /// transport, which keeps consent local instead of sending it somewhere the app
    /// did not intend.
    ///
    /// - Parameter infoPlist: The bundle's `Info.plist`, `Bundle.main.infoDictionary`
    ///   by default.
    public static func from(infoPlist: [String: Any] = Bundle.main.infoDictionary ?? [:]) -> C15tBridgeConfiguration {
        let urlString = (infoPlist[InfoPlistKey.backendURL] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let url = (urlString?.isEmpty == false) ? URL(string: urlString!) : nil

        // An empty string is a value that parses to nothing, so it stays absent, which
        // is the same call `backendURL` makes about an empty string.
        let initURLString = (infoPlist[InfoPlistKey.initURL] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let initURL = (initURLString?.isEmpty == false) ? URL(string: initURLString!) : nil

        let declaredMode = (infoPlist[InfoPlistKey.transportMode] as? String)
            .flatMap(TransportMode.parse(_:))
        // An unreadable mode string is an unreadable mode, not a request to go
        // offline. A URL without a declared mode is hosted: that is the common case,
        // and guessing `offline` would silently stop a working integration syncing.
        let mode = declaredMode ?? (url == nil ? .offline : .hosted)

        let deviceLanguage = Locale.preferredLanguages.first ?? C15tPayload.defaultLanguage
        let language = (infoPlist[InfoPlistKey.language] as? String)
            .flatMap { $0.isEmpty ? nil : $0 } ?? deviceLanguage

        let categories = (infoPlist[InfoPlistKey.categories] as? [String])?
            .compactMap { ConsentCategory(rawValue: $0) }

        return C15tBridgeConfiguration(
            autoBootstrap: (infoPlist[InfoPlistKey.autoBootstrap] as? Bool) ?? true,
            transportMode: mode,
            backendURL: url,
            initURL: initURL,
            domain: infoPlist[InfoPlistKey.domain] as? String,
            storageMode: (infoPlist[InfoPlistKey.storageMode] as? String)
                .flatMap(StorageMode.parse(_:)) ?? .keychain,
            keychainService: (infoPlist[InfoPlistKey.keychainService] as? String)
                .flatMap { $0.isEmpty ? nil : $0 } ?? defaultKeychainService,
            overrides: ConsentOverrides(
                country: infoPlist[InfoPlistKey.country] as? String,
                region: infoPlist[InfoPlistKey.region] as? String,
                language: language,
                gpc: nil
            ),
            consentCategories: categories?.isEmpty == true ? nil : categories,
            gpc: infoPlist[InfoPlistKey.gpc] as? Bool
        )
    }

    /// Build the core configuration this maps to.
    ///
    /// - Returns: The config, or `nil` when the storage mode cannot be honoured, such
    ///   as a Keychain on a platform without one. Starting with an unencrypted store
    ///   because the intended one is unavailable is not a fallback this makes quietly.
    public func makeCoreConfiguration(fileStoreDirectory: URL? = nil) -> CoreConfig? {
        guard let store = makeStore(fileStoreDirectory: fileStoreDirectory) else { return nil }
        return CoreConfig(
            store: store,
            transport: makeTransport(),
            consentCategories: consentCategories,
            overrides: overrides,
            gpc: gpc
        )
    }

    /// The store for this configuration, or `nil` when the requested one is
    /// unavailable.
    public func makeStore(fileStoreDirectory: URL? = nil) -> (any ConsentStore)? {
        switch storageMode {
        case .memory:
            return InMemoryStore()
        case .file:
            if let fileStoreDirectory {
                return FileStore(directory: fileStoreDirectory)
            }
            return try? FileStore(namespace: Bundle.main.bundleIdentifier ?? "com.c15t")
        case .keychain:
            #if canImport(Security)
                return KeychainStore(service: keychainService)
            #else
                // No Keychain here. `nil` rather than a plaintext substitute.
                return nil
            #endif
        }
    }

    /// The transport for this configuration. `nil` means the core's async commands do
    /// nothing, which is what `com.c15t.backend.mode = none` asks for.
    public func makeTransport() -> (any C15tTransport)? {
        switch transportMode {
        case .disabled:
            return nil
        case .offline:
            return OfflineTransport.offline()
        case .hosted:
            guard let backendURL else { return OfflineTransport.offline() }
            return HostedTransport(baseURL: backendURL, initURL: initURL, domain: domain)
        case .selfHosted:
            guard let backendURL else { return OfflineTransport.offline() }
            return HostedTransport(baseURL: backendURL, initURL: initURL, domain: domain)
        }
    }
}

/// Starts the consent core ahead of React Native, once.
///
/// Hydration is the reason this exists as its own step: ``ConsentCore/bootstrap(_:)``
/// reads the stored envelope synchronously before it puts anything on a worker, so a
/// hook that runs before the runtime initializes means the first JavaScript frame
/// already resolves `getBootstrap()` and `getSnapshot()` against real stored consent
/// instead of an empty deny-all.
///
/// An app that owns its own set-up sets `com.c15t.reactnative.AutoBootstrap` to
/// `false`. The bridge then keeps answering reads deny-all until that app calls
/// ``start(configuration:)`` or ``install(_:)``, and works against whatever core is
/// installed afterwards.
public enum C15tReactNativeBootstrap {
    /// Start the core from the values in `Info.plist`.
    ///
    /// - Returns: `true` when a core is installed after the call.
    @discardableResult
    public static func start(
        infoPlist: [String: Any] = Bundle.main.infoDictionary ?? [:],
        fileStoreDirectory: URL? = nil
    ) -> Bool {
        let configuration = C15tBridgeConfiguration.from(infoPlist: infoPlist)
        guard configuration.autoBootstrap else { return C15t.current != nil }

        // A core the app installed itself outranks `Info.plist`, so the retired-key
        // check belongs to the only path that would build a core from that plist.
        // Refusing rather than starting with the recognised keys is the same call the
        // store makes about a retired stored envelope: a configuration this build
        // cannot read completely is not a configuration to start from, and deny-all
        // with one clear console line beats a consent state whose cause nobody can say.
        if C15t.current == nil, let issue = C15tBridgeConfiguration.retirementIssue(in: infoPlist) {
            NSLog("%@", "c15t: \(issue.message)")
            return false
        }

        return start(configuration: configuration, fileStoreDirectory: fileStoreDirectory)
    }

    /// Start the core with an explicit configuration.
    ///
    /// - Returns: `true` when a core is installed after the call.
    @discardableResult
    public static func start(
        configuration: C15tBridgeConfiguration,
        fileStoreDirectory: URL? = nil
    ) -> Bool {
        // The opt-out is honoured here as well as in the `Info.plist` entry point, so
        // `autoBootstrap == false` means "the app starts it" whichever door is used.
        guard configuration.autoBootstrap else { return C15t.current != nil }
        if let running = C15t.current {
            return running.isBootstrapped
        }
        guard let coreConfiguration = configuration.makeCoreConfiguration(fileStoreDirectory: fileStoreDirectory) else {
            return false
        }
        C15t.bootstrap(coreConfiguration)
        return C15t.current != nil
    }

    /// Adopt a core the app already built and started.
    ///
    /// This is the escape hatch for a host that configures stores, transports, or
    /// headers the `Info.plist` keys cannot express. Call it before the first
    /// JavaScript frame; the bridge attaches to this core and never builds its own.
    ///
    /// - Returns: `true` when `core` is the instance the bridge will use.
    @discardableResult
    public static func install(_ core: ConsentCore) -> Bool {
        C15t.install(core)
    }

    /// Whether a core is installed and started.
    public static var isRunning: Bool {
        guard let core = C15t.current else { return false }
        return core.isBootstrapped
    }
}
