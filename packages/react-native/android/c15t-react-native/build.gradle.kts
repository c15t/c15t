// The bridge library. This is its only build script, in a host app and in the standalone
// build one directory up alike: React Native autolinks this directory (see `android.sourceDir`
// in ../../react-native.config.js), and settings.gradle.kts includes this module directly.
//
// The namespace belongs here for that reason. React Native discovers a library's Java package
// by text-matching the build file at `sourceDir` and nothing else, so the string an app's
// autolinking reads has to be the string AGP actually builds the library with. This is the
// only build file that carries it; `scripts/react-native-autolink.ts` checks it against the
// package Codegen generates its spec into.

plugins {
	// Version-free: the standalone build pins it in settings.gradle.kts, a host app already
	// has AGP on its own buildscript classpath.
	id("com.android.library")
}

// Addressed through its interface rather than the `android {}` accessor, which is typed
// against AGP's old `com.android.build.gradle.LibraryExtension`. AGP 9 deprecates that one, so
// the accessor would put a deprecation warning naming this file in every host app's build log.
// The implementation AGP registers under this name implements this interface in 8.x and 9.x.
extensions.configure<com.android.build.api.dsl.LibraryExtension>("android") {
	namespace = "com.c15t.reactnative"
}

apply(from = "library.gradle")
