import { describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	expectScriptMatchesIntegration,
	getTestGlobal,
	grantedMeasurementConsentState,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import {
	AMPLITUDE_IDENTIFY_METHODS,
	AMPLITUDE_QUEUE_METHODS,
	amplitude,
	DEFAULT_AMPLITUDE_SCRIPT_URL,
} from './amplitude';

interface QueueEntrySnapshot {
	name: string;
	args: unknown[];
	resolveType: string;
}

const snapshotAmplitudeQueue =
	function snapshotAmplitudeQueue(): QueueEntrySnapshot[] {
		const globalRef = getTestGlobal();
		const amplitudeGlobal = globalRef.amplitude as Window['amplitude'];

		return (amplitudeGlobal?._q ?? []).map((entry) => ({
			args: entry.args,
			name: entry.name,
			resolveType: typeof entry.resolve,
		}));
	};

describe('amplitude', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the pinned default loader URL', () => {
		const script = amplitude({
			apiKey: 'AMPLITUDE_API_KEY',
		});

		expectScriptMatchesIntegration('amplitude', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: DEFAULT_AMPLITUDE_SCRIPT_URL,
		});
	});

	it('seeds the Browser SDK 2 snippet queue contract before load', () => {
		const globalRef = getTestGlobal();
		const script = amplitude({
			apiKey: ' AMPLITUDE_API_KEY ',
			initOptions: {
				autocapture: false,
			},
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		const amplitudeGlobal = globalRef.amplitude as Window['amplitude'];
		const methodTypes = Object.fromEntries(
			AMPLITUDE_QUEUE_METHODS.map((method) => [
				method,
				typeof amplitudeGlobal?.[method],
			])
		);
		const identify = amplitudeGlobal?.Identify
			? new amplitudeGlobal.Identify()
			: undefined;
		const identifyMethodTypes = Object.fromEntries(
			AMPLITUDE_IDENTIFY_METHODS.map((method) => [
				method,
				typeof identify?.[method],
			])
		);

		expect(amplitudeGlobal?.invoked).toBe(true);
		expect(amplitudeGlobal?._iq).toEqual({});
		expect(typeof amplitudeGlobal?.Identify).toBe('function');
		expect(methodTypes).toEqual(
			Object.fromEntries(
				AMPLITUDE_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(identifyMethodTypes).toEqual(
			Object.fromEntries(
				AMPLITUDE_IDENTIFY_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(snapshotAmplitudeQueue()).toEqual([
			{
				args: ['AMPLITUDE_API_KEY', { autocapture: false }],
				name: 'init',
				resolveType: 'function',
			},
		]);
	});

	it('queues method-call records and returns wrapped promises before load', () => {
		const globalRef = getTestGlobal();
		const script = amplitude({
			apiKey: 'AMPLITUDE_API_KEY',
		});

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		const amplitudeGlobal = globalRef.amplitude as Window['amplitude'];
		const trackResult = amplitudeGlobal?.track('Signup', { plan: 'pro' });
		const identify = amplitudeGlobal?.Identify
			? new amplitudeGlobal.Identify().set('plan', 'pro')
			: undefined;
		const identifyResult = identify
			? amplitudeGlobal?.identify(identify)
			: undefined;
		const optOutResult = amplitudeGlobal?.setOptOut(true);

		// Amplitude's snippet contract exposes the pending promise on a
		// `promise` property rather than returning a bare Promise.
		expect(
			typeof (trackResult as { promise: Promise<unknown> }).promise.then
		).toBe('function');
		expect(
			typeof (identifyResult as { promise: Promise<unknown> }).promise.then
		).toBe('function');
		// Snippet-synchronous methods queue but return nothing.
		expect(optOutResult).toBeUndefined();
		expect(identify?._q).toEqual([
			{
				args: ['plan', 'pro'],
				name: 'set',
			},
		]);
		expect(snapshotAmplitudeQueue()).toEqual([
			{
				args: ['AMPLITUDE_API_KEY', {}],
				name: 'init',
				resolveType: 'function',
			},
			{
				args: ['Signup', { plan: 'pro' }],
				name: 'track',
				resolveType: 'function',
			},
			{
				args: [identify],
				name: 'identify',
				resolveType: 'function',
			},
			{
				args: [true],
				name: 'setOptOut',
				resolveType: 'function',
			},
		]);
	});

	it('uses a custom loader URL and falls back when the override is blank', () => {
		expect(
			amplitude({
				apiKey: 'AMPLITUDE_API_KEY',
				scriptUrl: 'https://analytics.example.com/amplitude.js',
			}).src
		).toBe('https://analytics.example.com/amplitude.js');

		expect(
			amplitude({
				apiKey: 'AMPLITUDE_API_KEY',
				scriptUrl: '   ',
			}).src
		).toBe(DEFAULT_AMPLITUDE_SCRIPT_URL);
	});

	it('throws for an empty API key', () => {
		expect(() => amplitude({ apiKey: '   ' })).toThrowError(
			'amplitude: missing or invalid apiKey'
		);
	});

	it('syncs consent changes through setOptOut after load', () => {
		const globalRef = getTestGlobal();
		const setOptOut = vi.fn();
		globalRef.amplitude = {
			setOptOut,
		};

		const script = amplitude({
			apiKey: 'AMPLITUDE_API_KEY',
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);
		expect(setOptOut).toHaveBeenCalledWith(true);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);
		expect(setOptOut).toHaveBeenCalledWith(false);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: deniedConsentState,
				hasConsent: false,
				id: script.id,
			})
		);
		expect(setOptOut).toHaveBeenCalledWith(true);
		expect(setOptOut).toHaveBeenCalledTimes(3);
	});
});
