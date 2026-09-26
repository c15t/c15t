/** @vitest-environment jsdom */
import { expect, test, vi } from 'vitest';

import { custom } from '../../transports/mode';
import { createOfflineTransport } from '../../transports/offline';
import type { ConsentState } from '../../types';
import { createConsentRuntime } from '../index';

test('external decisions change gates without creating receipts, persistence or a second banner', async () => {
	let permissions: Partial<ConsentState> | null = null;
	let notify = () => {};
	const detach = vi.fn();
	const recorded = vi.fn();
	const source = {
		getPermissions: () => permissions,
		openPreferences: vi.fn(),
		subscribe: (listener: () => void) => {
			notify = listener;
			return detach;
		},
	};
	const runtime = createConsentRuntime({
		callbacks: { onChoiceRecorded: recorded },
		consentSource: source,
		iframeBlocker: false,
		mode: custom(createOfflineTransport()),
	});
	localStorage.clear();
	runtime.start();
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
	permissions = { measurement: true };
	notify();
	expect(runtime.kernel.getSnapshot().effectivePermissions).toMatchObject({
		marketing: false,
		measurement: true,
	});
	expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
	expect(localStorage.length).toBe(0);
	expect(recorded).not.toHaveBeenCalled();
	await expect(runtime.kernel.commands.save('all')).rejects.toThrow(
		'external CMP'
	);
	expect(runtime.kernel.getSnapshot().explicitChoice).toBeNull();
	expect(recorded).not.toHaveBeenCalled();
	permissions = null;
	notify();
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	source.getPermissions = () => {
		throw new Error('provider unavailable');
	};
	notify();
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
	runtime.dispose();
	expect(detach).toHaveBeenCalledTimes(1);
	permissions = { measurement: true };
	notify();
	expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
		false
	);
});

test('ordinary kernels cannot be switched to external authority after creation', () => {
	const runtime = createConsentRuntime({
		mode: custom(createOfflineTransport()),
	});
	expect(() =>
		runtime.kernel.set.externalPermissions({ measurement: true })
	).toThrow('Configure external');
	runtime.dispose();
});

test('reloads once after withdrawal, and cancels a pending reload when disposed', async () => {
	const reload = vi.fn();
	const originalWindow = window;
	vi.stubGlobal(
		'window',
		new Proxy(originalWindow, {
			get(target, key) {
				// oxlint-disable-next-line anti-slop/no-reflect-get -- Forward the native Window receiver while replacing only its unforgeable location for this test.
				return key === 'location' ? { reload } : Reflect.get(target, key);
			},
		})
	);
	try {
		for (const disposeBeforeReload of [false, true]) {
			let permissions: Partial<ConsentState> = {
				marketing: true,
				measurement: true,
			};
			let notify = () => {};
			const runtime = createConsentRuntime({
				consentSource: {
					getPermissions: () => permissions,
					openPreferences: () => {},
					subscribe: (listener) => {
						notify = listener;
						return () => {};
					},
				},
				iframeBlocker: false,
				mode: custom(createOfflineTransport()),
				reloadOnRevocation: true,
				scripts: [
					{ callbackOnly: true, category: 'measurement', id: 'tracker' },
				],
			});
			runtime.start();
			permissions = { marketing: true, measurement: false };
			notify();
			permissions = { marketing: false, measurement: false };
			notify();
			expect(reload).toHaveBeenCalledTimes(disposeBeforeReload ? 1 : 0);
			if (disposeBeforeReload) {
				runtime.dispose();
			}
			// oxlint-disable-next-line no-await-in-loop -- Each case must observe its queued reload before the next runtime starts.
			await Promise.resolve();
			expect(reload).toHaveBeenCalledTimes(1);
			runtime.dispose();
		}
	} finally {
		vi.unstubAllGlobals();
	}
});

test('all framework preference setters delegate without opening c15t UI, and errors reach callbacks', async () => {
	const error = new Error('CMP unavailable');
	const openPreferences = vi.fn<() => void | Promise<void>>();
	const onError = vi.fn();
	const init = vi.fn();
	const identify = vi.fn();
	const runtime = createConsentRuntime({
		callbacks: { onError },
		consentSource: {
			getPermissions: () => null,
			openPreferences,
			subscribe: () => () => {},
		},
		iframeBlocker: false,
		mode: custom({ identify, init }),
	});
	runtime.start();
	runtime.kernel.set.activeUI('dialog');
	expect(openPreferences).toHaveBeenCalledTimes(1);
	runtime.kernel.set.activeUI('banner');
	expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
	openPreferences.mockRejectedValueOnce(error);
	runtime.kernel.set.activeUI('dialog');
	await Promise.resolve();
	expect(onError).toHaveBeenCalledWith({ error: 'CMP unavailable' });
	openPreferences.mockImplementationOnce(() => {
		throw error;
	});
	runtime.kernel.set.activeUI('dialog');
	expect(onError).toHaveBeenCalledTimes(2);
	await runtime.kernel.commands.init();
	await runtime.kernel.commands.identify({ id: 'external-user' });
	expect(init).not.toHaveBeenCalled();
	expect(identify).not.toHaveBeenCalled();
	runtime.dispose();
	runtime.kernel.set.activeUI('dialog');
	expect(openPreferences).toHaveBeenCalledTimes(3);
});
