import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { test, expect, vi } from 'vitest';

import { ConsentDialog } from '../components/consent-dialog';
import { KernelContext } from '../context';
import { ConsentProvider } from '../provider';

for (const scenario of ['notice', 'scoped'] as const) {
	for (const action of ['accept', 'reject', 'save'] as const) {
		test(`${scenario} actual React ${action} saves displayed scope and returns required banner`, async () => {
			const pending = Promise.withResolvers<{ ok: boolean }>();
			const save = vi.fn(() => pending.promise);
			const resolution = resolvePolicyRules({
				countryCode: null,
				regionCode: null,
				rules: [
					{
						categories: ['marketing', 'measurement'],
						id: scenario,
						match: { isDefault: true },
						model: scenario === 'notice' ? 'opt-out' : 'opt-in',
						prompt: scenario === 'notice' ? 'notice' : 'choice',
					},
				],
			});
			let kernel!: ConsentKernel;
			const Capture = () => {
				const current = useContext(KernelContext);
				if (!current) {
					throw new Error('kernel absent');
				}
				useEffect(() => {
					kernel = current;
					kernel.set.activeUI('dialog');
				}, [current]);
				return null;
			};
			const container = document.createElement('div');
			document.body.append(container);
			const root = createRoot(container);
			root.render(
				<ConsentProvider
					options={{
						consentCategories:
							scenario === 'scoped' ? ['measurement'] : undefined,
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
				expect(kernel.getSnapshot().policyRule.id).toBe(scenario);
				if (scenario === 'scoped') {
					expect(
						document.querySelector(
							'[data-testid="consent-widget-switch-marketing"]'
						)
					).toBeNull();
					expect(
						document.querySelector(
							'[data-testid="consent-widget-switch-measurement"]'
						)
					).not.toBeNull();
				}
				const id = {
					accept: 'consent-widget-footer-accept-all-button',
					reject: 'consent-widget-reject-button',
					save: 'consent-widget-footer-save-button',
				}[action];
				const button = document.querySelector<HTMLButtonElement>(
					`[data-testid="${id}"]`
				);
				expect(button).not.toBeNull();
				button?.click();
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
				if (scenario === 'scoped') {
					expect(
						kernel.getSnapshot().explicitChoice?.categories.marketing
					).toBeUndefined();
					expect(
						kernel.getSnapshot().explicitChoice?.categories.measurement?.value
					).toBe(action === 'accept');
				}
				pending.resolve({ ok: true });
				await vi.waitFor(() =>
					expect(kernel.getSnapshot().activeUI).toBe('banner')
				);
				expect(kernel.getSnapshot().promptRequirement.kind).toBe(
					scenario === 'notice' ? 'notice' : 'choice'
				);
				expect(
					document.querySelector('[data-testid="consent-dialog-root"]')
				).toBeNull();
			} finally {
				pending.resolve({ ok: false });
				root.unmount();
				container.remove();
			}
		});
	}
}
