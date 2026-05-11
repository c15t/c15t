import { describe, expect, it } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	getTestGlobal,
	setupScriptHelperTest,
	toArgumentsArray,
} from '../../__tests__/helpers';
import { hotjar } from './hotjar';

describe('hotjar', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader', () => {
		const script = hotjar({ siteId: 1234567 });

		expectScriptMatchesIntegration('hotjar', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.hotjar.com/c/hotjar-1234567.js?sv=6',
		});
	});

	it('seeds Hotjar globals and buffers queue calls before script load', () => {
		const globalRef = getTestGlobal();
		const script = hotjar({ siteId: 1234567, version: 6 });

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		expect(globalRef._hjSettings).toEqual({
			hjid: 1234567,
			hjsv: 6,
		});

		const hj = globalRef.hj as ((...args: unknown[]) => void) & {
			q?: unknown[][];
		};
		expect(typeof hj).toBe('function');

		hj('event', 'signup');
		expect(hj.q).toEqual([toArgumentsArray(['event', 'signup'])]);
	});

	it('honors a custom loader URL', () => {
		const script = hotjar({
			siteId: 1234567,
			scriptUrl: 'https://cdn.example.com/hotjar.js',
		});

		expect(script.src).toBe('https://cdn.example.com/hotjar.js');
	});
});
