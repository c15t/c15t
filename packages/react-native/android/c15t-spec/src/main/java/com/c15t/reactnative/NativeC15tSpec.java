package com.c15t.reactnative;

import androidx.annotation.Nullable;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;

/**
 * Compile-time stand-in for the Codegen-generated {@code NativeC15tSpec}.
 *
 * <p>Source of truth is {@code ../../src/specs/NativeC15t.ts}. The real class is
 * produced by React Native Codegen in the build that runs Codegen, which for an app
 * is the app build, and this file is the same shape so a library can compile without
 * one. It is packaged nowhere: {@code :c15t-spec} is a {@code compileOnly}
 * dependency, so the app's generated class is the only one in a finished APK.
 *
 * <p>Signature rules follow Codegen, as observed from its output rather than guessed:
 * string arguments stay {@code String}, promise returns become a trailing
 * {@link Promise} parameter, synchronous returns get
 * {@code isBlockingSynchronousMethod}, and a TypeScript {@code number} arrives as the
 * primitive {@code double} rather than a boxed {@code Double}. That last one is a
 * Kotlin-visible difference and not a style choice: {@code Double} overrides the boxed
 * parameter and nothing else, so getting it wrong leaves a module that compiles against
 * this file and not against the generated one.
 *
 * <p>Two checks keep this honest.
 * {@code src/specs/__tests__/android-spec-surface.test.ts} generates the spec and
 * compares method names, argument types, return types, the blocking flag, and the
 * module name against what is written here;
 * {@code :c15t-react-native}'s {@code C15tModuleSurfaceTest} reflects over the compiled
 * bridge. The generator itself runs in the build with
 * {@code ./gradlew -Pc15t.spec.source=codegen :c15t-spec:assembleRelease}.
 */
public abstract class NativeC15tSpec extends ReactContextBaseJavaModule implements TurboModule {
	/** Name the JavaScript side looks this module up by. */
	public static final String NAME = "C15t";

	protected NativeC15tSpec(@Nullable ReactApplicationContext reactContext) {
		super(reactContext);
	}

	@Override
	public String getName() {
		return NAME;
	}

	@ReactMethod(isBlockingSynchronousMethod = true)
	public abstract String getBootstrap();

	@ReactMethod(isBlockingSynchronousMethod = true)
	public abstract String getSnapshot();

	@ReactMethod
	public abstract void commit(String intent, Promise promise);

	@ReactMethod
	public abstract void setOverrides(String overrides, Promise promise);

	@ReactMethod
	public abstract void dismissNotice();

	@ReactMethod
	public abstract void refresh(Promise promise);

	@ReactMethod
	public abstract void identify(String externalId, Promise promise);

	@ReactMethod
	public abstract void logout(Promise promise);

	@ReactMethod
	public abstract void addListener(String eventName);

	@ReactMethod
	public abstract void removeListeners(double count);
}
