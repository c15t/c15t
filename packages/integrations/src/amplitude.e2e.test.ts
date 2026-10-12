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
	updateScripts,
} from './e2e-test-utils';
import type { TestWindow } from './e2e-test-utils';
import {
	AMPLITUDE_QUEUE_METHODS,
	amplitude,
	DEFAULT_AMPLITUDE_SCRIPT_URL,
} from './vendors/analytics/amplitude';

interface QueueEntrySnapshot {
	name: string;
	args: unknown[];
	resolveType: string;
}

const snapshotArg = function snapshotArg(arg: unknown): unknown {
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
};

const snapshotQueue = function snapshotQueue(
	win: TestWindow
): QueueEntrySnapshot[] {
	return (win.amplitude?._q ?? []).map((entry) => ({
		args: entry.args.map((arg) => snapshotArg(arg)),
		name: entry.name,
		resolveType: typeof entry.resolve,
	}));
};

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
				args: ['AMPLITUDE-CONTRACT', { autocapture: false }],
				name: 'init',
				resolveType: 'function',
			},
			{
				args: [false],
				name: 'setOptOut',
				resolveType: 'function',
			},
			{
				args: ['Signup', { plan: 'pro' }],
				name: 'track',
				resolveType: 'function',
			},
			{
				args: [
					{
						_q: [
							{
								args: ['plan', 'pro'],

								name: 'set',
							},
						],
					},
				],
				name: 'identify',
				resolveType: 'function',
			},
			{
				args: ['user-12345'],
				name: 'setUserId',
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

	it('calls setOptOut(true) on revoke and keeps the loaded SDK on the page', () => {
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
		updateScripts([script], deniedConsents);

		expect(setOptOut).toHaveBeenCalledWith(true);
		expect(
			document.querySelector('script[src*="cdn.amplitude.com/libs/"]')
		).not.toBeNull();
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
			consents: grantedMeasurementConsents,
			elementId: script.id,
			hasConsent: true,
			id: script.id,
		});

		expect(setOptOut).toHaveBeenCalledWith(false);
	});

	it('keeps the loaded SDK and opts back in on grant, revoke, grant without a reload', () => {
		const setOptOut = vi.fn();
		const track = vi.fn();
		let appends = 0;
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

			appends += 1;
			// The Browser SDK 2 bundle assigns its live methods onto the snippet
			// object and drains `_q`.
			Object.assign(win.amplitude ?? {}, { setOptOut, track });
			node.dispatchEvent(new Event('load'));
		});

		loadScripts([script], grantedMeasurementConsents);
		updateScripts([script], deniedConsents);
		loadScripts([script], grantedMeasurementConsents);

		const win = window as TestWindow;
		win.amplitude?.track?.('Signup');

		expect(appends).toBe(1);
		expect(setOptOut.mock.calls).toEqual([[true], [false]]);
		expect(track).toHaveBeenCalledWith('Signup');
	});
});
