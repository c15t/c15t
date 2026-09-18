/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents } from './e2e-test-utils';
import { cloudflareZaraz } from './vendors/tag-managers/cloudflare-zaraz';
import type { ZarazConsentApi } from './vendors/tag-managers/cloudflare-zaraz';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const installZaraz = (
	initial: Record<string, boolean> = { ads: false, analytics: false },
	ready = true
) => {
	let permissions = { ...initial };
	const order: string[] = [];
	const api: ZarazConsentApi = {
		APIReady: ready,
		getAll: () => ({ ...permissions }),
		modal: true,
		sendQueuedEvents: vi.fn(() => {
			order.push('flush');
		}),
		set: vi.fn((next: Record<string, boolean>) => {
			order.push('set');
			permissions = { ...permissions, ...next };
		}),
	};
	vi.stubGlobal('zaraz', { consent: api });
	return { api, order };
};

const mount = (
	script: Script = cloudflareZaraz({
		purposes: { marketing: ['ads'], measurement: ['analytics'] },
	})
) => {
	const kernel = createConsentKernel();
	void kernel.commands.save(deniedConsents);
	const loader = createScriptLoader({ kernel, scripts: [script] });
	disposers.push(
		() => kernel.dispose(),
		() => loader.dispose()
	);
	return { kernel, loader };
};

