/** @vitest-environment jsdom */
import { expect, test, vi } from 'vitest';

import {
	matchedResolution,
	optInRule,
	NOW,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import { evaluateConsent } from '../../modules/has';
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

test('a failed external subscription reports the error without aborting startup or granting consent', () => {
	const onError = vi.fn();
	const initialized = vi.fn();
	const openPreferences = vi.fn();
	let notify = () => {};
	const runtime = createConsentRuntime({
		callbacks: { onError },
		consentSource: {
			getPermissions: () => ({ measurement: true }),
			openPreferences,
			subscribe: (listener) => {
				notify = listener;
				throw new Error('CMP unavailable');
			},
		},
		iframeBlocker: false,
		mode: custom(createOfflineTransport()),
	});
	runtime.kernel.events.on('init:applied', initialized);
	try {
		expect(() => runtime.start()).not.toThrow();
		expect(onError).toHaveBeenCalledWith({ error: 'CMP unavailable' });
		expect(initialized).toHaveBeenCalledOnce();
		notify();
		expect(runtime.kernel.getSnapshot().effectivePermissions).toMatchObject({
			marketing: false,
			measurement: false,
		});
		runtime.kernel.set.activeUI('dialog');
		expect(openPreferences).not.toHaveBeenCalled();
	} finally {
		runtime.dispose();
	}
});

const withdrawExternally = async function withdrawExternally(
	options: {
		disposeBeforeReload?: boolean;
		reloadOnConsentRevoked?: boolean;
	} = {}
) {
	vi.useFakeTimers();
	const reload = vi.fn();
	vi.spyOn(window, 'location', 'get').mockReturnValue({
		reload,
	} as unknown as Location);
	const onBeforeConsentRevocationReload = vi.fn();
	const onLoad = vi.fn();
	let permissions: Partial<ConsentState> = {
		marketing: true,
		measurement: true,
	};
	let notify = () => {};
	const runtime = createConsentRuntime({
		callbacks: { onBeforeConsentRevocationReload },
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
		reloadOnConsentRevoked: options.reloadOnConsentRevoked,
		scripts: [
			{ callbackOnly: true, category: 'measurement', id: 'tracker', onLoad },
		],
	});
	try {
		runtime.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(onLoad).toHaveBeenCalledOnce();
		permissions = { marketing: true, measurement: false };
		notify();
		permissions = { marketing: false, measurement: false };
		notify();
		expect(reload).not.toHaveBeenCalled();
		if (options.disposeBeforeReload) {
			runtime.dispose();
		}
		await vi.advanceTimersByTimeAsync(10);
	} finally {
		runtime.dispose();
		vi.restoreAllMocks();
		vi.useRealTimers();
	}
	return { onBeforeConsentRevocationReload, reload };
};

test('reloads once by default after the source withdraws a loaded script', async () => {
	const { onBeforeConsentRevocationReload, reload } =
		await withdrawExternally();
	expect(onBeforeConsentRevocationReload).toHaveBeenCalledOnce();
	expect(reload).toHaveBeenCalledOnce();
});

test('external withdrawal honours `reloadOnConsentRevoked: false`', async () => {
	const { onBeforeConsentRevocationReload, reload } = await withdrawExternally({
		reloadOnConsentRevoked: false,
	});
	expect(onBeforeConsentRevocationReload).not.toHaveBeenCalled();
	expect(reload).not.toHaveBeenCalled();
});

test('disposing the runtime cancels a pending external reload', async () => {
	const { reload } = await withdrawExternally({ disposeBeforeReload: true });
	expect(reload).not.toHaveBeenCalled();
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
	await runtime.kernel.commands.identify({ externalId: 'external-user' });
	expect(init).not.toHaveBeenCalled();
	expect(identify).not.toHaveBeenCalled();
	runtime.dispose();
	runtime.kernel.set.activeUI('dialog');
	expect(openPreferences).toHaveBeenCalledTimes(3);
});

test('disabled runtimes ignore external denials and load optional scripts', async () => {
	const source = {
		getPermissions: vi.fn(() => ({})),
		openPreferences: vi.fn(),
		subscribe: vi.fn(() => () => {}),
	};
	const loaded = vi.fn();
	const runtime = createConsentRuntime({
		consentSource: source,
		enabled: false,
		iframeBlocker: false,
		mode: custom(createOfflineTransport()),
		scripts: [
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'disabled-tracker',
				onLoad: loaded,
			},
		],
	});
	try {
		expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
		runtime.start();
		await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
		expect(source.subscribe).not.toHaveBeenCalled();
	} finally {
		runtime.dispose();
	}
});

test('external authority disables seeded and subsequently applied IAB grants', () => {
	const resolution = matchedResolution(optInRule({ model: 'iab' }));
	const authority = {
		choiceFingerprint: resolution.fingerprints.choice,
		confirmedAt: NOW,
		expiresAt: NOW + 1000,
		purposeConsents: { '1': true },
		purposeLegitimateInterests: {},
		specialFeatureOptIns: {},
		tcString: 'stored-tc-string',
		vendorConsents: { '7': true },
		vendorLegitimateInterests: {},
	};
	const kernel = createConsentKernel({
		initialExternalPermissions: {},
		initialIab: { authority, enabled: true },
		initialPolicyResolution: resolution,
		now: NOW,
	});
	try {
		expect(
			evaluateConsent(
				{ category: 'measurement', iabPurposes: [1], vendorId: 7 },
				kernel.getSnapshot(),
				NOW
			)
		).toBe(false);
		kernel.set.iab({ authority, enabled: true });
		expect(
			evaluateConsent(
				{ category: 'measurement', iabPurposes: [1], vendorId: 7 },
				kernel.getSnapshot(),
				NOW
			)
		).toBe(false);
		expect(kernel.getSnapshot().iab).toMatchObject({
			authority: null,
			enabled: false,
		});
	} finally {
		kernel.dispose();
	}
});
