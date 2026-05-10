import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { snapchatPixel } from './snapchat-pixel';

describe('snapchatPixel', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default tracking', () => {
		const script = snapchatPixel({ pixelId: '123456789012345' });

		expectScriptMatchesIntegration('snapchatPixel', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://sc-static.net/scevent.min.js',
		});
	});

	it('queues init and default page view before script load', () => {
		const globalRef = getTestGlobal();
		const script = snapchatPixel({ pixelId: '123456789012345' });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const stub = globalRef.snaptr as
			| (((...args: unknown[]) => void) & {
					queue?: unknown[][];
					version?: string;
			  })
			| undefined;

		expect(stub?.version).toBe('1.0');
		expect(stub?.queue).toEqual([
			toArgumentsArray(['init', '123456789012345']),
			toArgumentsArray(['track', 'PAGE_VIEW']),
		]);
	});

	it('supports init options and disabling PAGE_VIEW', () => {
		const globalRef = getTestGlobal();
		const script = snapchatPixel({
			pixelId: '123456789012345',
			initOptions: { user_email: 'hello@example.com' },
			trackPageView: false,
			scriptUrl: 'https://cdn.example.com/scevent.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/scevent.min.js');
		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		const stub = globalRef.snaptr as
			| (((...args: unknown[]) => void) & { queue?: unknown[][] })
			| undefined;
		expect(stub?.queue).toEqual([
			toArgumentsArray([
				'init',
				'123456789012345',
				{ user_email: 'hello@example.com' },
			]),
		]);
	});
});
