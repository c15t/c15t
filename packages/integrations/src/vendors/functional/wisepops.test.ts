/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectSkippedScript,
	runOnBeforeLoad,
} from '../../__tests__/helpers';
import { wisepops } from './wisepops';
import type { WisepopsOptions, WisepopsRuntimeOptions } from './wisepops';

const queuedCalls = function queuedCalls(): unknown[][] {
	return (window.wisepops?.q ?? []).map((entry) => Array.from(entry));
};

describe('wisepops', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		delete window.wisepops;
		document.head.innerHTML = '';
	});

	it('matches the integration registry without loading before consent', () => {
		const script = wisepops({ siteId: 'test-site' });
		expectScriptMatchesIntegration('wisepops', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://wisepops.net/loader.js?v=3&h=test-site',
		});
		expect(window.wisepops).toBeUndefined();
		expect(document.querySelector('script')).toBeNull();
	});

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips an invalid site ID %s',
		(siteId) => {
			expectSkippedScript(
				() => wisepops({ siteId: siteId as string }),
				{ category: 'marketing', id: 'wisepops' },
				'wisepops: missing or invalid siteId'
			);
		}
	);

	it('preserves the custom category when an ID is missing', () => {
		expectSkippedScript(
			() => wisepops({ category: 'experience', siteId: '' }),
			{ category: 'experience', id: 'wisepops' },
			'wisepops: missing or invalid siteId'
		);
	});

	it('skips a missing options object without touching the browser', () => {
		expectSkippedScript(
			() => wisepops(undefined as unknown as WisepopsOptions),
			{ category: 'marketing', id: 'wisepops' },
			'wisepops: missing or invalid siteId'
		);
	});

	it('trims and encodes the site ID, and forwards a trimmed loader nonce', () => {
		const script = wisepops({
			category: { and: ['marketing', 'experience'] },
			nonce: '  loader-nonce  ',
			siteId: '  account/&?#+ %  ',
		});
		expect(script.src).toBe(
			'https://wisepops.net/loader.js?v=3&h=account%2F%26%3F%23%2B%20%25'
		);
		expect(script.category).toEqual({ and: ['marketing', 'experience'] });
		expect(script.nonce).toBe('loader-nonce');
	});

	it('creates the timestamped snippet queue when production setup runs', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1740000000000);
		const script = wisepops({ siteId: 'test-site' });
		expect(window.wisepops).toBeUndefined();

		runOnBeforeLoad(script, { hasConsent: true });

		expect(window.wisepops?.l).toBe(1740000000000);
		expect(queuedCalls()).toEqual([['options', { defaultConsent: 'denied' }]]);
		expect(Object.prototype.toString.call(window.wisepops?.q?.[0])).toBe(
			'[object Arguments]'
		);
	});

	it('preserves an existing snippet function, queue, timestamp and queued calls', () => {
		const first = wisepops({ siteId: 'test-site' });
		runOnBeforeLoad(first, { hasConsent: true });
		const snippet = window.wisepops;
		const queue = snippet?.q;
		const timestamp = snippet?.l;
		snippet?.('pageview');

		const recreated = wisepops({ siteId: 'test-site' });
		runOnBeforeLoad(recreated, { hasConsent: true });

		expect(window.wisepops).toBe(snippet);
		expect(window.wisepops?.q).toBe(queue);
		expect(window.wisepops?.l).toBe(timestamp);
		expect(queuedCalls()).toEqual([
			['options', { defaultConsent: 'denied' }],
			['pageview'],
			['options', { defaultConsent: 'denied' }],
		]);
	});

	it('applies documented options without allowing the default denial to change', () => {
		const options = {
			autoPageview: false,
			browserStorage: true,
			cookieMaxSize: 1024,
			defaultConsent: 'granted',
		} as WisepopsRuntimeOptions;
		const script = wisepops({ options, siteId: 'test-site' });
		runOnBeforeLoad(script, { hasConsent: true });
		expect(queuedCalls()).toEqual([
			[
				'options',
				{
					autoPageview: false,
					browserStorage: true,
					cookieMaxSize: 1024,
					defaultConsent: 'denied',
				},
			],
		]);
		expect(options).toHaveProperty('defaultConsent', 'granted');
	});

	it('grants cookie consent only for a connected, permitted load', () => {
		window.wisepops = vi.fn();
		const script = wisepops({ siteId: 'test-site' });
		const element = document.createElement('script');
		script.onLoad?.(createCallbackInfo({ hasConsent: true, id: script.id }));
		script.onLoad?.(
			createCallbackInfo({ element, hasConsent: true, id: script.id })
		);
		document.head.appendChild(element);
		script.onLoad?.(
			createCallbackInfo({ element, hasConsent: false, id: script.id })
		);
		expect(window.wisepops).not.toHaveBeenCalled();

		script.onLoad?.(
			createCallbackInfo({ element, hasConsent: true, id: script.id })
		);
		expect(window.wisepops).toHaveBeenCalledExactlyOnceWith(
			'consent',
			'granted'
		);
		expect(script.onConsentChange).toBeUndefined();
	});

	it('can be constructed during SSR', () => {
		vi.stubGlobal('window', undefined);
		expect(() => wisepops({ siteId: 'test-site' })).not.toThrow();
	});
});
