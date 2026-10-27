/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { adobeTarget } from './vendors/functional/adobe-target';
import type { AdobeTargetOptions } from './vendors/functional/adobe-target';

const options = {
	datastreamId: '00000000-0000-4000-8000-000000000000',
	mode: 'websdk',
	orgId: 'C15TFAKE@AdobeOrg',
	version: '2.30.0',
} as const;
const granted = { ...deniedConsents, experience: true };

const deferred = () => {
	let resolveOperation: () => void = () => undefined;
	let rejectOperation: (error: Error) => void = () => undefined;
	const promise = new Promise<void>((resolve, reject) => {
		resolveOperation = resolve;
		rejectOperation = reject;
	});
	return { promise, reject: rejectOperation, resolve: resolveOperation };
};

// This double exposes completed SDK state separately from pending commands.
// Adobe's internal retry behavior is verified against the saved 2.30.0 SDK.
const installRuntime = (configure = Promise.resolve()) => {
	let acknowledged: 'in' | 'out' | 'pending' = 'pending';
	const requests: {
		general: 'in' | 'out';
		operation: ReturnType<typeof deferred>;
	}[] = [];
	const runtime = Object.assign(
		vi.fn(
			(
				command: string,
				value?: { consent?: { value: { general: 'in' | 'out' } }[] }
			) => {
				if (command === 'configure') {
					return configure;
				}
				const general = value?.consent?.[0]?.value.general;
				if (!general) {
					throw new Error('Expected Adobe 1.0 consent');
				}
				const operation = deferred();
				requests.push({ general, operation });
				return operation.promise.then(() => {
					acknowledged = general;
				});
			}
		),
		{ q: [] }
	);
	Object.assign(window, { alloy: runtime });
	return {
		get acknowledged() {
			return acknowledged;
		},
		requests,
		runtime,
	};
};

const finishLoad = async () => {
	const element = document.head.querySelector('script');
	if (!element) {
		throw new Error('Expected the real core loader to append Adobe Target');
	}
	element.dispatchEvent(new Event('load'));
	await vi.runOnlyPendingTimersAsync();
	return element;
};

