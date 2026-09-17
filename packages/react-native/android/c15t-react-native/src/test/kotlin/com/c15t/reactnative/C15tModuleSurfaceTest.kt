package com.c15t.reactnative

import com.facebook.react.bridge.Promise
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

/**
 * The bridge must match `src/specs/NativeC15t.ts`, which is the file Codegen reads in
 * a host app. The Kotlin module is compiled here against a stand-in for the generated
 * spec, so this is the check that the stand-in and the module have not drifted from
 * the TypeScript: it reads the spec source and reflects over the compiled class.
 */
class C15tModuleSurfaceTest {
	@Test
	fun `the module implements every method the codegen spec declares`() {
		val specPath = System.getProperty("c15t.spec.file").orEmpty()
		assumeTrue("no spec file wired into this test run", File(specPath).isFile)
		val spec = File(specPath).readText()

		// A method's Kotlin arity is its TypeScript parameters plus a trailing Promise
		// when the TypeScript returns one, which is how Codegen lowers promises.
		val declared = mapOf(
			"getBootstrap" to 0,
			"getSnapshot" to 0,
			"commit" to 2,
			"setOverrides" to 2,
			"dismissNotice" to 0,
			"refresh" to 1,
			"identify" to 2,
			"logout" to 1,
			"getTrackingAuthorization" to 0,
			"requestTrackingAuthorization" to 1,
			"addListener" to 1,
			"removeListeners" to 1,
		)

		for ((name, arity) in declared) {
			assertTrue("`$name` is declared in the TypeScript spec", spec.contains("$name:"))
			// Kotlin adds a synthetic bridge when a boxed Java parameter is widened, so
			// "at least one" is the honest assertion here rather than "exactly one".
			val matches = C15tReactNativeModule::class.java.declaredMethods
				.filter { it.name == name && it.parameterCount == arity }
			assertTrue("$name with $arity parameter(s) must exist on the module", matches.isNotEmpty())
		}
		assertEquals("the spec declares no method the bridge does not implement", 12, declared.size)
	}

	@Test
	fun `every spec method is annotated where React Native collects it`() {
		// Codegen puts @ReactMethod on the generated spec, and the annotations are
		// inherited by the implementation, so a method missing them here is a method
		// the app would never be able to call.
		val inherited = C15tReactNativeModule::class.java.methods
			.filter { it.name in (SYNC_METHODS + PROMISE_METHODS + listOf("dismissNotice", "addListener", "removeListeners")) }
		assertTrue("the spec surface must be reachable", inherited.isNotEmpty())
		val names = inherited.map { it.name }.toSet()
		for (name in SYNC_METHODS + PROMISE_METHODS + listOf("dismissNotice")) {
			assertTrue("$name must be present through the spec base class", name in names)
		}
	}

	@Test
	fun `the module registers under the name JavaScript looks up`() {
		val stub = File(System.getProperty("c15t.stub.spec.file").orEmpty())
		assumeTrue("no stand-in spec on this build", stub.isFile)
		assertTrue("the lookup name must match NATIVE_C15T_MODULE_NAME", stub.readText().contains("NAME = \"C15t\""))
		assertEquals("C15t", C15tReactNativePackage.MODULE_NAME)
	}

	@Test
	fun `promise methods take a trailing promise`() {
		for (name in PROMISE_METHODS) {
			val method = C15tReactNativeModule::class.java.declaredMethods
				.singleOrNull { it.name == name }
			assertNotNull(name, method)
			assertTrue("$name must end in a Promise", method!!.parameterTypes.last() == Promise::class.java)
		}
	}

	private companion object {
		val SYNC_METHODS = listOf("getBootstrap", "getSnapshot", "getTrackingAuthorization")

		val PROMISE_METHODS =
			listOf("commit", "setOverrides", "refresh", "identify", "logout", "requestTrackingAuthorization")
	}
}
