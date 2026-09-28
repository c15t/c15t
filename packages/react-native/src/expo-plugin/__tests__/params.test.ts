import { describe, expect, it } from 'vitest';

import { C15tPluginError } from '../errors';
import { TRANSPORT_MODES, resolveParams } from '../params';

const BACKEND = 'https://consent.example.com';

describe('resolveParams', () => {
	it('defaults a hosted install', () => {
		expect(resolveParams({ backendURL: BACKEND })).toMatchObject({
			appTrackingTransparency: {
				enabled: false,
				skAdNetworkIdentifiers: [],
				usageDescription: null,
			},
			autoBootstrap: true,
			backendHost: 'consent.example.com',
			backendURL: BACKEND,
			domain: null,
			forceGPC: false,
			initURL: null,
			mode: 'hosted',
			providerMode: 'hosted',
			skipNativeBuildCheck: false,
		});
	});

	it('trims trailing slashes and keeps a base path', () => {
		expect(
			resolveParams({ backendURL: 'https://consent.example.com/c15t///' })
				.backendURL
		).toBe('https://consent.example.com/c15t');
	});

	it('accepts plain http on a loopback backend', () => {
		expect(
			resolveParams({ backendURL: 'http://localhost:8787' }).backendURL
		).toBe('http://localhost:8787');
	});

	it.each([
		['a bare host', 'consent.example.com'],
		['plain http off loopback', 'http://consent.example.com'],
		['credentials', 'https://user:pass@consent.example.com'],
		['a query string', `${BACKEND}?key=leaked`],
		['a fragment', `${BACKEND}#fragment`],
		['an empty string', ''],
	])('rejects %s: %s', (_label, value) => {
		expect(() => resolveParams({ backendURL: value })).toThrowError(
			C15tPluginError
		);
	});

	it('requires a backend for every mode but offline', () => {
		for (const mode of TRANSPORT_MODES) {
			if (mode === 'offline') {
				continue;
			}
			expect(() => resolveParams({ mode })).toThrowError(
				/backendURL is required/u
			);
		}

		expect(resolveParams({ mode: 'offline' }).backendURL).toBeNull();
	});

	it('rejects an unknown mode with the list of real ones', () => {
		expect(() =>
			resolveParams({ backendURL: BACKEND, mode: 'proxied' as never })
		).toThrowError(/must be one of custom, hosted, offline, selfHosted/u);
	});

	it('defaults no declared category scope to the full policy scope', () => {
		// Empty means "write nothing", which the cores read as the full scope.
		expect(
			resolveParams({ backendURL: BACKEND }).consentCategories
		).toStrictEqual([]);
	});

	it('trims and de-duplicates a declared category scope', () => {
		expect(
			resolveParams({
				backendURL: BACKEND,
				consentCategories: [' necessary ', 'necessary', 'marketing'],
			}).consentCategories
		).toStrictEqual(['necessary', 'marketing']);
	});

	it('rejects an unknown category with the list of real ones', () => {
		// The cores drop an unknown name rather than trusting it; a plugin that
		// wrote it anyway would ship rows the host never typed.
		expect(() =>
			resolveParams({
				backendURL: BACKEND,
				consentCategories: ['marketing', 'experiance'],
			})
		).toThrowError(/unknown: "experiance"/u);
	});

	it('refuses an empty category list instead of meaning "everything"', () => {
		expect(() =>
			resolveParams({ backendURL: BACKEND, consentCategories: [] })
		).toThrowError(/Omit it entirely to offer the full policy scope/u);
	});

	it('defaults no declared vendor scope to every served vendor', () => {
		// Empty means "write nothing", which both cores read as no scope rather
		// than as a drawer with nothing in it.
		expect(resolveParams({ backendURL: BACKEND }).vendors).toStrictEqual([]);
	});

	it('de-duplicates a declared vendor scope and keeps the order written', () => {
		expect(
			resolveParams({ backendURL: BACKEND, vendors: [755, 42, 8, 42] }).vendors
		).toStrictEqual([755, 42, 8]);
	});

	it('refuses an empty vendor list instead of meaning "everything"', () => {
		// Both cores read an empty scope as no scope, so writing one would ship the
		// widest possible disclosure under a name that reads like the narrowest.
		expect(() =>
			resolveParams({ backendURL: BACKEND, vendors: [] })
		).toThrowError(/Omit it entirely to disclose every vendor/u);
	});

	it('refuses a vendor id that is not a positive whole number', () => {
		// The readers drop an entry they cannot name rather than trusting it, so a
		// plugin that wrote one anyway would ship a drawer the host never typed.
		expect(() =>
			resolveParams({ backendURL: BACKEND, vendors: [42, 0, -3, 7.5] })
		).toThrowError(/invalid: 0, -3, 7\.5/u);
	});

	it('refuses a domain with a space in it', () => {
		expect(() =>
			resolveParams({ backendURL: BACKEND, domain: 'two words' })
		).toThrowError(/domain must be a single non-empty token/u);
	});

	it('refuses a tracking domain spelled as a URL', () => {
		expect(() =>
			resolveParams({
				backendURL: BACKEND,
				enableAppTrackingTransparency: true,
				privacyTrackingDomains: ['https://ads.example.com/'],
				trackingUsageDescription: 'Relevant ads.',
			})
		).toThrowError(/bare hostnames/u);
	});

	it('lowercases and dedupes tracking domains', () => {
		const resolved = resolveParams({
			backendURL: BACKEND,
			enableAppTrackingTransparency: true,
			privacyTrackingDomains: [
				'ADS.example.com',
				'ads.example.com',
				'consent.example.com',
			],
			trackingUsageDescription: 'Relevant ads.',
		});

		expect(resolved.privacyTrackingDomains).toStrictEqual([
			'ads.example.com',
			'consent.example.com',
		]);
	});

	it('has no backend host to default tracking domains to when offline', () => {
		const resolved = resolveParams({
			enableAppTrackingTransparency: true,
			mode: 'offline',
			trackingUsageDescription: 'Relevant ads.',
		});

		expect(resolved.privacyTrackingDomains).toStrictEqual([]);
	});

	it('lets the host override the auto-bootstrap default in either direction', () => {
		expect(
			resolveParams({ backendURL: BACKEND, mode: 'custom' }).autoBootstrap
		).toBe(false);
		expect(
			resolveParams({
				autoBootstrap: true,
				backendURL: BACKEND,
				mode: 'custom',
			}).autoBootstrap
		).toBe(true);
		expect(
			resolveParams({ autoBootstrap: false, backendURL: BACKEND }).autoBootstrap
		).toBe(false);
	});

	it('names the app.json shape when given no parameters at all', () => {
		expect(() => resolveParams(undefined)).toThrowError(
			/@c15t\/react-native\/expo-plugin/u
		);
	});
});
