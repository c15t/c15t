import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { snapchatPixel } from './snapchat-pixel';

type SnaptrStub =
	| (((...args: unknown[]) => void) & {
			queue?: unknown[][];
			version?: string;
	  })
	| undefined;

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

		runOnBeforeLoad(script);

		const stub = globalRef.snaptr as SnaptrStub;

		expect(stub?.version).toBe('1.0');
		expectStubCommandQueue(stub, 'queue', [
			['init', '123456789012345'],
			['track', 'PAGE_VIEW'],
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
		runOnBeforeLoad(script);

		const stub = globalRef.snaptr as SnaptrStub;
		expectStubCommandQueue(stub, 'queue', [
			['init', '123456789012345', { user_email: 'hello@example.com' }],
		]);
	});
});
