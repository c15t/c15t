import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, test, vi } from 'vitest';

import { useHeadlessConsentUI } from '../component-hooks/use-headless-consent-ui';
import { useConsentManager } from '../component-hooks/use-manager';
import { ConsentDialog } from '../components/panel';
import { KernelContext } from '../context';
import { ConsentProvider } from '../provider';

const STORAGE_KEY = 'c15t';
const nextFrame = () =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve(undefined));
	});

afterEach(() => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
});

const mountDialog = async function mountDialog(
	save: () => Promise<{ ok: boolean }>
) {
	const onError = vi.fn();
	const onBeforeLoad = vi.fn();
	let kernel!: ConsentKernel;
	const Capture = () => {
		const current = useContext(KernelContext);
		if (!current) {
			throw new Error('Missing kernel');
		}
		useEffect(() => {
			kernel = current;
			current.set.activeUI('dialog');
		}, [current]);
		return null;
	};
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				callbacks: { onError },
				enabled: true,
				mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
				prefetch: {
					initialPolicyResolution: resolvePolicyRules({
						countryCode: null,
						regionCode: null,
						rules: [
							{
								categories: ['marketing', 'measurement'],
								id: 'react-pending',
								match: { isDefault: true },
								model: 'opt-in',
								prompt: 'choice',
								scopeMode: 'permissive',
							},
						],
					}),
				},
				scripts: [
					{
						callbackOnly: true,
						category: 'marketing',
						id: 'optimistic-marketing',
						onBeforeLoad,
					},
				],
			}}
		>
			<Capture />
			<ConsentDialog disableAnimation />
		</ConsentProvider>
	);
	const dialog = () =>
		document.querySelector('[data-testid="consent-dialog-root"]');
	await vi.waitFor(() => expect(dialog()).not.toBeNull());
	expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
	return {
		dialog,
		dispose() {
			view.unmount();
			container.remove();
		},
		kernel,
		onBeforeLoad,
		onError,
	};
};

const buttons = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	save: 'consent-widget-footer-save-button',
} as const;

for (const action of ['accept', 'reject', 'save'] as const) {
	for (const outcome of ['pending', 'rejected'] as const) {
		test(`dialog ${action} closes before a ${outcome} save settles`, async () => {
			const never = Promise.withResolvers<{ ok: boolean }>().promise;
			let storedAtSave: string | null = null;
			const save = vi.fn(() => {
				storedAtSave = localStorage.getItem(STORAGE_KEY);
				return outcome === 'pending'
					? never
					: Promise.reject(new Error('offline'));
			});
			const fixture = await mountDialog(save);
			try {
				document
					.querySelector<HTMLButtonElement>(
						`[data-testid="${buttons[action]}"]`
					)
					?.click();
				// Closed in the click task, before the transport is even called.
				expect(save).not.toHaveBeenCalled();
				expect(fixture.kernel.getSnapshot().activeUI).toBe('none');
				expect(
					fixture.kernel.getSnapshot().explicitChoice?.categories.marketing
						?.value
				).toBe(action === 'accept');
				// Enforcement follows the local choice without waiting on the backend.
				expect(fixture.onBeforeLoad).toHaveBeenCalledTimes(
					action === 'accept' ? 1 : 0
				);
				await nextFrame();
				expect(fixture.dialog()).toBeNull();
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
				// Storage is written before the request starts, not after it.
				expect(storedAtSave).toContain('marketing');
				// A failed request reaches the error event once; a pending one never.
				await vi.waitFor(() =>
					expect(fixture.onError).toHaveBeenCalledTimes(
						outcome === 'rejected' ? 1 : 0
					)
				);
				await new Promise((resolve) => {
					setTimeout(resolve, 20);
				});
				expect(fixture.kernel.getSnapshot().activeUI).toBe('none');
				expect(fixture.dialog()).toBeNull();
				expect(
					fixture.kernel.getSnapshot().explicitChoice?.categories.marketing
						?.value
				).toBe(action === 'accept');
			} finally {
				fixture.dispose();
			}
		});
	}
}

test('a returning visitor’s dialog closes before its save settles', async () => {
	const replies: ((result: { ok: boolean }) => void)[] = [];
	const save = vi.fn(
		() =>
			new Promise<{ ok: boolean }>((resolve) => {
				replies.push(resolve);
			})
	);
	const fixture = await mountDialog(save);
	try {
		fixture.kernel.commands.save('none');
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		replies[0]?.({ ok: true });
		expect(fixture.kernel.getSnapshot().promptRequirement.kind).toBe('none');
		fixture.kernel.set.activeUI('dialog');
		await vi.waitFor(() => expect(fixture.dialog()).not.toBeNull());
		document
			.querySelector<HTMLButtonElement>(`[data-testid="${buttons.accept}"]`)
			?.click();
		expect(fixture.kernel.getSnapshot().activeUI).toBe('none');
		expect(fixture.onBeforeLoad).toHaveBeenCalledOnce();
		await nextFrame();
		expect(fixture.dialog()).toBeNull();
		await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
		replies[1]?.({ ok: false });
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(fixture.kernel.getSnapshot().activeUI).toBe('none');
	} finally {
		fixture.dispose();
	}
});

