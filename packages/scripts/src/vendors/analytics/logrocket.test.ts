import { describe, expect, it, vi } from 'vitest';
import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
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
				id: script.id,
				hasConsent: true,
				consents: grantedMeasurementConsentState,
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

	it('throws for an empty or malformed app ID', () => {
		expect(() => logRocket({ appId: '   ' })).toThrowError(
			"logRocket: invalid appId - must be a non-empty string in 'org/app' format"
		);
		expect(() => logRocket({ appId: 'c15tfake' })).toThrowError(
			"logRocket: invalid appId - must be a non-empty string in 'org/app' format"
		);
		expect(() => logRocket({ appId: 'c15tfake/' })).toThrowError(
			"logRocket: invalid appId - must be a non-empty string in 'org/app' format"
		);
	});
});
