/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	expectScriptMatchesIntegration,
	runOnBeforeLoad,
} from '../../__tests__/helpers';
import { klaviyo } from './klaviyo';

const clearKlaviyoState = function clearKlaviyoState(): void {
	delete window.klaviyo;
	delete window._klOnsite;
	// oxlint-disable-next-line unicorn/no-document-cookie -- Resets the opt-out cookie between tests.
	document.cookie = '__kla_off=; path=/; max-age=0';
};

describe('klaviyo', () => {
	afterEach(clearKlaviyoState);

	it('matches registry metadata with the account-keyed loader', () => {
		const script = klaviyo({ publicApiKey: 'AbC123' });

		expectScriptMatchesIntegration('klaviyo', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js',
		});
		expect(script.category).toEqual({ and: ['marketing', 'measurement'] });
		expect(script.async).toBe(true);
		expect(script.vendor).toBe('klaviyo');
	});

	it('trims the public API key', () => {
		expect(klaviyo({ publicApiKey: '  AbC123 ' }).src).toBe(
			'https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js'
		);
	});

	it.each(['', '   ', 'AbC12', 'AbC1234', 'AbC/12', '../x/y'])(
		'rejects %j as a public API key',
		(publicApiKey) => {
			expect(() => klaviyo({ publicApiKey })).toThrow(
				'klaviyo: publicApiKey must be the six-character public API key'
			);
		}
	);

	it('rejects a missing public API key', () => {
		expect(() =>
			klaviyo({ publicApiKey: undefined } as unknown as Parameters<
				typeof klaviyo
			>[0])
		).toThrow('klaviyo: publicApiKey must be the six-character public API key');
	});

	it('names a private API key in the error', () => {
		expect(() =>
			klaviyo({ publicApiKey: 'pk_0123456789abcdef0123456789abcdef01' })
		).toThrow('klaviyo: publicApiKey received a private API key');
	});

	it('accepts an https script URL override', () => {
		const script = klaviyo({
			publicApiKey: 'AbC123',
			scriptUrl: ' https://proxy.example.com/klaviyo.js ',
		});

		expect(script.src).toBe('https://proxy.example.com/klaviyo.js');
	});

	it('treats a blank script URL override as unset', () => {
		expect(klaviyo({ publicApiKey: 'AbC123', scriptUrl: ' ' }).src).toBe(
			'https://static.klaviyo.com/onsite/js/AbC123/klaviyo.js'
		);
	});

	it.each([
		'http://proxy.example.com/klaviyo.js',
		'ftp://proxy.example.com/klaviyo.js',
		'/klaviyo.js',
	])('rejects %j as a script URL', (scriptUrl) => {
		expect(() => klaviyo({ publicApiKey: 'AbC123', scriptUrl })).toThrow(
			'klaviyo: scriptUrl must be a valid https URL'
		);
	});

	it('rejects an unknown mode', () => {
		expect(() =>
			klaviyo({
				mode: 'tracking-only' as 'full',
				publicApiKey: 'AbC123',
			})
		).toThrow("klaviyo: mode must be 'full' or 'forms-only'");
	});

	it('uses marketing as the forms-only default and keeps explicit conditions', () => {
		expect(
			klaviyo({ mode: 'forms-only', publicApiKey: 'AbC123' }).category
		).toBe('marketing');
		expect(
			klaviyo({
				category: { or: ['marketing', 'functionality'] },
				publicApiKey: 'AbC123',
			}).category
		).toEqual({ or: ['marketing', 'functionality'] });
	});

	it('seeds the klaviyo object queue without sending calls of its own', () => {
		const script = klaviyo({ publicApiKey: 'AbC123' });
		runOnBeforeLoad(script, { hasConsent: true });

		expect(window._klOnsite).toEqual([]);
		expect(typeof window.klaviyo?.identify).toBe('function');
		// oxlint-disable-next-line unicorn/no-document-cookie -- Asserts the opt-out cookie is absent.
		expect(document.cookie).not.toContain('__kla_off');
	});

	it('queues calls in the official snippet format and resolves on replay', async () => {
		runOnBeforeLoad(klaviyo({ publicApiKey: 'AbC123' }), { hasConsent: true });
		const callback = vi.fn();

		const pending = window.klaviyo?.track(
			'Viewed Product',
			{ id: 1 },
			callback
		);
		window.klaviyo?.push(['openForm', 'FORM01']);

		const [trackCall, pushCall] = window._klOnsite as [unknown[], unknown[]];
		expect(trackCall.slice(0, 3)).toEqual([
			'track',
			'Viewed Product',
			{ id: 1 },
		]);
		expect(pushCall).toEqual(['openForm', 'FORM01']);

		// Klaviyo.js replays the call and invokes the trailing resolver.
		(trackCall[3] as (result: unknown) => void)(true);
		await expect(pending).resolves.toBe(true);
		expect(callback).toHaveBeenCalledWith(true);
	});

	it('queues nothing when the object is awaited, serialized or stringified', async () => {
		runOnBeforeLoad(klaviyo({ publicApiKey: 'AbC123' }), { hasConsent: true });
		const stub = window.klaviyo;

		await expect(Promise.resolve(stub)).resolves.toBe(stub);
		expect(JSON.stringify(stub)).toBe('{}');
		expect(String(stub)).toBe('[object Object]');
		expect(Object.hasOwn(stub ?? {}, 'track')).toBe(false);

		// Klaviyo.js throws while replaying such entries, which strands every
		// call queued after them.
		expect(window._klOnsite).toEqual([]);
	});

	it('leaves an existing klaviyo object alone', () => {
		const existing = { identify: vi.fn() };
		window.klaviyo = existing;

		runOnBeforeLoad(klaviyo({ publicApiKey: 'AbC123' }), { hasConsent: true });

		expect(window.klaviyo).toBe(existing);
		expect(window._klOnsite).toBeUndefined();
	});

	it('sets the opt-out cookie in forms-only mode', () => {
		runOnBeforeLoad(klaviyo({ mode: 'forms-only', publicApiKey: 'AbC123' }), {
			hasConsent: true,
		});

		// oxlint-disable-next-line unicorn/no-document-cookie -- Asserts the opt-out cookie Klaviyo reads.
		expect(document.cookie).toContain('__kla_off=true');
	});
});
