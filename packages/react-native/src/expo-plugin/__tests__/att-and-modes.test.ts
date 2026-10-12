import { join } from 'node:path';

import { AndroidConfig } from '@expo/config-plugins';
import { describe, expect, it } from 'vitest';

import { applyParamsOnConfig } from '../with-c15t';
import {
	FIXTURE_DIR,
	PREBUILD_ARGV,
	applyToFixture,
	fixtureConfig,
	runInfoPlist,
	runMod,
} from './helpers';

const BACKEND = 'https://consent.example.com';
const ATT_PROPS = {
	backendURL: BACKEND,
	enableAppTrackingTransparency: true,
	skAdNetworkIdentifiers: ['cstr6suwn9.skadnetwork', '4f3dc5j5db.skadnetwork'],
	trackingUsageDescription: 'We use your activity to pick the ads you see.',
} as const;

const readFixtureManifest = function readFixtureManifest() {
	return AndroidConfig.Manifest.readAndroidManifestAsync(
		join(FIXTURE_DIR, 'AndroidManifest.xml')
	);
};

const metaNamesOf = function metaNamesOf(
	manifest: AndroidConfig.Manifest.AndroidManifest
): string[] {
	const application =
		AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
	return (application['meta-data'] ?? []).map(
		(entry) => entry.$['android:name'] as string
	);
};

const providerOf = function providerOf(
	manifest: AndroidConfig.Manifest.AndroidManifest
) {
	return (
		AndroidConfig.Manifest.getMainApplicationOrThrow(
			manifest
		) as AndroidConfig.Manifest.ManifestApplication & {
			provider?: unknown[];
		}
	).provider;
};

describe('App Tracking Transparency', () => {
	it('writes the exact prompt and SKAdNetwork items when opted in', async () => {
		const applied = await runInfoPlist(applyToFixture(ATT_PROPS));

		expect(applied.ios?.infoPlist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			NSUserTrackingUsageDescription:
				'We use your activity to pick the ads you see.',
			SKAdNetworkItems: [
				{ SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' },
				{ SKAdNetworkIdentifier: '4f3dc5j5db.skadnetwork' },
			],
			'com.c15t.backend.mode': 'hosted',
			'com.c15t.backend.url': BACKEND,
		});
	});

	it('declares tracking and the backend host once opted in', () => {
		const config = applyToFixture(ATT_PROPS);

		expect(config.ios?.privacyManifests).toStrictEqual({
			NSPrivacyTracking: true,
			NSPrivacyTrackingDomains: ['consent.example.com'],
		});
	});

	it('writes neither prompt nor SKAdNetwork items when opted out', async () => {
		const applied = await runInfoPlist(
			applyToFixture({
				...ATT_PROPS,
				enableAppTrackingTransparency: false,
			})
		);

		expect(applied.ios?.infoPlist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			'com.c15t.backend.mode': 'hosted',
			'com.c15t.backend.url': BACKEND,
		});
	});

	it('treats consent configuration as nothing to do with ATT', async () => {
		// The opt-out above is the whole point: identifiers were offered, and with
		// the flag off the binary must not carry the prompt they belong to.
		const applied = await runInfoPlist(
			applyToFixture({
				backendURL: BACKEND,
				forceGPC: true,
				skAdNetworkIdentifiers: ['cstr6suwn9.skadnetwork'],
			})
		);

		expect(applied.ios?.infoPlist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			'com.c15t.backend.mode': 'hosted',
			'com.c15t.backend.url': BACKEND,
			'com.c15t.gpc': true,
		});
	});

	it('keeps a prompt the host wrote and unions the identifiers', async () => {
		const applied = await runMod(
			applyToFixture(ATT_PROPS),
			'ios',
			'infoPlist',
			{
				NSUserTrackingUsageDescription: 'Host copy, reviewed by legal.',
				SKAdNetworkItems: [
					{ SKAdNetworkIdentifier: 'l9udre998ab.skadnetwork' },
				],
			}
		);

		expect(applied.ios?.infoPlist).toMatchObject({
			NSUserTrackingUsageDescription: 'Host copy, reviewed by legal.',
			SKAdNetworkItems: [
				{ SKAdNetworkIdentifier: 'l9udre998ab.skadnetwork' },
				{ SKAdNetworkIdentifier: 'cstr6suwn9.skadnetwork' },
				{ SKAdNetworkIdentifier: '4f3dc5j5db.skadnetwork' },
			],
		});
	});

	it('unions domains the host already declared for its own trackers', () => {
		const config = applyParamsOnConfig(
			{
				...fixtureConfig(),
				ios: {
					bundleIdentifier: 'com.example.consentdemo',
					privacyManifests: {
						NSPrivacyAccessedAPITypes: [
							{
								NSPrivacyAccessedAPIType:
									'NSPrivacyAccessedAPICategoryFileTimestamp',
								NSPrivacyAccessedAPITypeReasons: ['C617.1'],
							},
						],
						NSPrivacyTrackingDomains: ['ads.example.com'],
					},
				},
			},
			ATT_PROPS,
			{ argv: PREBUILD_ARGV, env: {}, projectRoot: FIXTURE_DIR }
		);

		expect(config.ios?.privacyManifests).toStrictEqual({
			NSPrivacyAccessedAPITypes: [
				{
					NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
					NSPrivacyAccessedAPITypeReasons: ['C617.1'],
				},
			],
			NSPrivacyTracking: true,
			NSPrivacyTrackingDomains: ['ads.example.com', 'consent.example.com'],
		});
	});

	it('refuses a prompt string it would have to invent', () => {
		expect(() =>
			applyToFixture({
				backendURL: BACKEND,
				enableAppTrackingTransparency: true,
			})
		).toThrowError(/needs trackingUsageDescription/u);
	});

	it('refuses an identifier that is not an SKAdNetwork identifier', () => {
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				skAdNetworkIdentifiers: ['https://cstr6suwn9.skadnetwork'],
			})
		).toThrowError(/must look like/u);
	});

	it('refuses tracking domains with no tracking prompt to back them', () => {
		expect(() =>
			applyToFixture({
				backendURL: BACKEND,
				privacyTrackingDomains: ['ads.example.com'],
			})
		).toThrowError(/without\s+enableAppTrackingTransparency/u);
	});

	it('refuses a tracking domain list that leaves the backend out', () => {
		expect(() =>
			applyToFixture({
				...ATT_PROPS,
				privacyTrackingDomains: ['ads.example.com'],
			})
		).toThrowError(/must list consent\.example\.com/u);
	});
});

