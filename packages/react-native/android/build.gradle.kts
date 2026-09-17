// This file is evaluated in two builds and has to read correctly in both.
//
//  * As the root of the standalone build started from this directory. settings.gradle.kts
//    owns the wrapper, the included build of native/core-android, and the pinned plugin
//    versions there, so the root project itself configures nothing.
//
//  * As a library inside a host app. React Native's settings plugin autolinks a package by
//    pointing a project straight at its `sourceDir` (react-native.config.js: ./android), so
//    this file is the library's build script even though the sources live one directory
//    down. The library configuration therefore lives in c15t-react-native/library.gradle
//    and is applied from here, with the source roots re-anchored, so that an app and this
//    directory build the same thing from the same script.
//
// No version catalog accessors and no plugin versions appear in this file on purpose: a host
// app owns AGP, Kotlin, and React Native, and its catalog, if it has one, is not ours to
// address. AGP is on the app's own buildscript classpath, so applying it by id is enough.

if (project !== rootProject) {
	apply(plugin = "com.android.library")

	// Where the sources actually live, as opposed to this project's directory.
	extra["c15t.libraryDir"] = File(projectDir, "c15t-react-native")

	apply(from = "c15t-react-native/library.gradle")
}
