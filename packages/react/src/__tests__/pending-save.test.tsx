import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useHeadlessConsentUI } from '../component-hooks/use-headless-consent-ui';
import { ConsentDialog } from '../components/panel';
import { KernelContext } from '../context';
import { ConsentDraftProvider, useConsentDraft } from '../draft';
import { ConsentProvider } from '../provider';

const STORAGE_KEY = 'c15t';
const nextFrame = () =>
	new Promise((resolve) => {
		requestAnimationFrame(() => resolve(undefined));
	});

// Browser-mode test files that share a worker run in the same browser
// context, so localStorage and cookies from an earlier file are still there
// when this one starts. A stored choice would make the first visitor here a
// returning one, so clear before each test as well as after.
const clearStoredConsent = function clearStoredConsent() {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

beforeEach(clearStoredConsent);
afterEach(clearStoredConsent);

const mountDialog = async function mountDialog(
	save: () => Promise<{ ok: boolean }>
) {
	const onError = vi.fn();
	const onBeforeLoad = vi.fn();
	const onLoaderReady = vi.fn();
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
					{
						alwaysLoad: true,
						callbackOnly: true,
						category: 'necessary',
						id: 'loader-ready',
						onBeforeLoad: onLoaderReady,
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
	const dispose = () => {
		view.unmount();
		container.remove();
	};
	try {
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		// The provider attaches the script loader after a dynamic import, which
		// can finish after the dialog renders on a loaded machine. Wait for it,
		// so the click below measures enforcement rather than chunk loading.
		await vi.waitFor(() => expect(onLoaderReady).toHaveBeenCalledOnce());
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
	} catch (error) {
		// A dialog left mounted here would satisfy the next test's wait
		// before that test's own kernel exists.
		dispose();
		throw error;
	}
	return {
		dialog,
		dispose,
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
		draft: ReturnType<typeof useConsentDraft>;
		headless: ReturnType<typeof useHeadlessConsentUI>;
	};
	const Capture = () => {
		const kernel = useContext(KernelContext);
		const draft = useConsentDraft();
		const headless = useHeadlessConsentUI();
		useEffect(() => {
			if (!kernel) {
				throw new Error('Missing kernel');
			}
			controls.kernel = kernel;
			controls.draft = draft;
			controls.headless = headless;
		}, [kernel, draft, headless]);
		return null;
	};
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				consentCategories: ['marketing', 'measurement'],
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
			<ConsentDraftProvider>
				<Capture />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
	await vi.waitFor(() =>
		expect(controls.kernel?.getSnapshot().resolution.status).toBe('matched')
	);
	controls.headless.openDialog();
	await vi.waitFor(() => expect(controls.headless.activeUI).toBe('dialog'));
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

test('a custom save commits the selection staged on the shared draft', async () => {
	const fixture = await mountActions();
	try {
		fixture.controls.draft.set('marketing', true);
		await vi.waitFor(() =>
			expect(fixture.controls.draft.values.marketing).toBe(true)
		);
		const pending = fixture.controls.headless.saveCustomPreferences();
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
			fixture.controls.draft.set('marketing', true);
			await vi.waitFor(() =>
				expect(fixture.controls.draft.values.marketing).toBe(true)
			);
			const pending = fixture.controls.headless.saveCustomPreferences(
				selection === 'all' ? 'all' : undefined
			);
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
			await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
			fixture.controls.draft.set('marketing', false);
			await vi.waitFor(() =>
				expect(fixture.controls.draft.values.marketing).toBe(false)
			);
			fixture.replies[0]?.resolve({ ok: true });
			await pending;
			expect(fixture.controls.draft.values.marketing).toBe(false);
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('none');
		} finally {
			fixture.dispose();
		}
	});
}
