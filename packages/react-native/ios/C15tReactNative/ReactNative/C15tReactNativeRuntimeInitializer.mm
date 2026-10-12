/*
 * Starts the consent core before React Native initializes.
 *
 * Hydration is a synchronous Keychain read plus a decode, and the contract needs the
 * first JavaScript frame to be able to answer `getSnapshot()` against stored consent.
 * This runs when the image loads, which is before
 * `application(_:didFinishLaunchingWithOptions:)`, before `RCTHost` is created, and
 * long before the bundle evaluates, so it is the one hook in a library that needs no
 * app wiring to be early enough.
 *
 * `C15tReactNativeBootstrap.start` is a no-op when the app set
 * `com.c15t.reactnative.AutoBootstrap` to `false`, and no-op when a core is already
 * installed, which is what makes it safe to leave unconditional.
 *
 * The work hangs off an Objective-C class instead of a bare
 * `__attribute__((constructor))`, and that is a linker requirement rather than a style
 * preference. CocoaPods builds this pod as a static archive, and the linker takes an
 * archive member only when something references it, or when the host links `-ObjC` and
 * the member defines an Objective-C class or category. A file whose only content is a
 * constructor satisfies neither test, so the linker dropped this member from the app
 * image and the core came up when JavaScript first asked for it, which is the behaviour
 * this file exists to prevent. In a built app the symptom is checkable without running
 * anything: the linked image carried no `__TEXT,__init_offsets` section at all, while the
 * pod's own classes were present in it.
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

// The generated Swift interface declares the TurboModule, whose superclass is
// RCTEventEmitter, so React has to be visible before that header is read. Any file that
// imports the Swift interface needs this; the class below does not use it itself.
#import <React/RCTEventEmitter.h>

#import "C15tReactNative-Swift.h"

@interface C15tReactNativeEarlyStart : NSObject
@end

@implementation C15tReactNativeEarlyStart

// The only reason this class exists is that it is a class: defining it is what makes the
// linker keep the member this file compiles into, and `+load` is what makes the start
// happen without any app calling it. Nothing sends this class a message, and a host that
// would rather start the core itself sets `com.c15t.reactnative.AutoBootstrap` to false
// rather than deleting this.
+ (void)load {
    [C15tReactNativeRuntime startCoreIfNeeded];
}

@end
