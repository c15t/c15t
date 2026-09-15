import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { Frame } from '../components/frame';
import { ConsentDialog } from '../components/panel';
import { KernelContext } from '../context';
import { ConsentProvider } from '../provider';

for (const source of ['scripts', 'frames', 'iframes'] as const) {
	test.each([undefined, ['necessary'] as const])(
		`${source} add Analytics and Marketing to the dialog with configured categories %j`,
		async (consentCategories) => {
			const resolution = resolvePolicyRules({
				countryCode: 'DE',
				regionCode: null,
				rules: [
					{
						categories: ['necessary'],
						id: 'europe_opt_in',
						match: { countries: ['DE'] },
						model: 'opt-in',
						prompt: 'choice',
						scopeMode: 'permissive',
					},
				],
			});
			let kernel!: ConsentKernel;
			const Capture = () => {
				const current = useContext(KernelContext);
				useEffect(() => {
					if (!current) {
						throw new Error('Missing kernel');
					}
					kernel = current;
					kernel.set.activeUI('dialog');
				}, [current]);
				return null;
			};
			const container = document.createElement('div');
			document.body.append(container);
			const root = createRoot(container);
			const save = vi.fn(() => Promise.resolve({ ok: true }));
			root.render(
				<ConsentProvider
					options={{
						consentCategories: consentCategories
							? [...consentCategories]
							: undefined,
						mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
						persistence: false,
						prefetch: { initialPolicyResolution: resolution },
						scripts:
							source === 'scripts'
								? [
										{
											callbackOnly: true,
											category: 'measurement',
											id: 'analytics',
										},
										{ callbackOnly: true, category: 'marketing', id: 'ads' },
									]
								: undefined,
					}}
				>
					<Capture />
					{source === 'frames' && (
						<>
							<Frame
								category="measurement"
								placeholder="Analytics blocked"
							>
								<span>Analytics content</span>
							</Frame>
							<Frame
								category="marketing"
								placeholder="Marketing blocked"
							>
								<span>Marketing content</span>
							</Frame>
						</>
					)}
					{source === 'iframes' && (
						<>
							<iframe
								sandbox=""
								title="Analytics"
								data-category="measurement"
							/>
							<iframe
								sandbox=""
								title="Marketing"
								data-category="marketing"
							/>
						</>
					)}
					<ConsentDialog disableAnimation />
				</ConsentProvider>
			);
			try {
				await vi.waitFor(() =>
					expect(kernel?.getSnapshot().evaluationPolicy.choiceScope).toEqual([
						'marketing',
						'measurement',
					])
				);
				await vi.waitFor(() =>
					expect(
						document.querySelector(
							'[data-testid="consent-widget-switch-marketing"]'
						)
					).not.toBeNull()
				);
				expect(
					document.querySelector(
						'[data-testid="consent-widget-switch-measurement"]'
					)
				).not.toBeNull();
				expect(
					document.querySelector(
						'[data-testid="consent-widget-switch-functionality"]'
					)
				).toBeNull();
				expect(
					document.querySelector(
						'[data-testid="consent-widget-switch-experience"]'
					)
				).toBeNull();
				const button = document.querySelector<HTMLButtonElement>(
					'[data-testid="consent-widget-footer-accept-all-button"]'
				);
				expect(button).not.toBeNull();
				button?.click();
				await vi.waitFor(() =>
					expect(kernel.getSnapshot().activeUI).toBe('none')
				);
				expect(save).toHaveBeenCalledOnce();
				expect(
					kernel.getSnapshot().explicitChoice?.categories.marketing?.value
				).toBe(true);
				expect(
					kernel.getSnapshot().explicitChoice?.categories.measurement?.value
				).toBe(true);
				expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
			} finally {
				root.unmount();
				container.remove();
			}
		}
	);
}
