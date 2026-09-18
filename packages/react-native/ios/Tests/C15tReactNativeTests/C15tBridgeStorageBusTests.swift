import C15tCore
import C15tReactNativeBridge
import Foundation
import XCTest

/// The one bus fact this layer owns: a core the bridge installs carries a bus sink
/// that lands on standard `NSUserDefaults`.
///
/// `TcStorageBusTests` in `native/core-swift` proves the projection fills the two rows
/// a core can honestly fill, and that `UserDefaultsStorageBus` writes them with the
/// types the specification's readers use. What no test there can see is the
/// configuration a real app is actually given, and that is built here -- a bridge that
/// praised the bus in comments while passing `nil` would leave every one of those
/// tests green on a device that publishes no key to a single vendor SDK. So this
/// asserts through the defaults, not through the name of the type.
///
/// From a unit-test host the observable direction is the one a whole-table write always
/// takes. `makeCoreConfiguration` maps only the transport modes an `Info.plist` can
/// name, so the test cannot hand an installed core a vendor list for the
/// `IABTCF_PolicyVersion` row to follow -- the honest projection it holds is the empty
/// one. The assertion is therefore that rows a previous CMP left are gone from standard
/// defaults, twice: once from the launch commit and once from a commit of the core's
/// own afterwards. That fails both ways this wiring goes wrong. A core built without a
/// sink leaves a stale row standing, and a sink aimed at a suite rather than the
/// standard domain leaves it standing too, which is the same mistake with a different
/// excuse.
///
/// The core starts on a memory store on purpose. The bus follows an authoritative write
/// and never runs ahead of one, so a store whose writes a macOS test host can refuse
/// would make the bus write optional -- the `file` storage mode takes exactly that hit
/// here, because `Data.write` refuses the complete-file-protection option off iOS. The
/// bus and the store are separate seams, and this is the bus's test.
final class C15tBridgeStorageBusTests: XCTestCase {
    /// Out of the specification's table on purpose: `TcStorageBus` names what a wipe may
    /// touch, and a bus that cleared somebody else's Google key would be a worse bug
    /// than one that wrote nothing.
    private let foreignKey = "IABTCF_AddtlConsent"

    /// The three rows seeded here, i.e. every seeded key that the bus does own.
    private let seededSpecKeys: [String] = [
        TcStorageBusKeys.policyVersion,
        TcStorageBusKeys.gdprApplies,
        TcStorageBusKeys.tcString,
    ]

    override func setUp() {
        super.setUp()
        C15t.resetForTests()
        seedStaleRows()
    }

    override func tearDown() {
        C15t.resetForTests()
        for name in seededSpecKeys + [foreignKey] {
            UserDefaults.standard.removeObject(forKey: name)
        }
        super.tearDown()
    }

    func testInstalledCoreCarriesABusSinkOnStandardUserDefaults() {
        XCTAssertTrue(
            C15tReactNativeBootstrap.start(infoPlist: [
                C15tBridgeConfiguration.InfoPlistKey.storageMode: "memory",
                // No transport, so the bus writes this counts are the core's own rather
                // than whatever a launch that reached a backend decided to add.
                C15tBridgeConfiguration.InfoPlistKey.transportMode: "none",
            ])
        )
        guard let core = C15t.current else { return XCTFail("the bridge must install a core") }

        // The commit the bus is allowed to ride on. Without this the removals below could
        // only mean the defaults were never written to at all.
        XCTAssertTrue(core.hasStoredSnapshot, "the launch committed the core's state")

        assertStandardRowsGone(after: "the launch commit")
        XCTAssertEqual(
            UserDefaults.standard.string(forKey: foreignKey),
            "G-1",
            "a bus wipe addresses the specification's table and nobody else's"
        )

        // Re-seed and take a second commit, so the sink is shown live on the core's own
        // commit path rather than written once at launch and dropped.
        seedStaleRows()
        core.hydrate()

        assertStandardRowsGone(after: "a later commit")
        XCTAssertEqual(
            UserDefaults.standard.string(forKey: foreignKey),
            "G-1",
            "and still nobody else's keys on the second pass"
        )
    }

    // MARK: - Standard defaults, read the way a vendor SDK reads them

    /// The rows a CMP that is no longer on this device left behind, in the types the
    /// specification gives them: `Number` rows as integers, the TC String as text.
    private func seedStaleRows() {
        let defaults = UserDefaults.standard
        defaults.set(3, forKey: TcStorageBusKeys.policyVersion)
        defaults.set(1, forKey: TcStorageBusKeys.gdprApplies)
        defaults.set("CMP-before-c15t", forKey: TcStorageBusKeys.tcString)
        defaults.set("G-1", forKey: foreignKey)
    }

    private func assertStandardRowsGone(
        after step: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        for name in seededSpecKeys {
            XCTAssertNil(UserDefaults.standard.object(forKey: name), "\(name) survived \(step)", file: file, line: line)
        }
    }
}
