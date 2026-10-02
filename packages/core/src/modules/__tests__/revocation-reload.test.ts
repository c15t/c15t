/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
	optOutRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import type { KernelConfig, KernelVendorsState, SaveResult } from '../../types';
import { watchRevocationReload } from '../revocation-reload';

const vendors: KernelVendorsState = {
	declared: [
		{
			category: 'marketing',
			id: 'meta-pixel',
			name: 'Meta Pixel',
			presentable: true,
			source: 'config',
		},
	],
	listVersion: null,
};

const kernels: { dispose: () => void }[] = [];

const createKernel = (config: Partial<KernelConfig> = {}) => {
	const kernel = createConsentKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		),
		now: NOW,
		...config,
	});
	kernels.push(kernel);
	return kernel;
};

const watch = (
	kernel: ReturnType<typeof createKernel>,
	options: { enabled?: boolean } = {}
) => {
	const reload = vi.fn();
	const onBeforeReload = vi.fn();
	const dispose = watchRevocationReload({
		getOnBeforeReload: () => onBeforeReload,
		isEnabled: () => options.enabled !== false,
		kernel,
		reload,
	});
	return { dispose, onBeforeReload, reload };
};

const grantMarketing = async (kernel: ReturnType<typeof createKernel>) => {
	const saving = kernel.commands.save({ marketing: true });
	await vi.advanceTimersByTimeAsync(10);
	await saving;
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	for (const kernel of kernels.splice(0)) {
		kernel.dispose();
	}
	vi.useRealTimers();
});

describe('watchRevocationReload', () => {
	it('reloads after an exemption-only objection without recording consent', async () => {
		const kernel = createKernel({
			initialPolicyResolution: matchedResolution(
				optInRule({
					categories: ['measurement'],
					exemptions: {
						measurement: { kind: 'uk-statistics', revision: 'review-1' },
					},
					match: { countries: ['GB'] },
				})
			),
		});
		const { reload } = watch(kernel);
		const choice = kernel.getSnapshot().explicitChoice;
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(true);

		await kernel.commands.save({ measurement: false });
		await vi.runAllTimersAsync();

		expect(kernel.getSnapshot().explicitChoice).toBe(choice);
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(reload).toHaveBeenCalledOnce();
	});

	it('reloads after a save turns off a granted category', async () => {
		const kernel = createKernel();
		const { onBeforeReload, reload } = watch(kernel);
		await grantMarketing(kernel);
		expect(reload).not.toHaveBeenCalled();

		await kernel.commands.save({ marketing: false });
		expect(reload).not.toHaveBeenCalled();
		await vi.runAllTimersAsync();

		expect(onBeforeReload).toHaveBeenCalledOnce();
		expect(onBeforeReload.mock.calls[0]?.[0].preferences.marketing).toBe(false);
		expect(reload).toHaveBeenCalledOnce();
		expect(onBeforeReload.mock.invocationCallOrder[0]).toBeLessThan(
			reload.mock.invocationCallOrder[0] ?? 0
		);
	});

	it('does not reload when nothing granted was turned off', async () => {
		const kernel = createKernel();
		const { reload } = watch(kernel);

		// First visit under opt-in: rejecting revokes nothing that ran.
		await kernel.commands.save({ marketing: false });
		await kernel.commands.save({ marketing: true });
		await kernel.commands.save({ measurement: true });
		await vi.runAllTimersAsync();

		expect(reload).not.toHaveBeenCalled();
	});

	it('reloads when an opt-out visitor rejects defaults that already ran', async () => {
		const kernel = createKernel({
			initialPolicyResolution: matchedResolution(
				optOutRule({ categories: ['marketing'] })
			),
		});
		expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(true);
		const { reload } = watch(kernel);

		await kernel.commands.save({ marketing: false });
		await vi.runAllTimersAsync();

		expect(reload).toHaveBeenCalledOnce();
	});

	it('reloads when a granted vendor is turned off', async () => {
		const kernel = createKernel({ initialVendors: vendors });
		const { reload } = watch(kernel);
		await grantMarketing(kernel);

		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();

		expect(reload).toHaveBeenCalledOnce();
	});

	it('does not reload for a vendor whose category is already denied', async () => {
		const kernel = createKernel({ initialVendors: vendors });
		const { reload } = watch(kernel);

		await kernel.commands.save({}, { vendors: { 'meta-pixel': false } });
		await vi.runAllTimersAsync();

		expect(reload).not.toHaveBeenCalled();
	});

	it('does not reload when disabled', async () => {
		const kernel = createKernel();
		const { onBeforeReload, reload } = watch(kernel, { enabled: false });
		await grantMarketing(kernel);

		await kernel.commands.save({ marketing: false });
		await vi.runAllTimersAsync();

		expect(onBeforeReload).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});

	it('waits for the save request before reloading', async () => {
		let finishSave: (result: SaveResult) => void = () => undefined;
		let saves = 0;
		const kernel = createKernel({
			transport: {
				save: () => {
					saves += 1;
					if (saves === 1) {
						return Promise.resolve({ ok: true });
					}
					return new Promise<SaveResult>((resolve) => {
						finishSave = resolve;
					});
				},
			},
		});
		const { reload } = watch(kernel);
		await grantMarketing(kernel);

		const saving = kernel.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(1000);
		expect(reload).not.toHaveBeenCalled();

		finishSave({ ok: true });
		await saving;
		await vi.advanceTimersByTimeAsync(0);
		expect(reload).toHaveBeenCalledOnce();
	});

	it('cancels a pending reload on dispose', async () => {
		const kernel = createKernel();
		const { dispose, reload } = watch(kernel);
		await grantMarketing(kernel);

		await kernel.commands.save({ marketing: false });
		dispose();
		await vi.runAllTimersAsync();

		expect(reload).not.toHaveBeenCalled();
	});
});

