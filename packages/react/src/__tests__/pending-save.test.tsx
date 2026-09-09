import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { useConsentManager } from '../component-hooks/use-consent-manager';
import { useHeadlessConsentUI } from '../component-hooks/use-headless-consent-ui';
import { ConsentDialog } from '../components/consent-dialog';
import { KernelContext } from '../context';
import { ConsentProvider } from '../provider';

for (const action of ['accept', 'reject', 'save'] as const) {
	test(`actual React dialog preserves ${action} pending and failure`, async () => {
		const pending = Promise.withResolvers<{ ok: boolean }>();
		const retry = Promise.withResolvers<{ ok: boolean }>();
		const save = vi
			.fn()
			.mockImplementationOnce(() => pending.promise)
			.mockImplementationOnce(() => retry.promise);
		const resolution = resolvePolicyRules({
			countryCode: null,
			regionCode: null,
			rules: [
				{
					categories: ['marketing', 'measurement'],
					id: 'react-pending',
					match: { isDefault: true },
					model: 'opt-in',
					prompt: 'choice',
				},
			],
		});
		expect(resolution.status).toBe('matched');
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
					enabled: true,
					mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
					persistence: false,
					prefetch: { initialPolicyResolution: resolution },
				}}
			>
				<Capture />
				<ConsentDialog disableAnimation />
			</ConsentProvider>
		);
		try {
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-testid="consent-dialog-root"]')
				).not.toBeNull()
			);
			expect(kernel.getSnapshot().resolution.status).toBe('matched');
			expect(kernel.getSnapshot().policyRule.id).toBe('react-pending');
			expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
			const id = {
				accept: 'consent-widget-footer-accept-all-button',
				reject: 'consent-widget-reject-button',
				save: 'consent-widget-footer-save-button',
			}[action];
			const button = document.querySelector<HTMLButtonElement>(
				`[data-testid="${id}"]`
			);
			expect(button).not.toBeNull();
			const completed = vi.fn();
			kernel.events.on('command:save:completed', completed);
			button?.click();
			await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
			expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
			expect.soft(kernel.getSnapshot().activeUI).toBe('dialog');
			expect
				.soft(document.querySelector('[data-testid="consent-dialog-root"]'))
				.not.toBeNull();
			pending.resolve({ ok: false });
			await vi.waitFor(() => expect(completed).toHaveBeenCalledOnce());
			expect(completed.mock.calls[0]?.[0].result.ok).toBe(false);
			expect.soft(kernel.getSnapshot().activeUI).toBe('dialog');
			expect
				.soft(document.querySelector('[data-testid="consent-dialog-root"]'))
				.not.toBeNull();
			kernel.set.activeUI('dialog');
			await vi.waitFor(() =>
				expect(
					document.querySelector('[data-testid="consent-dialog-root"]')
				).not.toBeNull()
			);
			document
				.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)
				?.click();
			await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
			expect.soft(kernel.getSnapshot().activeUI).toBe('dialog');
			retry.resolve({ ok: true });
			await vi.waitFor(() => expect(completed).toHaveBeenCalledTimes(2));
			expect(completed.mock.calls[1]?.[0].result.ok).toBe(true);
			await vi.waitFor(() =>
				expect(kernel.getSnapshot().activeUI).toBe('none')
			);
			expect(
				document.querySelector('[data-testid="consent-dialog-root"]')
			).toBeNull();
		} finally {
			pending.resolve({ ok: false });
			retry.resolve({ ok: false });
			view.unmount();
			container.remove();
		}
	});
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
	test(`a pending ${selection} save preserves later draft edits and keeps them open`, async () => {
		const fixture = await mountActions();
		try {
			fixture.controls.manager.setSelectedConsent('marketing', true);
			await vi.waitFor(() =>
				expect(fixture.controls.manager.selectedConsents.marketing).toBe(true)
			);
			const pending = fixture.controls.manager.saveConsents(selection);
			await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
			fixture.controls.manager.setSelectedConsent('marketing', false);
			await vi.waitFor(() =>
				expect(fixture.controls.manager.selectedConsents.marketing).toBe(false)
			);
			fixture.replies[0]?.resolve({ ok: true });
			await pending;
			expect(fixture.controls.manager.selectedConsents.marketing).toBe(false);
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe('dialog');
		} finally {
			fixture.dispose();
		}
	});
}

for (const navigation of ['close', 'reopen', 'same-dialog'] as const) {
	test(`successful completion respects explicit ${navigation} navigation`, async () => {
		const fixture = await mountActions();
		try {
			const pending = fixture.controls.headless.performAction('accept');
			await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
			if (navigation !== 'same-dialog') {
				fixture.controls.manager.setActiveUI('none');
			}
			if (navigation !== 'close') {
				fixture.controls.manager.setActiveUI('dialog');
			}
			fixture.replies[0]?.resolve({ ok: true });
			await pending;
			expect(fixture.controls.kernel.getSnapshot().activeUI).toBe(
				navigation === 'close' ? 'none' : 'dialog'
			);
		} finally {
			fixture.dispose();
		}
	});
}

test('older save completion cannot close a newer action from another hook', async () => {
	const fixture = await mountActions();
	try {
		const older = fixture.controls.manager.saveConsents('all');
		await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledOnce());
		const newer = fixture.controls.headless.performAction('reject');
		await vi.waitFor(() => expect(fixture.save).toHaveBeenCalledTimes(2));
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
