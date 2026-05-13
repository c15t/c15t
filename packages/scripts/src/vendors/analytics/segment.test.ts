import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { segment } from './segment';

describe('segment', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default page tracking', () => {
		const script = segment({ writeKey: 'abc123xyz456' });

		expectScriptMatchesIntegration('segment', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.segment.com/analytics.js/v1/abc123xyz456/analytics.min.js',
		});
	});

	it('queues page call by default', () => {
		const globalRef = getTestGlobal();
		const script = segment({ writeKey: 'abc123xyz456' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const analytics = globalRef.analytics as unknown[] | undefined;
		expect(analytics?.[0]).toEqual(toArgumentsArray(['page']));
	});

	it('can disable default page queue and use custom script URL', () => {
		const globalRef = getTestGlobal();
		const script = segment({
			writeKey: 'abc123xyz456',
			trackPageView: false,
			scriptUrl: 'https://cdn.example.com/analytics.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/analytics.min.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const analytics = globalRef.analytics as
			| (unknown[] & { page?: unknown })
			| undefined;
		expect(Array.isArray(analytics)).toBe(true);
		expect(analytics?.length).toBe(0);
		expect(typeof analytics?.page).toBe('function');
	});

	it('does not queue page when trackPageView is false and still queues track calls', () => {
		const globalRef = getTestGlobal();
		const script = segment({
			writeKey: 'segment-key',
			trackPageView: false,
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));
		const analytics = globalRef.analytics as
			| (unknown[] & {
					page?: unknown;
					track?: (event: string, properties?: Record<string, unknown>) => void;
			  })
			| undefined;

		expect(Array.isArray(analytics)).toBe(true);
		expect(analytics?.length).toBe(0);
		expect(analytics?.[0]).not.toEqual(toArgumentsArray(['page']));

		analytics?.track?.('Signup', { plan: 'pro' });
		expect(analytics?.[0]).toEqual(
			toArgumentsArray(['track', 'Signup', { plan: 'pro' }])
		);

		const appendChildCalls = (
			globalThis.document as unknown as {
				head: { appendChild: { mock: { calls: unknown[] } } };
			}
		).head.appendChild.mock.calls;
		expect(appendChildCalls).toHaveLength(0);
	});
});
