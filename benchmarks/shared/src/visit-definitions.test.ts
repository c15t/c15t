import { describe, expect, it } from 'vitest';

import {
	assertVisitBannerState,
	describeColdState,
	formatColdState,
	savedConsentVisits,
} from './visit-definitions';

describe('savedConsentVisits', () => {
	it('defines one accepted and one rejected saved visit', () => {
		expect(
			savedConsentVisits.map((visit) => [visit.name, visit.buttonTestId])
		).toEqual([
			['saved-consent-accept', 'consent-banner-accept-button'],
			['saved-consent-reject', 'consent-banner-reject-button'],
		]);
	});
});

describe('assertVisitBannerState', () => {
	it('catches the old repeat-visitor mislabel: a banner on a saved visit', () => {
		// What the pre-fix `repeat-visitor` arm observed: a fresh context,
		// so the banner rendered again.
		expect(() =>
			assertVisitBannerState({
				activeUI: 'banner',
				bannerCount: 1,
				scenario: 'repeat-visitor',
				visit: 'saved-accept',
			})
		).toThrow('still showed the consent banner');
	});

	it('rejects banner markup in the server HTML of a saved visit', () => {
		expect(() =>
			assertVisitBannerState({
				activeUI: 'none',
				bannerCount: 0,
				bannerInServerHtml: true,
				scenario: 'saved-consent-reject',
				visit: 'saved-reject',
			})
		).toThrow('serverHtml=true');
	});

	it('accepts a saved visit without a banner', () => {
		expect(() =>
			assertVisitBannerState({
				activeUI: 'none',
				bannerCount: 0,
				bannerInServerHtml: false,
				scenario: 'saved-consent-accept',
				visit: 'saved-accept',
			})
		).not.toThrow();
	});

	it('rejects a saved visit that hides the banner without a restored choice', () => {
		expect(() =>
			assertVisitBannerState({
				activeUI: 'none',
				bannerCount: 0,
				hasStoredChoice: false,
				scenario: 'saved-consent-accept',
				visit: 'saved-accept',
			})
		).toThrow('restored no stored choice');
	});

	it('requires a banner on a fresh visit', () => {
		expect(() =>
			assertVisitBannerState({
				activeUI: 'none',
				bannerCount: 0,
				scenario: 'full-ui',
				visit: 'fresh',
			})
		).toThrow('a fresh visit must show the consent banner');
		expect(() =>
			assertVisitBannerState({
				activeUI: 'banner',
				bannerCount: 1,
				scenario: 'full-ui',
				visit: 'fresh',
			})
		).not.toThrow();
	});
});

describe('describeColdState', () => {
	it('labels a new context on a warm process with a warm manifest', () => {
		const state = describeColdState({
			freshBrowserContext: true,
			usesManifestCache: true,
		});
		expect(state).toMatchObject({
			browserCache: 'cold',
			cdnEdge: 'not-measured',
			frameworkProcess: 'warm',
			sdkManifestCache: 'warm',
		});
		expect(formatColdState(state)).toBe(
			'browser:cold sdk-manifest:warm process:warm cdn:not-measured'
		);
	});

	it('keeps a cold SDK manifest cache apart from a cold process', () => {
		expect(
			describeColdState({
				freshBrowserContext: true,
				manifestCacheKeyIsNew: true,
				usesManifestCache: true,
			})
		).toMatchObject({ frameworkProcess: 'warm', sdkManifestCache: 'cold' });
	});

	it('reports a process restart as resetting the SDK manifest cache too', () => {
		const state = describeColdState({
			freshBrowserContext: true,
			processStartedForSample: true,
			usesManifestCache: true,
		});
		expect(state).toMatchObject({
			frameworkProcess: 'cold',
			sdkManifestCache: 'cold',
		});
		expect(state.setup).toContain('SDK in-memory manifest cache');
	});

	it('marks the manifest cache not applicable for direct init and a reused context warm', () => {
		expect(
			describeColdState({
				freshBrowserContext: false,
				usesManifestCache: false,
			})
		).toMatchObject({
			browserCache: 'warm',
			sdkManifestCache: 'not-applicable',
		});
	});
});