const mountActions = async function mountActions() {
	const replies: ReturnType<typeof Promise.withResolvers<{ ok: boolean }>>[] =
		[];
	const save = vi.fn(() => {
		const reply = Promise.withResolvers<{ ok: boolean }>();
		replies.push(reply);
		return reply.promise;
	});
	const controls = {} as {
		kernel: ConsentKernel;
		manager: ReturnType<typeof useConsentManager>;
		headless: ReturnType<typeof useHeadlessConsentUI>;
	};
	const Capture = () => {
		const kernel = useContext(KernelContext);
		const manager = useConsentManager();
		const headless = useHeadlessConsentUI();
		useEffect(() => {
			if (!kernel) {
				throw new Error('Missing kernel');
			}
			controls.kernel = kernel;
			controls.manager = manager;
			controls.headless = headless;
		}, [kernel, manager, headless]);
		return null;
	};
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
				persistence: false,
				prefetch: {
					initialPolicyResolution: resolvePolicyRules({
						countryCode: null,
						regionCode: null,
						rules: [
							{
								categories: ['marketing', 'measurement'],
								id: 'pending-actions',
								match: { isDefault: true },
								model: 'opt-in',
								prompt: 'choice',
								scopeMode: 'permissive',
							},
						],
					}),
				},
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	await vi.waitFor(() =>
		expect(controls.kernel?.getSnapshot().resolution.status).toBe('matched')
	);
	controls.manager.setActiveUI('dialog');
	await vi.waitFor(() => expect(controls.manager.activeUI).toBe('dialog'));
	return {
		controls,
		dispose() {
			for (const reply of replies) {
				reply.resolve({ ok: false });
			}
			view.unmount();
			container.remove();
		},
		replies,
		save,
	};
};

test('manager saves its local custom selection without a draft provider', async () => {
	const fixture = await mountActions();
	try {
		fixture.controls.manager.setSelectedConsent('marketing', true);
		await vi.waitFor(() =>
			expect(fixture.controls.manager.selectedConsents.marketing).toBe(true)
		);
		const pending = fixture.controls.manager.saveConsents('custom');
		await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
		expect(
			fixture.controls.kernel.getSnapshot().explicitChoice?.categories.marketing
				?.value
		).toBe(true);
		fixture.replies[0]?.resolve({ ok: true });
		await pending;
		expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
	} finally {
		fixture.dispose();
	}
});

for (const selection of ['all', 'custom'] as const) {
	test(`a pending ${selection} save closes and keeps later draft edits`, async () => {
		const fixture = await mountActions();
		try {
			fixture.controls.manager.setSelectedConsent('marketing', true);
			await vi.waitFor(() =>
				expect(fixture.controls.manager.selectedConsents.marketing).toBe(true)
			);
			const pending = fixture.controls.manager.saveConsents(selection);
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
			await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
			fixture.controls.manager.setSelectedConsent('marketing', false);
			await vi.waitFor(() =>
				expect(fixture.controls.manager.selectedConsents.marketing).toBe(false)
			);
			fixture.replies[0]?.resolve({ ok: true });
			await pending;
			expect(fixture.controls.manager.selectedConsents.marketing).toBe(false);
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
		} finally {
			fixture.dispose();
		}
	});
}

for (const navigation of ['close', 'reopen'] as const) {
	for (const ok of [true, false]) {
		test(`a ${ok ? 'successful' : 'failed'} save leaves later ${navigation} navigation alone`, async () => {
			const fixture = await mountActions();
			try {
				const pending = fixture.controls.headless.performAction('accept');
				expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
				await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
				if (navigation === 'reopen') {
					fixture.controls.manager.setActiveUI('dialog');
				}
				fixture.replies[0]?.resolve({ ok });
				await pending;
				expect(fixture.controls.kernel.getSnapshot().activeUI).toBe(
					navigation === 'close' ? 'none' : 'dialog'
				);
			} finally {
				fixture.dispose();
			}
		});
	}
}

test('older save outcomes cannot close a dialog reopened after them', async () => {
	const fixture = await mountActions();
	try {
		const older = fixture.controls.manager.saveConsents('all');
		expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
		await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
		fixture.controls.manager.setActiveUI('dialog');
		const newer = fixture.controls.headless.performAction('reject');
		expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
		await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(2));
		fixture.controls.manager.setActiveUI('dialog');
		fixture.replies[0]?.resolve({ ok: true });
		await older;
		expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('dialog');
		fixture.replies[1]?.resolve({ ok: false });
		await newer;
		expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('dialog');
	} finally {
		fixture.dispose();
	}
});
