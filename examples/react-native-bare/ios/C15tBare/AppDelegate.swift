import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "C15tBare",
      in: window,
      launchOptions: demoLaunchOptions(launchOptions)
    )

    return true
  }

  // A headless run cannot answer the "Open in c15t Bare?" confirmation that iOS raises
  // before it hands an incoming `c15t-demo://` open to the app, and a CI machine has no
  // finger for it. The same link therefore also arrives as the `C15T_DEMO_LINK` variable,
  // which `simctl launch` passes through from its `SIMCTL_CHILD_` prefixed names.
  //
  // It enters as a launch URL rather than as a second channel, so JavaScript cannot tell
  // the two apart: `Linking.getInitialURL()` returns it and the verb table runs unchanged.
  // A link the OS already delivered wins, which keeps a tapped open authoritative.
  private func demoLaunchOptions(
    _ launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> [UIApplication.LaunchOptionsKey: Any] {
    var options = launchOptions ?? [:]

    if options[.url] == nil,
       let link = ProcessInfo.processInfo.environment["C15T_DEMO_LINK"],
       let url = URL(string: link) {
      options[.url] = url
    }

    return options
  }

  // Hand the demo link to React Native. `RCTLinkingManager` records the launch URL for
  // `Linking.getInitialURL()` and posts the event `Linking.addEventListener('url')`
  // listens for, which is how one verb reaches JavaScript on both platforms. Without
  // this method an incoming URL is dropped by the OS and the app never hears about it.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
