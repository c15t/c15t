/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	grantedMeasurementConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
	updateScripts,
} from './e2e-test-utils';
import {
	AMPLITUDE_QUEUE_METHODS,
	amplitude,
	DEFAULT_AMPLITUDE_SCRIPT_URL,
} from './vendors/analytics/amplitude';

type QueueEntrySnapshot = {
	name: string;
	args: unknown[];
	resolveType: string;
};

function snapshotArg(arg: unknown): unknown {
	if (typeof arg === 'object' && arg !== null) {
		const record = arg as Record<string, unknown>;
		if (!Array.isArray(record._q)) {
			return arg;
		}

		return {
			_q: record._q,
		};
	}

	return arg;
}

function snapshotQueue(win: TestWindow): QueueEntrySnapshot[] {
	return (win.amplitude?._q ?? []).map((entry) => ({
		name: entry.name,
		args: entry.args.map((arg) => snapshotArg(arg)),
		resolveType: typeof entry.resolve,
	}));
}

describe('amplitude contract', () => {
	registerVendorContractCleanup();

	it('boots the Browser SDK 2 queue contract before the loader appends', () => {
		let methodTypes: Record<string, string> | undefined;
		let queueSnapshot: QueueEntrySnapshot[] | undefined;
		let scriptSrc: string | undefined;
		let invoked: boolean | undefined;
		let instanceQueueRegistry: Record<string, unknown> | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.amplitude.com/libs/analytics-browser-')) {
				return;
			}

			scriptSrc = node.src;
			invoked = win.amplitude?.invoked;
			instanceQueueRegistry = win.amplitude?._iq;
			methodTypes = Object.fromEntries(
				AMPLITUDE_QUEUE_METHODS.map((method) => [
					method,
					typeof win.amplitude?.[method],
				])
			);

			win.amplitude?.track?.('Signup', { plan: 'pro' });
			const identify = win.amplitude?.Identify
				? new win.amplitude.Identify().set('plan', 'pro')
				: undefined;
			if (identify) {
				win.amplitude?.identify?.(identify);
			}
			win.amplitude?.setUserId?.('user-12345');
			queueSnapshot = snapshotQueue(win);
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...amplitude({
						apiKey: 'AMPLITUDE-CONTRACT',
						initOptions: {
							autocapture: false,
						},
					}),
					id: 'amplitude-contract',
				},
			],
			grantedMeasurementConsents
		);

		expect(scriptSrc).toBe(DEFAULT_AMPLITUDE_SCRIPT_URL);
		expect(invoked).toBe(true);
		expect(instanceQueueRegistry).toEqual({});
		expect(methodTypes).toEqual(
			Object.fromEntries(
				AMPLITUDE_QUEUE_METHODS.map((method) => [method, 'function'])
			)
		);
		expect(queueSnapshot).toEqual([
			{
				name: 'init',
				args: ['AMPLITUDE-CONTRACT', { autocapture: false }],
				resolveType: 'function',
			},
			{
				name: 'track',
				args: ['Signup', { plan: 'pro' }],
				resolveType: 'function',
			},
			{
				name: 'identify',
				args: [
					{
						_q: [
							{
								name: 'set',
								args: ['plan', 'pro'],
							},
						],
					},
				],
				resolveType: 'function',
			},
			{
				name: 'setUserId',
				args: ['user-12345'],
				resolveType: 'function',
			},
		]);
	});

	it('waits for measurement consent before appending the loader', () => {
		let appended = false;

		installHeadProbe((node) => {
			if (node.src.includes('cdn.amplitude.com/libs/analytics-browser-')) {
				appended = true;
			}
		});

		loadScripts(
			[
				{
					...amplitude({
						apiKey: 'AMPLITUDE-CONTRACT',
					}),
					id: 'amplitude-contract',
				},
			],
			deniedConsents
		);

		expect(appended).toBe(false);
		expect((window as TestWindow).amplitude).toBeUndefined();
	});

	it('calls setOptOut(true) after load and unloads by default on revoke', () => {
		const setOptOut = vi.fn();
		const script = {
			...amplitude({
				apiKey: 'AMPLITUDE-CONTRACT',
			}),
			id: 'amplitude-contract',
		};

		installHeadProbe((node, win) => {
			if (!node.src.includes('cdn.amplitude.com/libs/analytics-browser-')) {
				return;
			}

			win.amplitude = {
				setOptOut,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts([script], grantedMeasurementConsents);

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			consents: deniedConsents,
			hasConsent: false,
		});

		expect(setOptOut).toHaveBeenCalledWith(true);

		const result = updateScripts([script], deniedConsents);

		expect(result.unloaded).toEqual(['amplitude-contract']);
		expect(
			document.getElementById('c15t-script-amplitude-contract')
		).toBeNull();
	});

	it('calls setOptOut(false) when measurement consent is granted after load', () => {
		const setOptOut = vi.fn();
		const script = amplitude({
			apiKey: 'AMPLITUDE-CONTRACT',
		});

		(window as TestWindow).amplitude = {
			setOptOut,
		};

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			consents: grantedMeasurementConsents,
			hasConsent: true,
		});

		expect(setOptOut).toHaveBeenCalledWith(false);
	});
});
