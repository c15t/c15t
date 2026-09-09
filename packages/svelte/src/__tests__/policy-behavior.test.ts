import { createConsentKernel, custom } from '@c15t/core';
import {
	createPersistence,
	readStoredRecords,
} from '@c15t/core/modules/persistence';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import Fixture from './fixtures/policy-state-fixture.svelte';
import { policyFixture } from './policy-fixture';

const required = <Value>(value: Value | null | undefined): Value => {
	if (value === null || value === undefined) {
		throw new Error('Expected a rendered control or configured policy');
	}
	return value;
};
const captureContext = () => {
	let context: ConsentContextValue;
	return {
		capture(value: ConsentContextValue) {
			context = value;
		},
		get current() {
			return context;
		},
	};
};
describe('policy records and Svelte controls', () => {
	test('prepared hydration is read-only and avoids a second init', async () => {
		const init = vi.fn();
		const choice = vi.fn();
		const context = captureContext();
		const prefetch = policyFixture({ marketing: true });
		const view = render(Fixture, {
			capture: context.capture,
			options: {
				callbacks: { onChoiceRecorded: choice },
				mode: custom({ init }),
				persistence: false,
				prefetch,
			},
		});
		await waitFor(() =>
			expect(context.current.snapshot.explicitChoice).toEqual(
				prefetch.initialRecords?.choice
			)
		);
		expect(init).not.toHaveBeenCalled();
		expect(choice).not.toHaveBeenCalled();
		view.unmount();
	});
	test('notice dismissal records no choice and preferences remain available', async () => {
		const context = captureContext();
		const choice = vi.fn();
		render(Fixture, {
			capture: context.capture,
			options: {
				callbacks: { onChoiceRecorded: choice },
				disableAnimation: true,
				mode: custom({}),
				persistence: false,
				prefetch: policyFixture({}, { model: 'opt-out', prompt: 'notice' }),
			},
		});
		const dismiss = required(
			document.querySelector<HTMLButtonElement>('[data-action="dismiss"]')
		);
		expect(dismiss.closest('[aria-modal="true"]')).toBeNull();
		await fireEvent.click(dismiss);
		await waitFor(() =>
			expect(context.current.snapshot.noticeDismissal).not.toBeNull()
		);
		expect(context.current.snapshot.explicitChoice).toBeNull();
		expect(choice).not.toHaveBeenCalled();
		await fireEvent.click(
			required(document.querySelector('[data-testid="consent-dialog-link"]'))
		);
		await waitFor(() =>
			expect(
				document.querySelector(
					'[data-testid="consent-widget-footer-save-button"]'
				)
			).not.toBeNull()
		);
	});
	test('draft retains explicit grants under GPC and records only displayed optional keys', async () => {
		const context = captureContext();
		const choice = vi.fn();
		render(Fixture, {
			capture: context.capture,
			options: {
				callbacks: { onChoiceRecorded: choice },
				consentCategories: ['necessary', 'marketing'],
				mode: custom({}),
				persistence: false,
				prefetch: {
					...policyFixture(
						{ marketing: true, measurement: false },
						{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
					),
					initialPrivacySignals: { gpc: true },
				},
			},
		});
		expect(context.current.state.draft.values.marketing).toBe(true);
		expect(context.current.snapshot.effectivePermissions.marketing).toBe(false);
		await context.current.state.saveConsents('custom');
		expect(choice).toHaveBeenCalledOnce();
		expect(choice.mock.calls[0]?.[0].confirmed).toEqual(['marketing']);
		expect(context.current.snapshot.effectivePermissions.marketing).toBe(false);
	});
	test('dirty draft rejects a material policy change until reviewed', async () => {
		const context = captureContext();
		let prefetch = policyFixture();
		render(Fixture, {
			capture: context.capture,
			options: {
				mode: custom({
					init: () =>
						Promise.resolve({
							policyResolution: writePolicyResolutionWire(
								required(prefetch.initialPolicyResolution)
							),
						}),
				}),
				persistence: false,
				prefetch,
			},
		});
		context.current.state.setSelectedConsent('marketing', true);
		prefetch = policyFixture({}, { copyRevision: 'changed' });
		await context.current.kernel.commands.init();
		expect(context.current.state.draft.isStale).toBe(true);
		await expect(context.current.state.saveConsents('custom')).rejects.toThrow(
			'policy changed'
		);
		expect(context.current.snapshot.explicitChoice).toBeNull();
		context.current.state.draft.reset();
		await context.current.state.saveConsents('custom');
		expect(context.current.snapshot.explicitChoice).not.toBeNull();
	});
	test('preventDefault cancels a privacy link action', async () => {
		const context = captureContext();
		render(Fixture, {
			capture: context.capture,
			onclick: (event) => event.preventDefault(),
			options: {
				mode: custom({}),
				persistence: false,
				prefetch: policyFixture(),
			},
		});
		await fireEvent.click(
			required(document.querySelector('[data-testid="consent-dialog-link"]'))
		);
		expect(context.current.snapshot.activeUI).toBe('banner');
	});
	test('hydrates local records when only a policy was prefetched', async () => {
		const config = { storageKey: 'svelte-local-prepared' };
		const prefetch = policyFixture({}, { categories: ['marketing'] });
		const source = createConsentKernel(prefetch);
		const persistence = createPersistence({
			kernel: source,
			skipHydration: true,
			storageConfig: config,
		});
		await source.commands.save({ marketing: true });
		await waitFor(() =>
			expect(
				readStoredRecords(config, Date.now()).records.choice
			).not.toBeNull()
		);
		const saved = readStoredRecords(config, Date.now()).records.choice;
		persistence.dispose();
		source.dispose();
		const context = captureContext();
		const view = render(Fixture, {
			capture: context.capture,
			options: { mode: custom({}), prefetch, storageConfig: config },
		});
		await waitFor(() =>
			expect(context.current.snapshot.explicitChoice).toEqual(saved)
		);
		expect(context.current.snapshot.effectivePermissions.marketing).toBe(true);
		view.unmount();
		localStorage.removeItem(config.storageKey);
		document.cookie = `${config.storageKey}=; Max-Age=0; Path=/`;
	});
	test('prepared records expire without renewing their confirmation time', async () => {
		const context = captureContext();
		const prefetch = policyFixture(
			{ marketing: true },
			{ categories: ['marketing'], validity: { choiceDays: 150 / 86_400_000 } }
		);
		const recordedAt =
			prefetch.initialRecords?.choice?.categories.marketing?.confirmedAt;
		const view = render(Fixture, {
			capture: context.capture,
			options: {
				disableAnimation: true,
				mode: custom({}),
				persistence: false,
				prefetch,
			},
		});
		expect(context.current.snapshot.effectivePermissions.marketing).toBe(true);
		await waitFor(() =>
			expect(context.current.snapshot.promptRequirement).toEqual({
				kind: 'choice',
				reason: 'expired',
			})
		);
		expect(context.current.snapshot.effectivePermissions.marketing).toBe(false);
		expect(
			context.current.snapshot.explicitChoice?.categories.marketing?.confirmedAt
		).toBe(recordedAt);
		view.unmount();
	});

	test.each(['header', 'browser'] as const)(
		'prepared hydration activates %s GPC without a choice or init request',
		async (source) => {
			const previous = Object.getOwnPropertyDescriptor(
				navigator,
				'globalPrivacyControl'
			);
			Object.defineProperty(navigator, 'globalPrivacyControl', {
				configurable: true,
				value: source === 'browser',
			});
			const context = captureContext();
			const init = vi.fn();
			const choice = vi.fn();
			let view: ReturnType<typeof render> | undefined;
			try {
				view = render(Fixture, {
					capture: context.capture,
					options: {
						callbacks: { onChoiceRecorded: choice },
						mode: custom({ init }),
						persistence: false,
						prefetch: {
							...policyFixture(
								{},
								{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
							),
							initialPrivacySignals: { gpc: source === 'header' },
						},
					},
				});
				await waitFor(() =>
					expect(context.current.snapshot.optOutDirectives).toHaveLength(1)
				);
				expect(context.current.snapshot.privacySignals.gpc.detected).toBe(true);
				expect(context.current.snapshot.explicitChoice).toBeNull();
				expect(init).not.toHaveBeenCalled();
				expect(choice).not.toHaveBeenCalled();
			} finally {
				view?.unmount();
				if (previous) {
					Object.defineProperty(navigator, 'globalPrivacyControl', previous);
				} else {
					Reflect.deleteProperty(navigator, 'globalPrivacyControl');
				}
			}
		}
	);
	test('theme appearance overrides are rendered and diagnosed', () => {
		const context = captureContext();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			const view = render(Fixture, {
				capture: context.capture,
				options: {
					mode: custom({}),
					persistence: false,
					prefetch: policyFixture(),
					theme: {
						consentActions: {
							accept: { mode: 'filled', variant: 'primary' },
							reject: { mode: 'ghost', variant: 'neutral' },
						},
					},
				},
			});
			expect(
				document
					.querySelector('[data-action="accept"]')
					?.getAttribute('data-mode')
			).toBe('filled');
			expect(
				document
					.querySelector('[data-action="reject"]')
					?.getAttribute('data-mode')
			).toBe('ghost');
			expect(warn).toHaveBeenCalledWith(
				'Host presentation gives equivalent actions different prominence.'
			);
			view.unmount();
		} finally {
			warn.mockRestore();
		}
	});
});
