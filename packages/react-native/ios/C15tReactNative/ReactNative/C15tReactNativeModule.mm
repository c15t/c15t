/*
 * ObjC export shim for the Swift TurboModule.
 *
 * Codegen generates the protocol, the JSI glue, and the method metadata, but it does
 * not declare the class to the ObjC runtime, and it does not register a module name.
 * This file does those two things and nothing else: no method signatures are repeated
 * here, so there is no hand-written bridge to keep in step with the spec.
 *
 * `RCT_EXTERN_REMAP_MODULE` binds the name JavaScript looks up, `C15t`, to the Swift
 * class. It has to name the JS module explicitly because the class is
 * `C15tReactNativeModule`, and the spec registers `C15t`.
 *
 * The app's Codegen config must also map the module to this class, otherwise
 * `RCTModuleProviders` has no entry for `C15t` and the TurboModule lookup returns
 * nothing. In `package.json`:
 *
 *   "codegenConfig": {
 *     "ios": { "modules": { "C15t": { "className": "C15tReactNativeModule" } } }
 *   }
 */

#import "C15tReactNative-Swift.h"

#import <React/RCTBridgeModule.h>
#import <ReactCodegen/NativeC15tSpec.h>

RCT_EXTERN_REMAP_MODULE(C15t, C15tReactNativeModule, RCTEventEmitter)
