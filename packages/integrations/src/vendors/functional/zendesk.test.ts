/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { isArgumentsPayload, toArgs } from '../../e2e-test-utils';
import { zendeskWidget } from './zendesk';

const allowedConsents = {
	experience: false,
	functionality: true,
	marketing: false,
	measurement: false,
	necessary: true,
};

describe('zendeskWidget', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.zE;
		delete window.zEmbed;
	});

	it('creates a gated loader without browser effects', () => {
		const script = zendeskWidget({ key: '  widget/key & value  ' });
		expect(script.id).toBe('zendesk');
		expect(script.vendor).toBe('zendesk');
		expect(script.category).toBe('functionality');
		expect(script.src).toBe(
			'https://static.zdassets.com/ekr/snippet.js?key=widget%2Fkey%20%26%20value'
		);
		expect(script.alwaysLoad).toBeUndefined();
		expect(script.serverStart).toBeUndefined();
		expect(script.persistAfterConsentRevoked).toBeUndefined();
		expect(script.vendorDetails?.name).toBe('Zendesk Messaging');
		expect(window.zE).toBeUndefined();
		expect(window.zEmbed).toBeUndefined();
	});

	it.each(['', '   '])('skips a blank key %s', (key) => {
		expectSkippedScript(
			() => zendeskWidget({ key }),
			{ category: 'functionality', id: 'zendesk' },
			'zendeskWidget: missing or invalid key'
		);
	});

	it('does not create a queue through denied callbacks', () => {
		const script = zendeskWidget({ key: 'widget-key' });
		const info = createCallbackInfo({
			element: document.createElement('script'),
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onConsentChange?.(info);
		script.onDispose?.(info);
		expect(window.zE).toBeUndefined();
		expect(window.zEmbed).toBeUndefined();
	});

	it('queues functional storage and the loader reference before insertion', () => {
		const script = zendeskWidget({ key: 'widget-key' });
		const element = document.createElement('script');
		element.id = 'c15t-test-id';
		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: allowedConsents,
				element,
				hasConsent: true,
				id: script.id,
			})
		);
		expect(window.zE).toBeTypeOf('function');
		expect(window.zE?._?.map(toArgs)).toEqual([
			['messenger:set', 'cookies', 'functional'],
		]);
		expect(window.zE?._?.every(isArgumentsPayload)).toBe(true);
		expect(window.zE?.s).toBe(element);
		expect(window.zE?.t).toBeTypeOf('number');
		expect(window.zEmbed).toBe(window.zE);
		expect(element.id).toBe('c15t-test-id');
	});

	it('preserves a loaded API and follows measurement-only changes', () => {
		const api = vi.fn();
		window.zE = api;
		const script = zendeskWidget({ key: 'widget-key' });
		const info = createCallbackInfo({
			consents: allowedConsents,
			element: document.createElement('script'),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onConsentChange?.({
			...info,
			consents: { ...allowedConsents, measurement: true },
		});
		script.onConsentChange?.(info);
		script.onConsentChange?.({ ...info, hasConsent: false });
		expect(window.zE).toBe(api);
		expect(api.mock.calls).toEqual([
			['messenger:set', 'cookies', 'functional'],
			['messenger:set', 'cookies', 'all'],
			['messenger:set', 'cookies', 'functional'],
			['messenger:set', 'cookies', 'none'],
		]);
	});

	it('requests none on disposal and ignores later updates', () => {
		const script = zendeskWidget({ key: 'widget-key' });
		const info = createCallbackInfo({
			consents: allowedConsents,
			element: document.createElement('script'),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onDispose?.(info);
		script.onConsentChange?.(info);
		expect(window.zE?._?.map(toArgs)).toEqual([
			['messenger:set', 'cookies', 'functional'],
			['messenger:set', 'cookies', 'none'],
		]);
	});

	it('honors the category override when the key is missing too', () => {
		expect(zendeskWidget({ category: 'experience', key: 'key' }).category).toBe(
			'experience'
		);
		expectSkippedScript(
			() => zendeskWidget({ category: 'experience', key: '' }),
			{ category: 'experience', id: 'zendesk' },
			'zendeskWidget: missing or invalid key'
		);
	});

	it('is safe to construct without a browser', () => {
		vi.stubGlobal('window', undefined);
		expect(() => zendeskWidget({ key: 'widget-key' })).not.toThrow();
	});
});