describe('watchRevocationReload with an external consent source', () => {
	const createExternalKernel = () =>
		createKernel({ initialExternalPermissions: {} });

	it('reloads once after the source withdraws a granted category', async () => {
		const kernel = createExternalKernel();
		const { onBeforeReload, reload } = watch(kernel);
		kernel.set.externalPermissions({ marketing: true, measurement: true });

		kernel.set.externalPermissions({ measurement: true });
		kernel.set.externalPermissions({});
		expect(reload).not.toHaveBeenCalled();
		await vi.runAllTimersAsync();

		expect(onBeforeReload).toHaveBeenCalledOnce();
		expect(onBeforeReload.mock.calls[0]?.[0].preferences).toMatchObject({
			marketing: false,
			measurement: false,
		});
		expect(reload).toHaveBeenCalledOnce();
	});

	it('does not reload when the source only grants', async () => {
		const kernel = createExternalKernel();
		const { reload } = watch(kernel);

		kernel.set.externalPermissions({ marketing: true });
		kernel.set.externalPermissions({ marketing: true, measurement: true });
		await vi.runAllTimersAsync();

		expect(reload).not.toHaveBeenCalled();
	});

	it('does not reload when disabled', async () => {
		const kernel = createExternalKernel();
		const { onBeforeReload, reload } = watch(kernel, { enabled: false });
		kernel.set.externalPermissions({ marketing: true });

		kernel.set.externalPermissions({});
		await vi.runAllTimersAsync();

		expect(onBeforeReload).not.toHaveBeenCalled();
		expect(reload).not.toHaveBeenCalled();
	});

	it('cancels a pending reload on dispose', async () => {
		const kernel = createExternalKernel();
		const { dispose, reload } = watch(kernel);
		kernel.set.externalPermissions({ marketing: true });

		kernel.set.externalPermissions({});
		dispose();
		await vi.runAllTimersAsync();

		expect(reload).not.toHaveBeenCalled();
	});
});
