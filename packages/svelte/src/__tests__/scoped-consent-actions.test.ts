import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConsentManagerState } from '../lib/context.svelte';
import { createVoidDeferredPromise } from './deferred-promise';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { policyFixture } from './policy-fixture';

const required = <Value>(value: Value | undefined): Value => {
	if (value === undefined) {
		throw new Error('Expected canonical policy resolution');
	}
	return value;
};

beforeEach(() => {
	localStorage.clear();
	document.cookie = 'c15t=; Max-Age=0; path=/';
});

describe('displayed consent actions', () => {
	test.each(['all', 'necessary', 'custom'] as const)(
		'%s transport failure retains the draft and dialog for retry',
		async (action) => {
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const save = vi
				.fn()
				.mockRejectedValue(new Error('Transport unavailable'));
			const result = render(ConformanceFixture, {
				component: 'consent-dialog',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					consentCategories: ['necessary', 'marketing'],
					disableAnimation: true,
					mode: custom({ save }),
					persistence: false,
					prefetch: policyFixture({}, { categories: ['marketing'] }),
				},
			});
			try {
				const kernel = required(captured.kernel);
				const manager = required(captured.manager);
				kernel.set.activeUI('dialog');
				await tick();
				manager.setSelectedConsent('marketing', action !== 'all');
				const draft = { ...manager.selectedConsents };
				await expect(manager.saveConsents(action)).rejects.toThrow(
					'Unable to save preferences'
				);
				expect(save).toHaveBeenCalledOnce();
				expect(
					kernel.getSnapshot().explicitChoice?.categories.marketing?.value
				).toBe(action !== 'necessary');
				expect(manager.selectedConsents).toEqual(draft);
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(screen.getByRole('dialog')).toBeTruthy();
			} finally {
				result.unmount();
			}
		}
	);
	test.each(['all', 'necessary', 'custom'] as const)(
		'%s keeps the dialog pending and respects an explicit close',
		async (action) => {
			let rejectSave: (reason: Error) => void = () => {
				throw new Error('Save not started');
			};
			const save = vi.fn(async () => {
				await createVoidDeferredPromise((_resolve, reject) => {
					rejectSave = reject;
				});
				return { ok: true };
			});
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const result = render(ConformanceFixture, {
				component: 'consent-dialog',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					disableAnimation: true,
					mode: custom({ save }),
					persistence: false,
					prefetch: policyFixture({}, { categories: ['marketing'] }),
				},
			});
			try {
				const kernel = required(captured.kernel);
				const manager = required(captured.manager);
				manager.setActiveUI('dialog');
				manager.setSelectedConsent('marketing', true);
				const pending = manager.saveConsents(action);
				const rejected = expect(pending).rejects.toThrow(
					'Unable to save preferences'
				);
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(screen.getByRole('dialog')).toBeTruthy();
				manager.setActiveUI('none');
				rejectSave(new Error('Transport unavailable'));
				await rejected;
				await tick();
				expect(kernel.getSnapshot().activeUI).toBe('none');
				expect(screen.queryByRole('dialog')).toBeNull();
				expect(manager.selectedConsents.marketing).toBe(true);
			} finally {
				result.unmount();
			}
		}
	);
	test.each(['all', 'necessary', 'custom'] as const)(
		'%s completion cannot close or reset a newer pending save',
		async (action) => {
			const finish: (() => void)[] = [];
			const fail: ((reason: unknown) => void)[] = [];
			const save = vi.fn(async () => {
				await createVoidDeferredPromise((resolve, reject) => {
					finish.push(resolve);
					fail.push(reject);
				});
				return { ok: true };
			});
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const result = render(ConformanceFixture, {
				component: 'consent-dialog',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					disableAnimation: true,
					mode: custom({ save }),
					persistence: false,
					prefetch: policyFixture({}, { categories: ['marketing'] }),
				},
			});
			try {
				const kernel = required(captured.kernel);
				const manager = required(captured.manager);
				manager.setActiveUI('dialog');
				manager.setSelectedConsent('marketing', true);
				const first = manager.saveConsents(action);
				await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(1));
				manager.setSelectedConsent('marketing', false);
				const second = manager.saveConsents('custom');
				const secondFailure = expect(second).rejects.toThrow(
					'Unable to save preferences'
				);
				await vi.waitFor(() => expect(save).toHaveBeenCalledTimes(2));
				manager.setSelectedConsent('marketing', true);
				required(finish[0])();
				await first;
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(manager.selectedConsents.marketing).toBe(true);
				required(fail[1])(new Error('Transport unavailable'));
				await secondFailure;
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(manager.selectedConsents.marketing).toBe(true);
			} finally {
				result.unmount();
			}
		}
	);
	test.each(['accept', 'reject', 'save'] as const)(
		'%s button completion leaves a newly reopened dialog alone',
		async (action) => {
			let finish = () => {
				throw new Error('Save not started');
			};
			const save = vi.fn(async () => {
				await createVoidDeferredPromise((resolve) => {
					finish = resolve;
				});
				return { ok: true };
			});
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const result = render(ConformanceFixture, {
				component: 'consent-dialog',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					disableAnimation: true,
					mode: custom({ save }),
					persistence: false,
					prefetch: policyFixture({}, { categories: ['marketing'] }),
				},
			});
			try {
				const kernel = required(captured.kernel);
				const manager = required(captured.manager);
				const saveAction = vi.spyOn(manager, 'saveConsents');
				manager.setActiveUI('dialog');
				await tick();
				const button = document.querySelector(`[data-action="${action}"]`);
				if (!button) {
					throw new Error('Expected dialog action');
				}
				await fireEvent.click(button);
				await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
				manager.setActiveUI('none');
				manager.setActiveUI('dialog');
				manager.setSelectedConsent('marketing', false);
				finish();
				await required(saveAction.mock.results[0]).value;
				await tick();
				expect(kernel.getSnapshot().activeUI).toBe('dialog');
				expect(manager.selectedConsents.marketing).toBe(false);
				expect(screen.getByRole('dialog')).toBeTruthy();
			} finally {
				result.unmount();
			}
		}
	);
	test.each(['all', 'necessary', 'custom'] as const)(
		'%s returns to a still-required notice after a successful save',
		async (action) => {
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					disableAnimation: true,
					mode: custom({}),
					persistence: false,
					prefetch: policyFixture(
						{},
						{ categories: ['marketing'], model: 'opt-out', prompt: 'notice' }
					),
				},
			});
			try {
				const kernel = required(captured.kernel);
				const manager = required(captured.manager);
				manager.setActiveUI('dialog');
				await manager.saveConsents(action);
				expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');
				expect(kernel.getSnapshot().noticeDismissal).toBeNull();
				expect(kernel.getSnapshot().activeUI).toBe('banner');
			} finally {
				result.unmount();
			}
		}
	);
	test.each([false, true])(
		'custom save ignores a hidden draft after policy narrowing, saved choice=%s',
		async (hiddenChoice) => {
			let prefetch = policyFixture(
				{},
				{ categories: ['marketing', 'measurement'] }
			);
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					consentCategories: ['necessary', 'marketing', 'measurement'],
					disableAnimation: true,
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
			try {
				const { kernel, manager } = captured;
				if (!kernel || !manager) {
					throw new Error('Provider context was not captured');
				}
				await kernel.commands.init();
				await tick();
				await kernel.commands.save(
					{ measurement: hiddenChoice },
					{ actionAt: Date.now() - 1000 }
				);
				const hiddenReceipt =
					kernel.getSnapshot().explicitChoice?.categories.measurement;
				manager.setSelectedConsent('measurement', !hiddenChoice);
				manager.setSelectedConsent('marketing', true);
				prefetch = policyFixture({}, { categories: ['marketing'] });
				await kernel.commands.init();
				await tick();
				expect(manager.consentCategories).toEqual(['necessary', 'marketing']);
				expect(manager.draft.isStale).toBe(true);
				await expect(manager.saveConsents('custom')).rejects.toThrow(
					'policy changed'
				);
				expect(
					kernel.getSnapshot().explicitChoice?.categories.measurement
				).toEqual(hiddenReceipt);
				manager.draft.reset();
				manager.setSelectedConsent('marketing', true);
				await manager.saveConsents('custom');
				expect(
					kernel.getSnapshot().explicitChoice?.categories.marketing?.value
				).toBe(true);
				expect(
					kernel.getSnapshot().explicitChoice?.categories.measurement
				).toEqual(hiddenReceipt);
				expect(manager.draft.isStale).toBe(false);
				expect(manager.selectedConsents).toEqual({
					marketing: true,
					necessary: true,
				});
			} finally {
				result.unmount();
			}
		}
	);
	test.each(
		(['all', 'none'] as const).flatMap((action) =>
			(['regional', 'all-categories', 'necessary-only'] as const).map(
				(scope) => ({ action, scope })
			)
		)
	)(
		'$action preserves hidden receipts under $scope policy',
		async ({ action, scope }) => {
			const captured: {
				kernel?: ConsentKernel;
				manager?: ConsentManagerState;
			} = {};
			let prefetch = policyFixture();
			const result = render(ConformanceFixture, {
				component: 'consent-banner',
				onKernel: (kernel) => {
					captured.kernel = kernel;
				},
				onManager: (manager) => {
					captured.manager = manager;
				},
				options: {
					consentCategories: ['necessary', 'marketing', 'measurement'],
					disableAnimation: true,
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
			try {
				const { kernel, manager } = captured;
				if (!kernel || !manager) {
					throw new Error('Provider context was not captured');
				}
				await kernel.commands.save(
					{
						experience: true,
						functionality: false,
						marketing: true,
						measurement: true,
					},
					{ actionAt: Date.now() - 1000 }
				);
				const before = kernel.getSnapshot().explicitChoice;
				const rules = {
					'all-categories': { categories: ['*'] },
					'necessary-only': { categories: ['necessary'] },
					regional: { categories: ['marketing'] },
				} satisfies Record<typeof scope, Parameters<typeof policyFixture>[1]>;
				prefetch = policyFixture({}, rules[scope]);
				await kernel.commands.init();
				await tick();
				manager.draft.reset();
				const displayed =
					scope === 'regional' ? ['marketing'] : ['marketing', 'measurement'];
				expect(manager.consentCategories).toEqual(['necessary', ...displayed]);
				kernel.set.activeUI('dialog');
				await tick();
				await fireEvent.click(
					await screen.findByRole('button', {
						name: action === 'all' ? /accept all/iu : /reject all/iu,
					})
				);
				await vi.waitFor(() =>
					expect(
						kernel.getSnapshot().explicitChoice?.categories.marketing
							?.confirmedAt
					).toBeGreaterThan(before?.categories.marketing?.confirmedAt ?? 0)
				);
				const categories = kernel.getSnapshot().explicitChoice?.categories;
				for (const category of [
					'experience',
					'functionality',
					'marketing',
					'measurement',
				] as const) {
					if (displayed.includes(category)) {
						expect(categories?.[category]?.value).toBe(action === 'all');
						expect(categories?.[category]?.confirmedAt).toBeGreaterThan(
							before?.categories[category]?.confirmedAt ?? 0
						);
					} else {
						expect(categories?.[category]).toEqual(
							before?.categories[category]
						);
					}
				}
			} finally {
				result.unmount();
			}
		}
	);
});
