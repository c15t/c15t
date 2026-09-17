pluginManagement {
	plugins {
		// The bridge module applies com.android.library by id, without a version: a host app
		// already has AGP on its buildscript classpath and a version there would fight it.
		// This is the standalone build's pin, kept equal to the AGP React Native 0.87's own
		// Gradle plugin is built against, and to native/core-android.
		id("com.android.library") version "9.2.1"
	}

	repositories {
		google {
			mavenContent {
				includeGroupAndSubgroups("androidx")
				includeGroupAndSubgroups("com.android")
				includeGroupAndSubgroups("com.google")
			}
		}
		mavenCentral()
		gradlePluginPortal()
	}
}

dependencyResolutionManagement {
	// Every coordinate resolves here; no per-module repository blocks.
	repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
	repositories {
		google()
		mavenCentral()
	}
}

rootProject.name = "c15t-react-native-android"

/**
 * Where the consent engine comes from.
 *
 * `c15t.core.fromSource=true` (the default in this repository) builds against
 * `native/core-android` as an included build, so the bridge is always compiled
 * against the engine that is in the tree next to it and there is no second copy of
 * the source to drift. CI and release jobs flip it to `false` to resolve the
 * published artifacts at `c15t.core.version` instead, which is what an app
 * installing `@c15t/react-native` from npm actually gets.
 */
val coreFromSource = providers.gradleProperty("c15t.core.fromSource").orNull?.toBoolean() ?: true
val coreGroup = providers.gradleProperty("c15t.core.group").orNull ?: "com.c15t"
val coreSourceDir = file(providers.gradleProperty("c15t.core.sourceDir").orNull ?: "../../../native/core-android")

if (coreFromSource) {
	if (!coreSourceDir.isDirectory) {
		throw GradleException(
			"build.gradle.kts: c15t.core.fromSource is true but no Gradle project exists at $coreSourceDir. " +
				"Point c15t.core.sourceDir at native/core-android, or run with -Pc15t.core.fromSource=false " +
				"to resolve the published com.c15t artifacts.",
		)
	}
	includeBuild(coreSourceDir) {
		dependencySubstitution {
			substitute(module("$coreGroup:c15t-core")).using(project(":c15t-core"))
			substitute(module("$coreGroup:c15t-android")).using(project(":c15t-android"))
		}
	}
}

include(":c15t-react-native")

// The Codegen output belongs to the host app, not to this library. See
// c15t-spec/build.gradle.kts for why that is a compileOnly module.
include(":c15t-spec")