describe('Zaraz consent bridge through the kernel and script loader', () => {
	it('revokes stale grants before onReady can emit an event, without inserting a loader', () => {
		const { api, order } = installZaraz({
			ads: true,
			analytics: true,
			unmapped: true,
		});
		const before = document.scripts.length;
		mount(
			cloudflareZaraz({
				onReady: () => {
					order.push('ready');
				},
				purposes: { marketing: ['ads'], measurement: ['analytics'] },
			})
		);
		expect(api.getAll()).toEqual({
			ads: false,
			analytics: false,
			unmapped: false,
		});
		expect(api.modal).toBe(false);
		expect(order).toEqual(['set', 'ready']);
		expect(document.scripts.length).toBe(before);
	});

	it.each(['getAll', 'set'] as const)(
		'reports a %s failure and retries with the latest consent',
		(method) => {
			const { api } = installZaraz({ analytics: true });
			const error = new Error('Zaraz unavailable');
			vi.spyOn(api, method).mockImplementationOnce(() => {
				throw error;
			});
			const onReady = vi.fn();
			const onError = vi.fn();
			const { kernel } = mount(
				cloudflareZaraz({
					onError,
					onReady,
					purposes: { measurement: ['analytics'] },
				})
			);
			expect(onError).toHaveBeenCalledWith(error);
			expect(onReady).not.toHaveBeenCalled();
			expect(api.sendQueuedEvents).not.toHaveBeenCalled();
			void kernel.commands.save({ ...deniedConsents, marketing: true });
			expect(api.getAll()).toEqual({ analytics: false });
			expect(onReady).toHaveBeenCalledOnce();
		}
	);

	it('reports readiness-event failures and retries when readiness is announced again', () => {
		const { api } = installZaraz({ analytics: true }, false);
		const error = new Error('Zaraz unavailable');
		const onError = vi.fn();
		const onReady = vi.fn();
		mount(
			cloudflareZaraz({
				onError,
				onReady,
				purposes: { measurement: ['analytics'] },
			})
		);
		vi.spyOn(api, 'set').mockImplementationOnce(() => {
			throw error;
		});
		api.APIReady = true;
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(onError).toHaveBeenCalledWith(error);
		expect(onReady).not.toHaveBeenCalled();
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(api.getAll()).toEqual({ analytics: false });
		expect(onReady).toHaveBeenCalledOnce();
	});

	it.each([false, true])(
		'recovers a failed queue replay, revoked before retry=%s',
		(revoke) => {
			const onError = vi.fn();
			const onReady = vi.fn();
			const { kernel } = mount(
				cloudflareZaraz({
					onError,
					onReady,
					purposes: { marketing: ['ads'], measurement: ['analytics'] },
				})
			);
			void kernel.commands.save({
				...deniedConsents,
				marketing: true,
				measurement: true,
			});
			// Advertising already had permission; only analytics creates replay work.
			const { api } = installZaraz({ ads: true, analytics: false });
			vi.spyOn(api, 'sendQueuedEvents').mockImplementationOnce(() => {
				throw new Error('Replay unavailable');
			});
			document.dispatchEvent(new Event('zarazConsentAPIReady'));
			expect(onError).toHaveBeenCalledOnce();
			expect(onReady).not.toHaveBeenCalled();
			expect(api.getAll()).toEqual({ ads: true, analytics: true });
			if (revoke) {
				void kernel.commands.save({ ...deniedConsents, marketing: true });
			}
			document.dispatchEvent(new Event('zarazConsentAPIReady'));
			expect(api.sendQueuedEvents).toHaveBeenCalledTimes(revoke ? 1 : 2);
			expect(onReady).toHaveBeenCalledOnce();
			document.dispatchEvent(new Event('zarazConsentAPIReady'));
			expect(api.sendQueuedEvents).toHaveBeenCalledTimes(revoke ? 1 : 2);
		}
	);

	it('preserves grants when the kernel already has the returning visitor choice', () => {
		const { api } = installZaraz({ analytics: true });
		const kernel = createConsentKernel();
		void kernel.commands.save({ ...deniedConsents, measurement: true });
		const onReady = vi.fn();
		const loader = createScriptLoader({
			kernel,
			scripts: [
				cloudflareZaraz({
					onReady,
					purposes: { measurement: ['analytics'] },
				}),
			],
		});
		disposers.push(kernel.dispose, loader.dispose);
		expect(api.getAll()).toEqual({ analytics: true });
		expect(api.set).not.toHaveBeenCalled();
		expect(api.sendQueuedEvents).not.toHaveBeenCalled();
		expect(onReady).toHaveBeenCalledOnce();
	});

	it('does not hide an absent Zaraz modal', () => {
		const { api } = installZaraz({ analytics: true });
		const hide = vi.fn(() => {
			throw new Error('Modal does not exist');
		});
		Object.defineProperty(api, 'modal', { get: () => false, set: hide });
		const onReady = vi.fn();
		mount(
			cloudflareZaraz({ onReady, purposes: { measurement: ['analytics'] } })
		);
		expect(hide).not.toHaveBeenCalled();
		expect(api.getAll()).toEqual({ analytics: false });
		expect(onReady).toHaveBeenCalledOnce();
	});

	it.each([undefined, 'visible'])(
		'synchronizes without a boolean modal property: %s',
		(modal) => {
			const { api } = installZaraz({ analytics: true });
			Object.defineProperty(api, 'modal', { value: modal, writable: true });
			const onReady = vi.fn();
			mount(
				cloudflareZaraz({ onReady, purposes: { measurement: ['analytics'] } })
			);
			expect(api.getAll()).toEqual({ analytics: false });
			expect(api.modal).toBe(modal);
			expect(onReady).toHaveBeenCalledOnce();
		}
	);

	it('grants categories independently, sets before flushing, and revokes without flushing', async () => {
		const { api, order } = installZaraz();
		const onReady = vi.fn();
		const { kernel } = mount(
			cloudflareZaraz({
				onReady,
				purposes: { marketing: ['ads'], measurement: ['analytics'] },
			})
		);
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		expect(api.getAll()).toEqual({ ads: false, analytics: true });
		expect(order).toEqual(['set', 'flush']);
		await kernel.commands.save({
			...deniedConsents,
			marketing: true,
			measurement: true,
		});
		expect(api.getAll()).toEqual({ ads: true, analytics: true });
		await kernel.commands.save(deniedConsents);
		expect(api.getAll()).toEqual({ ads: false, analytics: false });
		expect(order).toEqual(['set', 'flush', 'set', 'flush', 'set']);
		expect(onReady).toHaveBeenCalledOnce();
	});

	it('uses the latest permissions when the API arrives after several changes', async () => {
		const { kernel } = mount();
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		await kernel.commands.save({ ...deniedConsents, marketing: true });
		const { api } = installZaraz();
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(api.getAll()).toEqual({ ads: true, analytics: false });
		expect(api.set).toHaveBeenCalledOnce();
	});

	it('waits for APIReady and keeps a single readiness listener', async () => {
		const { api } = installZaraz(undefined, false);
		const add = vi.spyOn(document, 'addEventListener');
		const { kernel } = mount();
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(api.set).not.toHaveBeenCalled();
		expect(
			add.mock.calls.filter(([name]) => name === 'zarazConsentAPIReady')
		).toHaveLength(1);
		api.APIReady = true;
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(api.getAll().analytics).toBe(true);
		await kernel.commands.save(deniedConsents);
		expect(api.getAll().analytics).toBe(false);
		expect(
			add.mock.calls.filter(([name]) => name === 'zarazConsentAPIReady')
		).toHaveLength(1);
	});

	it.each(['dispose', 'remove', 'replace'] as const)(
		'does not apply obsolete permissions after %s',
		async (action) => {
			const { kernel, loader } = mount();
			await kernel.commands.save({ ...deniedConsents, measurement: true });
			if (action === 'dispose') {
				loader.dispose();
			}
			if (action === 'remove') {
				loader.updateScripts([]);
			}
			if (action === 'replace') {
				loader.updateScripts([
					cloudflareZaraz({ purposes: { marketing: ['analytics'] } }),
				]);
			}
			const { api } = installZaraz();
			document.dispatchEvent(new Event('zarazConsentAPIReady'));
			expect(api.getAll().analytics).toBe(false);
			expect(api.sendQueuedEvents).not.toHaveBeenCalled();
		}
	);

	it('does not rewrite identical permissions or flush a second time', async () => {
		const { api } = installZaraz();
		const script = cloudflareZaraz({
			purposes: { measurement: ['analytics'] },
		});
		const { kernel, loader } = mount(script);
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		loader.updateScripts([script]);
		loader.updateScripts([script]);
		expect(api.set).toHaveBeenCalledOnce();
		expect(api.sendQueuedEvents).toHaveBeenCalledOnce();
	});

	it('does not synchronize during removal when the vendor has just become ready', async () => {
		const { kernel, loader } = mount();
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		const { api } = installZaraz();
		loader.updateScripts([]);
		document.dispatchEvent(new Event('zarazConsentAPIReady'));
		expect(api.set).not.toHaveBeenCalled();
	});

	it('supports multiple purposes per category and optional modal/queue handling', async () => {
		const { api } = installZaraz({ analytics: false, reporting: false });
		const { kernel } = mount(
			cloudflareZaraz({
				hideBuiltInModal: false,
				purposes: { measurement: ['analytics', 'reporting'] },
				sendQueuedEvents: false,
			})
		);
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		expect(api.getAll()).toEqual({ analytics: true, reporting: true });
		expect(api.modal).toBe(true);
		expect(api.sendQueuedEvents).not.toHaveBeenCalled();
	});

	it('keeps unknown purpose IDs denied rather than creating grants for typos', async () => {
		const { api } = installZaraz({ analytics: true });
		const { kernel } = mount(
			cloudflareZaraz({ purposes: { measurement: ['typo'] } })
		);
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		expect(api.getAll()).toEqual({ analytics: false });
	});

	it('does not read browser globals during helper construction', () => {
		vi.stubGlobal('window', undefined);
		vi.stubGlobal('document', undefined);
		expect(
			cloudflareZaraz({ purposes: { measurement: ['analytics'] } }).callbackOnly
		).toBe(true);
	});

	it.each([
		{},
		{ measurement: [''] },
		{ measurement: [' analytics'] },
		{ marketing: ['same'], measurement: ['same'] },
	])('rejects an ambiguous or empty mapping: %j', (purposes) => {
		expect(() => cloudflareZaraz({ purposes })).toThrow();
	});
});
