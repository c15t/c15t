package com.c15t.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Registers [C15tReactNativeModule] for autolinking.
 *
 * React Native's autolinking finds this class by scanning the module sources for a
 * `ReactPackage`, so a host app adds nothing to `MainReactNativeHost`. This is the
 * New Architecture shape: the package hands out the module by name and publishes the
 * module info that marks it a TurboModule, and there are no view managers because
 * c15t renders its prompts in JavaScript. Nothing here keeps a bridge-era path
 * alive: the module is reachable only through Codegen's generated spec.
 */
class C15tReactNativePackage : BaseReactPackage() {
	override fun getModule(
		name: String,
		reactContext: ReactApplicationContext,
	): NativeModule? = if (name == MODULE_NAME) C15tReactNativeModule(reactContext) else null

	override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
		ReactModuleInfoProvider {
			mapOf(
				MODULE_NAME to ReactModuleInfo(
					MODULE_NAME,
					MODULE_CLASS_NAME,
					/* canOverrideExistingModule = */ false,
					/* needsEagerInit = */ false,
					/* isCxxModule = */ false,
					/* isTurboModule = */ true,
				),
			)
		}

	companion object {
		/** The name JavaScript looks this module up by, per `NATIVE_C15T_MODULE_NAME`. */
		const val MODULE_NAME = "C15t"

		private const val MODULE_CLASS_NAME = "com.c15t.reactnative.C15tReactNativeModule"
	}
}
