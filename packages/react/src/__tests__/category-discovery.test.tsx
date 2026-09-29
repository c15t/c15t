import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import { ConsentGate } from '../components/consent-gate';
import { ConsentDialog } from '../components/panel';
import { ConsentBanner } from '../components/prompt';
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
							<ConsentGate
								category="measurement"
								placeholder="Analytics blocked"
							>
								<span>Analytics content</span>
							</ConsentGate>
							<ConsentGate
								category="marketing"
								placeholder="Marketing blocked"
							>
								<span>Marketing content</span>
							</ConsentGate>
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
				// The dialog closes on the local record; the request follows.
				expect(kernel.getSnapshot().activeUI).toBe('none');
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
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

test('a site that declares nothing shows only Strictly necessary, and any banner action dismisses it for good', async () => {
	localStorage.clear();
	const resolution = resolvePolicyRules({
		countryCode: 'DE',
		regionCode: null,
		rules: [
			{
				id: 'europe_opt_in',
				match: { countries: ['DE'] },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	});
	const save = vi.fn(() => Promise.resolve({ ok: true }));
	let kernel!: ConsentKernel;
	const Capture = () => {
		const current = useContext(KernelContext);
		useEffect(() => {
			if (current) {
				kernel = current;
			}
		}, [current]);
		return null;
	};
	const mount = () => {
		const container = document.createElement('div');
		document.body.append(container);
		const root = createRoot(container);
		root.render(
			<ConsentProvider
				options={{
					mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
					prefetch: { initialPolicyResolution: resolution },
				}}
			>
				<Capture />
				<ConsentBanner disableAnimation />
				<ConsentDialog disableAnimation />
			</ConsentProvider>
		);
		return () => {
			root.unmount();
			container.remove();
		};
	};
	const banner = () =>
		document.querySelector('[data-testid="consent-banner-root"]');
	let unmount = mount();
	try {
		await vi.waitFor(() => expect(banner()).not.toBeNull());
		kernel.set.activeUI('dialog');
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="consent-dialog-root"]')
			).not.toBeNull()
		);
		expect(
			document.querySelectorAll('[data-testid^="consent-widget-switch-"]')
		).toHaveLength(1);
		expect(
			document.querySelector('[data-testid="consent-widget-switch-necessary"]')
		).not.toBeNull();
		kernel.set.activeUI('banner');
		await vi.waitFor(() => expect(banner()).not.toBeNull());
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({
				confirmed: expect.objectContaining({ categories: {} }),
				consentAction: 'all',
			})
		);
		unmount();
		unmount = mount();
		await vi.waitFor(() =>
			expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' })
		);
		expect(banner()).toBeNull();
	} finally {
		unmount();
		localStorage.clear();
	}
});

test('a necessary-only dialog reopened after the acknowledgement closes on Save before the save settles', async () => {
	const resolution = resolvePolicyRules({
		countryCode: 'DE',
		regionCode: null,
		rules: [
			{
				id: 'europe_opt_in',
				match: { countries: ['DE'] },
				model: 'opt-in',
				prompt: 'choice',
			},
		],
	});
	const save = vi
		.fn(() => Promise.withResolvers<{ ok: boolean }>().promise)
		.mockResolvedValueOnce({ ok: true });
	let kernel!: ConsentKernel;
	const Capture = () => {
		const current = useContext(KernelContext);
		useEffect(() => {
			if (current) {
				kernel = current;
				kernel.set.activeUI('dialog');
			}
		}, [current]);
		return null;
	};
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	root.render(
		<ConsentProvider
			options={{
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
		await vi.waitFor(() => expect(kernel).toBeDefined());
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().promptRequirement).toEqual({ kind: 'none' });
		// A later Save renews the acknowledgement without changing the prompt,
		// so only the recorded acknowledgement can close the dialog early.
		await new Promise((resolve) => {
			setTimeout(resolve, 5);
		});
		kernel.set.activeUI('dialog');
		await vi.waitFor(() =>
			expect(
				document.querySelector(
					'[data-testid="consent-widget-footer-save-button"]'
				)
			).not.toBeNull()
		);
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-widget-footer-save-button"]'
			)
			?.click();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
	} finally {
		root.unmount();
		container.remove();
	}
});
