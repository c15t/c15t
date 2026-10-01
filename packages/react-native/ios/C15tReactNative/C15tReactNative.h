/*
 C15tReactNative: the React Native binding for the c15t consent core.

 The public surface is the TurboModule, registered as `C15t` and implemented in Swift,
 plus `C15tReactNativeRuntime` for a host app that wants to start or install a core
 itself. Everything else in this target is internal to the binding.
 */

#import <Foundation/Foundation.h>

FOUNDATION_EXPORT double C15tReactNativeVersionNumber;
FOUNDATION_EXPORT const unsigned char C15tReactNativeVersionString[];
