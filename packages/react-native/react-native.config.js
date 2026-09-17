// Autolinking for @c15t/react-native.
//
// This is a library's own configuration, so the entries go under `dependency.platforms`.
// The shape a *consuming app* writes is different (its `dependencies` map keys each package
// by name), and the CLI reads only `dependency.platforms` here: a file in the app shape
// parses, validates, and is then ignored, which is how this package shipped with an Android
// source directory that was never applied.
//
// The file is named `.js` and written as ESM, which is a fix rather than a preference. It
// used to be `.cjs`, on the reasoning that a `"type": "module"` package hides a plain `.js`
// from `require`. That is wrong for one of the two linkers that matters:
// `expo-modules-autolinking` looks for exactly `react-native.config.js` and
// `react-native.config.ts` and nothing else, so a `.cjs` config is simply never found. Expo
// then falls back to `sourceDir: 'android'`, whose `build.gradle.kts` declares no namespace,
// so the Java package parses to nothing and the whole package is dropped from
// `PackageList.java` without a warning. The community CLI searches `.js` before `.cjs` and
// loads it asynchronously, so ESM suits it as well. `scripts/react-native-autolink.ts` now
// asserts that both linkers resolve this package.
//
// The TurboModule bindings live in the `C15tReactNative` iOS target and the
// `com.c15t.reactnative` Android module, both shipped inside this package. The pure consent
// cores (`native/core-swift`, `native/core-android` in the monorepo) are dependencies of
// those targets, never autolinked directly.
export default {
	dependency: {
		platforms: {
			android: {
				// The library module, not the `android` directory above it. React Native
				// points the autolinked Gradle project at this path and works out the
				// library's Java package from two files in it: a `package` attribute in
				// `src/main/AndroidManifest.xml`, then a namespace declaration in this
				// directory's `build.gradle[.kts]`. The namespace is declared in
				// `build.gradle.kts` here, so this has to be the directory that file is
				// in. One level up, `react-native config` exits non-zero and the host
				// app's `settings.gradle` fails before it configures a single project.
				sourceDir: './android/c15t-react-native',
			},

			// iOS deliberately has no entry. A dependency's iOS config carries only the
			// podspec, its `configurations`, and `scriptPhases`; the podspec at the package
			// root is what the CLI discovers on its own, and it finds the right one.
			// Declaring an Xcode project here would be read by nothing.
		},
	},
};
