// Standalone entry point for the bridge library.
//
// The build itself is in library.gradle, which is also what a host app evaluates: React
// Native autolinks the package's `android` directory rather than this subdirectory, so
// ../build.gradle.kts applies that same script from there. Keeping the configuration in one
// file is what stops the app build and this build from drifting apart.

plugins {
	// Version-free: the standalone build pins it in settings.gradle.kts, a host app already
	// has AGP on its own buildscript classpath.
	id("com.android.library")
}

apply(from = "library.gradle")