describe('Adobe Target pending consent through the core loader', () => {
	registerVendorContractCleanup();
	afterEach(() => vi.useRealTimers());

	it.each(['in', 'out'] as const)(
		'retries rejected %s on the next same-state notification',
		async (general) => {
			vi.useFakeTimers();
			const report = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			const sdk = installRuntime();
			const scripts = [adobeTarget(options)];
			loadScripts(scripts, granted);
			const element = await finishLoad();
			if (general === 'out') {
				sdk.requests[0]?.operation.resolve();
				await vi.runOnlyPendingTimersAsync();
				updateScripts(scripts, deniedConsents);
			}
			const failure = new Error(`rejected ${general}`);
			sdk.requests.at(-1)?.operation.reject(failure);
			await vi.runOnlyPendingTimersAsync();
			expect(report).toHaveBeenCalledExactlyOnceWith(
				'adobeTarget: Web SDK setConsent failed',
				failure
			);
			const count = sdk.requests.length;
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.requests).toHaveLength(count);
			updateScripts(scripts, general === 'in' ? granted : deniedConsents);
			expect(sdk.requests).toHaveLength(count + 1);
			expect(sdk.requests.at(-1)?.general).toBe(general);
			sdk.requests.at(-1)?.operation.resolve();
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.acknowledged).toBe(general);
			updateScripts(scripts, general === 'in' ? granted : deniedConsents);
			expect(sdk.requests).toHaveLength(count + 1);
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect(element.isConnected).toBe(true);
		}
	);

	it.each(['resolve', 'reject'] as const)(
		'serializes denial after a pending grant that will %s',
		async (outcome) => {
			vi.useFakeTimers();
			vi.spyOn(console, 'error').mockImplementation(() => undefined);
			const sdk = installRuntime();
			const scripts = [adobeTarget(options)];
			loadScripts(scripts, granted);
			await finishLoad();
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, deniedConsents);
			expect(sdk.requests.map((request) => request.general)).toEqual(['in']);
			if (outcome === 'resolve') {
				sdk.requests[0]?.operation.resolve();
			} else {
				sdk.requests[0]?.operation.reject(new Error('grant failed'));
			}
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.requests.map((request) => request.general)).toEqual([
				'in',
				'out',
			]);
			sdk.requests[1]?.operation.resolve();
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.acknowledged).toBe('out');
		}
	);

	it('coalesces rapid in/out/in updates without overlapping or stale SDK state', async () => {
		vi.useFakeTimers();
		const sdk = installRuntime();
		const scripts = [adobeTarget(options)];
		loadScripts(scripts, granted);
		await finishLoad();
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, granted);
		updateScripts(scripts, granted);
		expect(sdk.requests.map((request) => request.general)).toEqual(['in']);
		sdk.requests[0]?.operation.resolve();
		await vi.runOnlyPendingTimersAsync();
		expect(sdk.acknowledged).toBe('in');
		expect(sdk.requests).toHaveLength(1);
		updateScripts(scripts, deniedConsents);
		expect(sdk.requests.at(-1)?.general).toBe('out');
		sdk.requests.at(-1)?.operation.resolve();
		await vi.runOnlyPendingTimersAsync();
		expect(sdk.acknowledged).toBe('out');
	});

	it.each(['resolve', 'reject'] as const)(
		'restores the latest grant after a pending denial will %s',
		async (outcome) => {
			vi.useFakeTimers();
			vi.spyOn(console, 'error').mockImplementation(() => undefined);
			const sdk = installRuntime();
			const scripts = [adobeTarget(options)];
			loadScripts(scripts, granted);
			await finishLoad();
			sdk.requests[0]?.operation.resolve();
			await vi.runOnlyPendingTimersAsync();
			updateScripts(scripts, deniedConsents);
			updateScripts(scripts, granted);
			expect(sdk.requests.map((request) => request.general)).toEqual([
				'in',
				'out',
			]);
			if (outcome === 'resolve') {
				sdk.requests[1]?.operation.resolve();
			} else {
				sdk.requests[1]?.operation.reject(new Error('denial failed'));
			}
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.requests.map((request) => request.general)).toEqual([
				'in',
				'out',
				'in',
			]);
			sdk.requests[2]?.operation.resolve();
			await vi.runOnlyPendingTimersAsync();
			expect(sdk.acknowledged).toBe('in');
		}
	);

	it.each(['configure', 'setConsent'] as const)(
		'denies after disposal during pending %s without premature startup',
		async (pending) => {
			vi.useFakeTimers();
			const configuring = deferred();
			const sdk = installRuntime(
				pending === 'configure' ? configuring.promise : undefined
			);
			const kernel = createConsentKernel();
			const loader = createScriptLoader({
				kernel,
				scripts: [adobeTarget(options)],
			});
			try {
				expect(document.head.querySelector('script')).toBeNull();
				expect(sdk.runtime).not.toHaveBeenCalled();
				await kernel.commands.save({ experience: true });
				expect(sdk.runtime).not.toHaveBeenCalled();
				await finishLoad();
				loader.dispose();
				expect(sdk.requests.map((request) => request.general)).toEqual(
					pending === 'configure' ? [] : ['in']
				);
				if (pending === 'configure') {
					configuring.resolve();
				} else {
					sdk.requests[0]?.operation.resolve();
				}
				await vi.runOnlyPendingTimersAsync();
				expect(sdk.requests.at(-1)?.general).toBe('out');
				sdk.requests.at(-1)?.operation.resolve();
				await vi.runOnlyPendingTimersAsync();
				expect(sdk.acknowledged).toBe('out');
			} finally {
				loader.dispose();
				kernel.dispose();
			}
		}
	);

	it('reports rejected configuration and leaves recovery to a reload of the one-shot SDK', async () => {
		vi.useFakeTimers();
		const report = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const configuring = deferred();
		const sdk = installRuntime(configuring.promise);
		const scripts = [adobeTarget(options)];
		loadScripts(scripts, granted);
		await finishLoad();
		const failure = new Error('configuration failed');
		configuring.reject(failure);
		await vi.runOnlyPendingTimersAsync();
		updateScripts(scripts, granted);
		updateScripts(scripts, deniedConsents);
		updateScripts(scripts, granted);
		expect(sdk.runtime).toHaveBeenCalledExactlyOnceWith('configure', {
			datastreamId: options.datastreamId,
			defaultConsent: 'pending',
			orgId: options.orgId,
		});
		expect(sdk.acknowledged).toBe('pending');
		expect(report).toHaveBeenCalledExactlyOnceWith(
			'adobeTarget: Web SDK configure failed',
			failure
		);
	});

	it.each(
		(
			[
				{ mode: 'atjs', scriptUrl: '/scripts/at.js' },
				options,
			] satisfies AdobeTargetOptions[]
		).flatMap((configuration) =>
			[true, false].map((deniedFirst) => ({ configuration, deniedFirst }))
		)
	)(
		'includes initially denied registrations: $configuration.mode, denied first $deniedFirst',
		async ({ configuration, deniedFirst }) => {
			vi.useFakeTimers();
			const sdk = installRuntime();
			const approve = vi.fn();
			const deny = vi.fn();
			const targetWindow: Window & {
				targetGlobalSettings?: Record<string, unknown>;
			} = Object.assign(window, {
				adobe: {
					OptInCategories: { TARGET: 'target' },
					optIn: { approve, deny },
				},
			});
			const allowed = createConsentKernel();
			const denied = createConsentKernel();
			await allowed.commands.save({ experience: true });
			const script = adobeTarget(configuration);
			const createAllowed = () =>
				createScriptLoader({ kernel: allowed, scripts: [script] });
			const createDenied = () =>
				createScriptLoader({ kernel: denied, scripts: [script] });
			const first = deniedFirst ? createDenied() : createAllowed();
			const second = deniedFirst ? createAllowed() : createDenied();
			try {
				await finishLoad();
				const atjs = configuration.mode === 'atjs';
				expect(approve).toHaveBeenCalledTimes(atjs && !deniedFirst ? 1 : 0);
				expect(deny.mock.calls).toEqual(atjs ? [['target']] : []);
				expect(sdk.runtime).not.toHaveBeenCalled();
				expect(targetWindow.targetGlobalSettings).toEqual(
					atjs ? { optinEnabled: true } : undefined
				);
				await denied.commands.save({ experience: true });
				await vi.runOnlyPendingTimersAsync();
				const approvals = deniedFirst ? 1 : 2;
				expect(approve).toHaveBeenCalledTimes(atjs ? approvals : 0);
				expect(sdk.requests.map((request) => request.general)).toEqual(
					atjs ? [] : ['in']
				);
				sdk.requests[0]?.operation.resolve();
				await vi.runOnlyPendingTimersAsync();
				expect(sdk.acknowledged).toBe(atjs ? 'pending' : 'in');
			} finally {
				first.dispose();
				second.dispose();
				allowed.dispose();
				denied.dispose();
				document.head.innerHTML = '';
			}
		}
	);
});
