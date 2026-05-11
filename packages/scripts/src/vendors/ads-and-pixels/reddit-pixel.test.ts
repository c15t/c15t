import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
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

		runOnBeforeLoad(script);

		const stub = globalRef.rdt as
			| (((...args: unknown[]) => void) & {
					callQueue?: unknown[][];
			  })
			| undefined;
		expect(typeof stub).toBe('function');
		expectStubCommandQueue(stub, 'callQueue', [
			['init', 't2_abcdef'],
			['track', 'PageVisit'],
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
		runOnBeforeLoad(script);

		const stub = globalRef.rdt as
			| (((...args: unknown[]) => void) & {
					callQueue?: unknown[][];
			  })
			| undefined;
		expectStubCommandQueue(stub, 'callQueue', [['init', 't2_abcdef']]);
	});
});