describe('transport modes', () => {
	it('embeds no backend and no tracking for offline', async () => {
		const config = applyToFixture({ mode: 'offline' });
		const plist = (await runInfoPlist(config)).ios?.infoPlist;
		const manifest = (
			await runMod(config, 'android', 'manifest', await readFixtureManifest())
		).modResults as AndroidConfig.Manifest.AndroidManifest;

		expect(plist).toStrictEqual({
			ITSAppUsesNonExemptEncryption: false,
			'com.c15t.backend.mode': 'offline',
		});
		expect(config.extra?.c15t).toMatchObject({
			backendURL: null,
			mode: 'offline',
		});
		expect(metaNamesOf(manifest)).toStrictEqual([
			'expo.modules.updates.ENABLED',
		]);
	});

	it('keeps a self-hosted base URL with its path, and calls it hosted to JavaScript', async () => {
		const config = applyToFixture({
			backendURL: 'https://consent.internal.example.com/c15t',
			mode: 'selfHosted',
		});
		const plist = (await runInfoPlist(config)).ios?.infoPlist;

		expect(plist).toMatchObject({
			'com.c15t.backend.mode': 'selfHosted',
			'com.c15t.backend.url': 'https://consent.internal.example.com/c15t',
		});
		expect(config.extra?.c15t).toMatchObject({ mode: 'hosted' });
	});

	it('leaves the core unstarted for a host-supplied transport', async () => {
		const config = applyToFixture({ backendURL: BACKEND, mode: 'custom' });
		const plist = (await runInfoPlist(config)).ios?.infoPlist;
		const manifest = (
			await runMod(config, 'android', 'manifest', await readFixtureManifest())
		).modResults as AndroidConfig.Manifest.AndroidManifest;

		expect(plist).toMatchObject({
			'com.c15t.backend.mode': 'none',
			'com.c15t.reactnative.AutoBootstrap': false,
		});
		expect(metaNamesOf(manifest)).toStrictEqual([
			'expo.modules.updates.ENABLED',
			'com.c15t.PORTAL_URL',
			'com.c15t.reactnative.AUTO_BOOTSTRAP',
		]);
		expect(providerOf(manifest)).toBeUndefined();
	});

	it('writes the force-GPC switch in each platform spelling', async () => {
		const config = applyToFixture({ backendURL: BACKEND, forceGPC: true });
		const manifest = (
			await runMod(config, 'android', 'manifest', await readFixtureManifest())
		).modResults as AndroidConfig.Manifest.AndroidManifest;
		const application =
			AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

		expect((await runInfoPlist(config)).ios?.infoPlist).toMatchObject({
			'com.c15t.gpc': true,
		});
		expect(application['meta-data']).toContainEqual({
			$: {
				'android:name': 'com.c15t.FORCE_GPC',
				'android:value': 'true',
			},
		});
	});

	it('keeps init URL and domain on both platforms', async () => {
		const config = applyToFixture({
			backendURL: BACKEND,
			domain: 'app.example.com',
			initURL: 'https://app.example.com/api/consent/init',
		});
		const manifest = (
			await runMod(config, 'android', 'manifest', await readFixtureManifest())
		).modResults as AndroidConfig.Manifest.AndroidManifest;

		expect((await runInfoPlist(config)).ios?.infoPlist).toMatchObject({
			'com.c15t.backend.domain': 'app.example.com',
			'com.c15t.backend.initUrl': 'https://app.example.com/api/consent/init',
		});
		expect(
			AndroidConfig.Manifest.getMainApplicationOrThrow(manifest)['meta-data']
		).toContainEqual({
			$: {
				'android:name': 'com.c15t.INIT_URL',
				'android:value': 'https://app.example.com/api/consent/init',
			},
		});
	});
});
