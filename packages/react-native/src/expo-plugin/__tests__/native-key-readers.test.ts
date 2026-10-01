/**
 * Every native configuration key the plugin writes must have a named reader.
 *
 * The plugin writes flat reverse-DNS keys into a shipping app's `Info.plist` and
 * `AndroidManifest.xml`, and the embedded cores read them by constant name at
 * launch, before JavaScript exists. Nothing checks the two ends against each
 * other at build time, so a key the plugin invents compiles, installs, and does
 * nothing: the app looks configured and one platform runs a different transport
 * than the developer asked for. That is not a cosmetic gap, and it is invisible
 * in a diff because the reader that should have appeared simply is not there.
 *
 * Ground truth is therefore the reader sources themselves, not a copy of them:
 * `C15tBridgeConfiguration.InfoPlistKey` on iOS, and the `META_*` constants in
 * `C15tAndroid` and `C15tReactNativeBootstrap` on Android. A committed list of
 * supported keys would drift on its own schedule, which is the failure being
 * guarded against. This is the same trick `src/specs/__tests__/ios-spec-surface
 * .test.ts` uses for the Codegen protocol surface.
 *
 * Scope is c15t's own keys. The App Tracking Transparency and privacy-manifest
 * entries the plugin also writes are Apple's names, read by Apple.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AndroidConfig } from '@expo/config-plugins';
import { expect, it } from 'vitest';

import { ANDROID_META, IOS_PLIST_KEY } from '../constants';
import { FIXTURE_DIR, applyToFixture, runInfoPlist, runMod } from './helpers';

const PACKAGE_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../..'
);

/** The iOS reader: the bridge's own launch configuration. */
const IOS_READER_PATH = join(
	PACKAGE_ROOT,
	'ios/C15tReactNative/Bridge/C15tBootstrap.swift'
);

/** The Android readers: the core's manifest read, and the bridge's opt-out. */
const ANDROID_READER_PATHS = [
	resolve(
		PACKAGE_ROOT,
		'../../native/core-android/c15t-android/src/main/kotlin/com/c15t/android/C15tAndroid.kt'
	),
	join(
		PACKAGE_ROOT,
		'android/c15t-react-native/src/main/kotlin/com/c15t/reactnative/C15tReactNativeBootstrap.kt'
	),
];

/** The prefix every key in this contract carries. */
const C15T_KEY_PREFIX = 'com.c15t.';

/**
 * The plugin parameters that make it write every key it owns.
 *
 * `custom` with `autoBootstrap: false` is what puts the opt-out key on disk;
 * `forceGPC` is the only other conditional write. Everything else is written
 * whenever it has a value, so one install covers the whole surface.
 */
const EVERY_KEY_PROPS = {
	autoBootstrap: false,
	backendURL: 'https://consent.example.com',
	consentCategories: ['necessary', 'functionality', 'measurement', 'marketing'],
	domain: 'app.example.com',
	forceGPC: true,
	initURL: 'https://app.example.com/api/consent/init',
	mode: 'custom',
	vendors: [8, 42, 755],
} as const;

/** Read a reader source, so a moved file fails loudly instead of vacuously. */
const readSource = function readSource(path: string): string {
	try {
		return readFileSync(path, 'utf8');
	} catch {
		throw new Error(
			`the native key reader at ${path} is unreadable: the plugin's keys ` +
				`have no named source to be checked against. Update this test to ` +
				`the new path, or delete the keys it used to declare.`
		);
	}
};

/** Keys declared inside Swift's `enum InfoPlistKey`. */
const iosReaderKeys = function iosReaderKeys(): Set<string> {
	const block = /enum InfoPlistKey\s*\{(?<body>[\S\s]*?)\n {4}\}/u.exec(
		readSource(IOS_READER_PATH)
	)?.groups?.body;

	if (block === undefined) {
		throw new Error(
			`no "enum InfoPlistKey" was found in ${IOS_READER_PATH}, so no iOS ` +
				`key can be proven to have a reader.`
		);
	}

	return new Set(
		[...block.matchAll(/static let \w+ = "(?<key>[^"]+)"/gu)].map(
			(match) => match.groups?.key ?? ''
		)
	);
};

/** Keys declared as Kotlin `const val META_*`. */
const androidReaderKeys = function androidReaderKeys(): Set<string> {
	const keys = new Set<string>();

	for (const path of ANDROID_READER_PATHS) {
		for (const match of readSource(path).matchAll(
			/const val META_\w+ = "(?<key>[^"]+)"/gu
		)) {
			keys.add(match.groups?.key ?? '');
		}
	}

	return keys;
};

/** Run both native mods over the fixtures and return what they wrote. */
const writtenKeys = async function writtenKeys(): Promise<{
	readonly android: readonly string[];
	readonly ios: readonly string[];
}> {
	const config = applyToFixture(EVERY_KEY_PROPS);

	const plist = (await runInfoPlist(config)).ios?.infoPlist ?? {};
	// Filtered by prefix only: a key written as a literal somewhere off the tables
	// is exactly what the reader check exists to catch, so the tables must not be
	// allowed to filter it out of view here.
	const ios = Object.keys(plist)
		.filter((key) => key.startsWith(C15T_KEY_PREFIX))
		.sort();

	const applied = await runMod(
		config,
		'android',
		'manifest',
		await AndroidConfig.Manifest.readAndroidManifestAsync(
			join(FIXTURE_DIR, 'AndroidManifest.xml')
		)
	);
	const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
		applied.modResults as AndroidConfig.Manifest.AndroidManifest
	);
	const android = (application['meta-data'] ?? [])
		.map((entry) => entry.$['android:name'] ?? '')
		.filter((name) => name.startsWith(C15T_KEY_PREFIX));

	return { android, ios: ios.sort() };
};

it('proves the native reader sources declare keys', () => {
	// A parser that matches nothing turns every check below into a vacuous pass,
	// so the readers have to be non-empty before their contents mean anything.
	expect(iosReaderKeys().size).toBeGreaterThan(0);
	expect(androidReaderKeys().size).toBeGreaterThan(0);
});

it('writes only iOS keys that the bridge declares a reader for', async () => {
	const { ios } = await writtenKeys();
	const readers = iosReaderKeys();

	expect(
		ios.filter((key) => !readers.has(key)),
		`these iOS keys reach a shipping Info.plist and nothing in ` +
			`C15tBridgeConfiguration reads them: ${ios
				.filter((key) => !readers.has(key))
				.join(', ')}. Add the reader next to the other InfoPlistKey ` +
			`constants, or stop writing the key.`
	).toStrictEqual([]);
});

it('writes only Android keys that the cores declare a reader for', async () => {
	const { android } = await writtenKeys();
	const readers = androidReaderKeys();

	expect(
		android.filter((key) => !readers.has(key)),
		`these Android meta-data keys reach a shipping manifest and nothing in ` +
			`C15tAndroid or C15tReactNativeBootstrap reads them: ${android
				.filter((key) => !readers.has(key))
				.join(', ')}. Add the META_ constant, or stop writing the key.`
	).toStrictEqual([]);
});

it('keeps the key tables equal to what the plugin actually writes', async () => {
	const { android, ios } = await writtenKeys();

	// The tables are the documented surface and native/CONTRACT.md transcribes
	// them, so an entry nobody writes is a key documented as configured that
	// never is, and a write outside them is a key no document names.
	expect(ios).toStrictEqual([...Object.values(IOS_PLIST_KEY)].sort());
	expect(android.sort()).toStrictEqual([...Object.values(ANDROID_META)].sort());
});
