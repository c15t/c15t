import type { AndroidConfig } from '@expo/config-plugins';

import { MIN_ANDROID_COMPILE_SDK, MIN_ANDROID_MIN_SDK } from './constants';

/** A `build.gradle` as the mod hands it over. */
export type GradleFile = AndroidConfig.Paths.GradleProjectFile;

/**
 * Spellings Android accepts for one SDK level, and the floor c15t needs.
 *
 * Groovy writes `minSdkVersion 24` in an app module and
 * `minSdkVersion = 24` in the root `ext` block; the Kotlin DSL writes
 * `minSdk = 24`. All three have to move together or the build still fails.
 */
interface SdkFloor {
	/** Property spellings to match, longest first so the alternation is exact. */
	readonly properties: string;
	/** Lowest level the shipped AARs work at. */
	readonly floor: number;
}

const SDK_FLOORS: readonly SdkFloor[] = [
	{
		floor: MIN_ANDROID_COMPILE_SDK,
		properties: 'compileSdkVersion|compileSdk',
	},
	{ floor: MIN_ANDROID_MIN_SDK, properties: 'minSdkVersion|minSdk' },
];

/**
 * Raise every literal SDK level in a Gradle file to the floor.
 *
 * Only a bare integer is touched. `compileSdkVersion =
 * rootProject.ext.compileSdkVersion` is an indirection the root `ext` block
 * owns, and rewriting it there is what `applyProjectBuildGradle` does.
 *
 * @param contents - File contents.
 * @returns Contents with any level below the floor rewritten, unchanged
 * otherwise, so re-running the plugin is a no-op.
 */
const raiseSdkLevels = function raiseSdkLevels(contents: string): string {
	return SDK_FLOORS.reduce((current, { floor, properties }) => {
		const pattern = new RegExp(
			`(\\b(?:${properties})\\b\\s*=?\\s*)(\\d{1,3})(?![\\d.])`,
			'gu'
		);

		return current.replaceAll(
			pattern,
			(match, prefix: string, value: string) => {
				const level = Number.parseInt(value, 10);
				if (Number.isNaN(level) || level >= floor) {
					return match;
				}
				return `${prefix}${String(floor)}`;
			}
		);
	}, contents);
};

/**
 * Raise the `ext` SDK levels a React Native app template centralises.
 *
 * `compileSdk` below 36 fails the build against the c15t AARs with an AGP
 * message about a class file version, and `minSdk` below 24 fails the manifest
 * merger. Both point at an unrelated module, so the plugin fixes the number it
 * can see rather than leaving the host to decode the merger log.
 *
 * @param gradleFile - The root `build.gradle` the mod was given.
 * @returns The file to write back.
 */
export const applyProjectBuildGradle = function applyProjectBuildGradle(
	gradleFile: GradleFile
): GradleFile {
	return { ...gradleFile, contents: raiseSdkLevels(gradleFile.contents) };
};

/**
 * Raise literal SDK levels in the app module.
 *
 * Needed for a bare app that spells its levels in `app/build.gradle` instead of
 * reading the root `ext` block, which is the common shape in a hand-rolled
 * project and in a template that predates the `ext` block.
 *
 * @param gradleFile - The app `build.gradle` the mod was given.
 * @returns The file to write back.
 */
export const applyAppBuildGradle = function applyAppBuildGradle(
	gradleFile: GradleFile
): GradleFile {
	return { ...gradleFile, contents: raiseSdkLevels(gradleFile.contents) };
};
