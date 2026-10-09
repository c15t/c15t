import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectSkippedScript,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { logRocket } from './logrocket';

describe('logRocket', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = logRocket({
			appId: 'c15tfake/c15tfake',
		});

		expectScriptMatchesIntegration('logRocket', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://cdn.logrocket.io/LogRocket.min.js',
		});
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
		});
	});

	it('trims the app ID and initializes after load with options', () => {
		const globalRef = getTestGlobal();
		const init = vi.fn();
		globalRef.LogRocket = {
			init,
		};
		const initOptions = {
			dom: {
				inputSanitizer: true,
			},
			shouldDebugLog: true,
		};
		const script = logRocket({
			appId: ' c15tfake/c15tfake ',
			initOptions,
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(init).toHaveBeenCalledWith('c15tfake/c15tfake', initOptions);
	});

	it('honors a custom loader URL', () => {
		const script = logRocket({
			appId: 'c15tfake/c15tfake',
			scriptUrl: 'https://cdn.example.com/logrocket.js',
		});

		expect(script.src).toBe('https://cdn.example.com/logrocket.js');
	});

	it('falls back to the default URL when scriptUrl is blank', () => {
		const script = logRocket({
			appId: 'c15tfake/c15tfake',
			scriptUrl: '   ',
		});

		expect(script.src).toBe('https://cdn.logrocket.io/LogRocket.min.js');
	});

	it('logs and skips the script for an empty app ID', () => {
		expectSkippedScript(
			() => logRocket({ appId: '   ' }),
			{ category: 'measurement', id: 'logrocket' },
			'logRocket: missing or invalid appId'
		);
	});

	it('logs and skips the script for app ids with missing or extra path segments', () => {
		for (const appId of [
			'c15tfake',
			'c15tfake/',
			'org/app/extra',
			'org//app',
			'/app',
			'org/',
			'org',
		]) {
			expectSkippedScript(
				() => logRocket({ appId }),
				{ category: 'measurement', id: 'logrocket' },
				"logRocket: invalid appId - must be in 'org/app' format"
			);
		}
	});

	it('seeds window._lrAsyncScript for proxy setups', () => {
		const globalRef = getTestGlobal();
		const script = logRocket({
			appId: 'org/app',
			asyncScriptUrl: 'https://proxy.example.com/logger.min.js',
			scriptUrl: 'https://proxy.example.com/LogRocket.min.js',
		});

		script.onBeforeLoad?.(createCallbackInfo({ id: script.id }));

		expect(globalRef._lrAsyncScript).toBe(
			'https://proxy.example.com/logger.min.js'
		);
	});
});
