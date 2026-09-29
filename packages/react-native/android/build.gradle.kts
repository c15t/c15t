// The root of the standalone build started from this directory. settings.gradle.kts owns the
// wrapper, the included build of native/core-android, and the pinned plugin versions there,
// so the root project itself configures nothing, and this file carries no plugin at all.
//
// This is not the library's build script, in this build or in anyone else's. React Native
// autolinks c15t-react-native/, so that module's build.gradle.kts is the library inside a host
// app and here alike. It used to be this file's job to apply the library on an app's behalf,
// which gave the autolinker a build script whose sources and namespace lived one directory
// down: React Native matches the build file it is pointed at to find a library's Java package,
// found nothing, and every Android build in a host app died in settings evaluation.
//
// No version catalog accessors and no plugin versions appear in this file on purpose: a host
// app owns AGP, Kotlin, and React Native, and its catalog, if it has one, is not ours to
// address. Nothing here is visible to a host app any more, but the rule costs nothing and the
// standalone build still depends on the versions staying in settings.gradle.kts.
