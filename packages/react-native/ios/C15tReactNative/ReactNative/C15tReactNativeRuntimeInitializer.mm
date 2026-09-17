/*
 * Starts the consent core before React Native initializes.
 *
 * Hydration is a synchronous Keychain read plus a decode, and the contract needs the
 * first JavaScript frame to be able to answer `getSnapshot()` against stored consent.
 * A constructor runs when this image is loaded, which is before
 * `application(_:didFinishLaunchingWithOptions:)`, before `RCTHost` is created, and
 * long before the bundle evaluates, so it is the one hook in a library that needs no
 * app wiring to be early enough.
 *
 * `C15tReactNativeBootstrap.start` is a no-op when the app set
 * `com.c15t.reactnative.AutoBootstrap` to `false`, and no-op when a core is already
 * installed, which is what makes it safe to leave unconditional.
 *
 * Two known edges, both of which fail closed rather than guess:
 *
 * - A background launch before the first unlock cannot read the Keychain. Hydration
 *   then finds nothing and the core answers deny-all until `refresh()` or the next
 *   launch, which is the same outcome as a store wipe.
 * - The cost is on the launch path by design: it is the same synchronous work the
 *   first `getBootstrap()` would have paid, moved earlier so it lands off the first
 *   render instead of inside it.
 */

#import <Foundation/Foundation.h>

#import "C15tReactNative-Swift.h"

__attribute__((constructor)) static void C15tReactNativeStartCoreEarly(void) {
    [C15tReactNativeRuntime startCoreIfNeeded];
}
