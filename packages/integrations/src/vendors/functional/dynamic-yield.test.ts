/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { dynamicYield } from './dynamic-yield';

describe('dynamicYield', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.DY;
		document.head.innerHTML = '';
	});

	it('uses experience consent and the US section loader by default', () => {
		const script = dynamicYield({ sectionId: '  1234567  ' });
		expect(script).toMatchObject({
			async: false,
			category: 'experience',
			id: 'dynamic-yield',
			src: 'https://cdn.dynamicyield.com/api/1234567/api_dynamic.js',
			vendor: 'dynamic-yield',
		});
		expect(script.alwaysLoad).toBeUndefined();
		expect(script.persistAfterConsentRevoked).toBeUndefined();
		expect(window.DY).toBeUndefined();
	});

	it('supports the EU data center and a different consent category', () => {
		const script = dynamicYield({
			category: 'marketing',
			region: 'eu',
			sectionId: '1234567',
		});
		expect(script.category).toBe('marketing');
		expect(script.src).toBe(
			'https://cdn-eu.dynamicyield.com/api/1234567/api_dynamic.js'
		);
	});

	it('encodes the section ID as one URL path segment', () => {
		expect(dynamicYield({ sectionId: ' section/with?query#hash ' }).src).toBe(
			'https://cdn.dynamicyield.com/api/section%2Fwith%3Fquery%23hash/api_dynamic.js'
		);
	});

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips invalid section ID %s',
		(sectionId) => {
			expectSkippedScript(
				() => dynamicYield({ sectionId: sectionId as string }),
				{ category: 'experience', id: 'dynamic-yield' },
				'dynamicYield: missing or invalid sectionId'
			);
		}
	);

	it('retains an overridden category for a skipped section', () => {
		expectSkippedScript(
			() => dynamicYield({ category: 'marketing', sectionId: '' }),
			{ category: 'marketing', id: 'dynamic-yield' },
			'dynamicYield: missing or invalid sectionId'
		);
	});

	it('seeds consent and a cloned context without overwriting other DY settings', () => {
		window.DY = { customSetting: 'keep' };
		const context = {
			data: ['SKU123'],
			lng: 'en_GB',
			type: 'PRODUCT' as const,
		};
		const script = dynamicYield({
			recommendationContext: context,
			sectionId: '1234567',
		});
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(window.DY).toEqual({
			customSetting: 'keep',
			recommendationContext: context,
			userActiveConsent: { accepted: true },
		});
		window.DY?.recommendationContext?.data?.push('SKU456');
		expect(context.data).toEqual(['SKU123']);
	});

	it('preserves an existing context when the option is omitted', () => {
		window.DY = { recommendationContext: { type: 'HOMEPAGE' } };
		const script = dynamicYield({ sectionId: '1234567' });
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(window.DY.recommendationContext).toEqual({ type: 'HOMEPAGE' });
	});

	it('updates the whole Active Cookie Consent object on revocation', () => {
		const script = dynamicYield({ sectionId: '1234567' });
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		let consent = { accepted: true };
		const changed = vi.fn((next: { accepted: boolean }) => {
			consent = next;
		});
		Object.defineProperty(window.DY, 'userActiveConsent', {
			configurable: true,
			get: () => consent,
			set: changed,
		});
		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		expect(changed).toHaveBeenCalledExactlyOnceWith({ accepted: false });
	});

	it('does not append the second loader after a denied or detached completion', () => {
		const script = dynamicYield({ sectionId: '1234567' });
		const element = document.createElement('script');
		script.onLoad?.(
			createCallbackInfo({ element, hasConsent: true, id: script.id })
		);
		document.head.appendChild(element);
		script.onLoad?.(
			createCallbackInfo({ element, hasConsent: false, id: script.id })
		);
		expect(document.head.querySelector('script[src]')).toBeNull();
	});

	it('can be created during SSR', () => {
		vi.stubGlobal('window', undefined);
		expect(() => dynamicYield({ sectionId: '1234567' })).not.toThrow();
	});
});
