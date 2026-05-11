import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { redditPixel } from './reddit-pixel';

describe('redditPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default page visit tracking', () => {
		const script = redditPixel({ pixelId: 't2_abcdef' });

		expectScriptMatchesIntegration('redditPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://www.redditstatic.com/ads/pixel.js',
		});
	});

	it('seeds the rdt queue and init/page visit events', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({ pixelId: 't2_abcdef' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const stub = globalRef.rdt as
			| (((...args: unknown[]) => void) & {
					callQueue?: unknown[][];
			  })
			| undefined;
		expect(typeof stub).toBe('function');
		expect(stub?.callQueue).toEqual([
			toArgumentsArray(['init', 't2_abcdef']),
			toArgumentsArray(['track', 'PageVisit']),
		]);
	});

	it('can disable the default page visit call', () => {
		const globalRef = getTestGlobal();
		const script = redditPixel({
			pixelId: 't2_abcdef',
			trackPageVisit: false,
			scriptUrl: 'https://cdn.example.com/reddit-pixel.js',
		});

		expect(script.src).toBe('https://cdn.example.com/reddit-pixel.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const stub = globalRef.rdt as
			| (((...args: unknown[]) => void) & {
					callQueue?: unknown[][];
			  })
			| undefined;
		expect(stub?.callQueue).toEqual([toArgumentsArray(['init', 't2_abcdef'])]);
	});
});
