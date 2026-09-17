import { join } from 'node:path';

import { AndroidConfig, XML } from '@expo/config-plugins';
import { describe, expect, it } from 'vitest';

import { applyAndroidManifest } from '../android';
import { resolveParams } from '../params';
import {
	FIXTURE_DIR,
	applyToFixture,
	gradleFile,
	runInfoPlist,
	runMod,
} from './helpers';

const BACKEND = 'https://consent.example.com';
const PUBLIC_KEY = 'pk_live_7f3a9c';

/**
 * Android's manifest placeholder for the application id, expanded when the
 * manifest is merged. The dollar sign comes from an expression so the source
 * never holds a bare `${` sequence.
 */
const APPLICATION_ID_PLACEHOLDER = `${'$'}{applicationId}`;

const STANDARD_PROPS = { backendURL: BACKEND, publicKey: PUBLIC_KEY };

const readFixtureManifest = function readFixtureManifest() {
	return AndroidConfig.Manifest.readAndroidManifestAsync(
		join(FIXTURE_DIR, 'AndroidManifest.xml')
	);
};

const applicationOf = function applicationOf(
	manifest: AndroidConfig.Manifest.AndroidManifest
) {
	return AndroidConfig.Manifest.getMainApplicationOrThrow(
		manifest
	) as AndroidConfig.Manifest.ManifestApplication & {
		provider?: { $: Record<string, string> }[];
	};
};

describe('withC15t standard install', () => {
	it('writes the exact Info.plist a hosted install needs', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runInfoPlist(config);

		expect(applied.ios?.infoPlist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			'com.c15t.backend.mode': 'hosted',
			'com.c15t.backend.publicKey': PUBLIC_KEY,
			'com.c15t.backend.url': BACKEND,
		});
	});

	it('publishes the same values to JavaScript through extra', () => {
		const config = applyToFixture(STANDARD_PROPS);

		expect(config.extra).toStrictEqual({
			c15t: {
				backendURL: BACKEND,
				domain: null,
				enableAppTrackingTransparency: false,
				initURL: null,
				mode: 'hosted',
				protocol: {
					maxSupportedProtocolVersion: 1,
					minSupportedProtocolVersion: 1,
					protocolVersion: 1,
				},
				publicKey: PUBLIC_KEY,
			},
			keepMe: true,
		});
	});

	it('declares no tracking in the privacy manifest without ATT', () => {
		const config = applyToFixture(STANDARD_PROPS);

		expect(config.ios?.privacyManifests).toStrictEqual({
			NSPrivacyTracking: false,
			NSPrivacyTrackingDomains: [],
		});
	});

	it('writes the exact Android INTERNET permission and meta-data', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runMod(
			config,
			'android',
			'manifest',
			await readFixtureManifest()
		);
		const manifest =
			applied.modResults as AndroidConfig.Manifest.AndroidManifest;

		expect(manifest.manifest.$['xmlns:tools']).toBe(
			'http://schemas.android.com/tools'
		);
		expect(manifest.manifest['uses-permission']).toStrictEqual([
			{ $: { 'android:name': 'android.permission.SYSTEM_ALERT_WINDOW' } },
			{ $: { 'android:name': 'android.permission.INTERNET' } },
		]);
		expect(applicationOf(manifest)['meta-data']).toStrictEqual([
			{
				$: {
					'android:name': 'expo.modules.updates.ENABLED',
					'android:value': 'true',
				},
			},
			{
				$: {
					'android:name': 'com.c15t.PORTAL_URL',
					'android:value': BACKEND,
				},
			},
			{
				$: {
					'android:name': 'com.c15t.PUBLIC_KEY',
					'android:value': PUBLIC_KEY,
				},
			},
		]);
	});

	it('registers the c15t initializer through androidx.startup', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runMod(
			config,
			'android',
			'manifest',
			await readFixtureManifest()
		);
		const manifest =
			applied.modResults as AndroidConfig.Manifest.AndroidManifest;

		expect(applicationOf(manifest).provider).toStrictEqual([
			{
				$: {
					'android:authorities': `${APPLICATION_ID_PLACEHOLDER}.androidx-startup`,
					'android:exported': 'false',
					'android:name': 'androidx.startup.InitializationProvider',
					'tools:node': 'merge',
				},
				'meta-data': [
					{
						$: {
							'android:name': 'com.c15t.reactnative.C15tReactNativeInitializer',
							'android:value': 'androidx.startup',
						},
					},
				],
			},
		]);
	});

	it('serialises to the manifest text Android reads', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runMod(
			config,
			'android',
			'manifest',
			await readFixtureManifest()
		);
		const xml = XML.format(
			applied.modResults as AndroidConfig.Manifest.AndroidManifest
		);

		expect(xml).toContain(
			'<meta-data android:name="com.c15t.PORTAL_URL" android:value="https://consent.example.com"/>'
		);
		expect(xml).toContain(
			'<uses-permission android:name="android.permission.INTERNET"/>'
		);
		expect(xml).toContain(
			`<provider android:authorities="${APPLICATION_ID_PLACEHOLDER}.androidx-startup"`
		);
	});

	it('raises the root gradle compileSdk and leaves the rest alone', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runMod(
			config,
			'android',
			'projectBuildGradle',
			gradleFile('project-build.gradle')
		);

		// Exact file, not a substring: only compileSdkVersion moves, and the
		// host's own targetSdkVersion and indirections must survive.
		expect(applied.modResults.contents).toBe(
			[
				'// Top-level build file where you can add configuration options common to all',
				'// sub-projects/modules.',
				'',
				'buildscript {',
				'    ext {',
				"        buildToolsVersion = '36.0.0'",
				'        minSdkVersion = 24',
				'        compileSdkVersion = 36',
				'        targetSdkVersion = 35',
				"        kotlinVersion = '2.1.20'",
				'    }',
				'    repositories {',
				'        google()',
				'        mavenCentral()',
				'    }',
				'    dependencies {',
				"        classpath('com.android.tools.build:gradle')",
				'    }',
				'}',
				'',
				"apply plugin: 'com.facebook.react.rootproject'",
				'',
			].join('\n')
		);
	});

	it('raises a literal app gradle compileSdk and keeps indirection', async () => {
		const config = applyToFixture(STANDARD_PROPS);
		const applied = await runMod(
			config,
			'android',
			'appBuildGradle',
			gradleFile('app-build.gradle')
		);

		expect(applied.modResults.contents).toContain('compileSdk 36');
		expect(applied.modResults.contents).toContain(
			'buildToolsVersion rootProject.ext.buildToolsVersion'
		);
		expect(applied.modResults.contents).toContain(
			'minSdkVersion rootProject.ext.minSdkVersion'
		);
		expect(applied.modResults.contents).toContain(
			'targetSdkVersion rootProject.ext.targetSdkVersion'
		);
	});

	it('is a no-op the second time it runs', async () => {
		const params = resolveParams({
			...STANDARD_PROPS,
			domain: 'app.example.com',
		});
		const once = applyAndroidManifest(params, await readFixtureManifest());
		const twice = applyAndroidManifest(params, once);

		expect(twice).toStrictEqual(once);
	});
});
