import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { HIGHTOUCH_QUEUE_METHODS, hightouch } from './hightouch';

type HightouchQueue = unknown[] & {
	_loadOptions?: Record<string, unknown>;
	_writeKey?: string;
	[key: string]: unknown;
};

describe('hightouch', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default page tracking', () => {
		const script = hightouch({ writeKey: 'WRITE_KEY' });

		expectScriptMatchesIntegration('hightouch', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js',
		});
	});

	it('queues load and page by default without apiHost', () => {
		const globalRef = getTestGlobal();
		const script = hightouch({ writeKey: ' WRITE_KEY ' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const htevents = globalRef.htevents as HightouchQueue | undefined;

		expect(Array.isArray(htevents)).toBe(true);
		expect(htevents?._writeKey).toBe('WRITE_KEY');
		expect(htevents?._loadOptions).toEqual({});
		expect(htevents?.[0]).toEqual(toArgumentsArray(['load', 'WRITE_KEY', {}]));
		expect(htevents?.[1]).toEqual(toArgumentsArray(['page']));
	});

	it('passes apiHost when provided', () => {
		const globalRef = getTestGlobal();
		const script = hightouch({
			writeKey: 'WRITE_KEY',
			apiHost: ' us-east-1.hightouch-events.com ',
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const htevents = globalRef.htevents as HightouchQueue | undefined;

		expect(htevents?._loadOptions).toEqual({
			apiHost: 'us-east-1.hightouch-events.com',
		});
		expect(htevents?.[0]).toEqual(
			toArgumentsArray([
				'load',
				'WRITE_KEY',
				{ apiHost: 'us-east-1.hightouch-events.com' },
			])
		);
	});

	it('defines the official snippet queue methods before load', () => {
		const globalRef = getTestGlobal();
		const script = hightouch({ writeKey: 'WRITE_KEY' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const htevents = globalRef.htevents as HightouchQueue | undefined;
		const methodTypes = Object.fromEntries(
			HIGHTOUCH_QUEUE_METHODS.map((method) => [
				method,
				typeof htevents?.[method],
			])
		);

		expect(methodTypes).toEqual(
			Object.fromEntries(
				HIGHTOUCH_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
	});

	it('can disable default page queue and use a custom script URL', () => {
		const globalRef = getTestGlobal();
		const script = hightouch({
			writeKey: 'WRITE_KEY',
			trackPageView: false,
			scriptUrl: 'https://cdn.example.com/events.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/events.min.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const htevents = globalRef.htevents as HightouchQueue | undefined;

		expect(Array.isArray(htevents)).toBe(true);
		expect(htevents?.length).toBe(1);
		expect(htevents?.[0]).toEqual(toArgumentsArray(['load', 'WRITE_KEY', {}]));
		expect(htevents?.[1]).not.toEqual(toArgumentsArray(['page']));
	});

	it('falls back to the default URL when scriptUrl is blank', () => {
		const script = hightouch({
			writeKey: 'WRITE_KEY',
			scriptUrl: '   ',
		});

		expect(script.src).toBe(
			'https://cdn.hightouch-events.com/browser/release/v1-latest/events.min.js'
		);
	});

	it('throws for an empty write key', () => {
		expect(() => hightouch({ writeKey: '   ' })).toThrowError(
			'hightouch: missing or invalid writeKey'
		);
	});
});
