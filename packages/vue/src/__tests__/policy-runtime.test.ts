import type { AllConsentNames } from '@c15t/core';
import { readStoredRecords } from '@c15t/core/modules/persistence';
import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { PolicyResolution, PolicyRule } from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentDraft } from '../runtime/composables/draft';
import { symbolKernelContext } from '../runtime/utils/symbols';
import { createVueConsentKernelContext } from './test-kernel';

const resolution = (patch: Partial<PolicyRule> = {}): PolicyResolution => {
	const policy = normalizePolicyRule({
		categories: ['measurement', 'marketing'],
		id: 'vue-test',
		match: { fallback: true },
		model: 'opt-in',
		prompt: 'choice',
		scopeMode: 'permissive',
		...patch,
	});
	return {
		fingerprints: createPolicyRuleFingerprints(policy),
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	};
};
afterEach(() => vi.restoreAllMocks());
/** What a site offering the fixture policy's categories declares. */
const DECLARED: AllConsentNames[] = ['marketing', 'measurement'];

test('subject-only prefetch preserves browser receipts without a prepared record seed', async () => {
	const now = 1_800_000_000_000;
	vi.spyOn(Date, 'now').mockReturnValue(now);
	const policyResolution = writePolicyResolutionWire(resolution());
	if (policyResolution.status !== 'matched') {
		throw new Error('Expected a matched fixture');
	}
	const receipt = {
		basis: {
			fingerprint: policyResolution.fingerprints.choice,
			kind: 'choice-v1',
		},
		confirmedAt: now - 1000,
		value: true,
	};
	const storageKey = 'vue-prefetched-subject';
	localStorage.setItem(
		storageKey,
		JSON.stringify({ categories: { marketing: receipt }, version: 3 })
	);
	const config = {
		backendURL: '/api/c15t',
		iframeBlocker: false as const,
		storageConfig: { storageKey },
	};
	const prefetch = {
		branding: 'c15t' as const,
		location: { countryCode: 'DE', regionCode: null },
		policyResolution,
		subjectId: 'backend+literal',
		translations: { language: 'en', translations },
	};
	const context = createVueConsentKernelContext({
		config,
		now,
		prefetch,
		producerContract: 1,
	});
	context.start();
	const { dispose } = context;
	try {
		await Promise.resolve();
		expect(context.snapshot.value.explicitChoice?.categories.marketing).toEqual(
			receipt
		);
		expect(context.snapshot.value.subject?.subjectId).toBe('backend+literal');
	} finally {
		dispose();
		localStorage.removeItem(storageKey);
		document.cookie = `${storageKey}=; Max-Age=0; Path=/`;
	}
});

test('a draft reads the raw grant under GPC and confirms only displayed categories', async () => {
	const now = 1_800_000_000_000;
	vi.spyOn(Date, 'now').mockReturnValue(now);
	const context = createVueConsentKernelContext({
		config: { consentCategories: DECLARED },
		kernelConfig: {
			initialPolicyResolution: resolution({
				privacySignals: { gpc: { denyCategories: ['marketing'] } },
			}),
			now,
		},
	});
	await context.kernel.commands.save('all');
	const receipt = context.storedConsent.value;
	context.kernel.set.privacySignals({ gpc: true });
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, { consentCategories: DECLARED });
	const container = document.createElement('div');
	app.mount(container);
	try {
		expect(context.snapshot.value.effectivePermissions.marketing).toBe(false);
		expect(draft.values.value.marketing).toBe(true);
		expect(context.storedConsent.value).toBe(receipt);
		const confirmed: unknown[] = [];
		context.kernel.events.on('choice:recorded', (event) =>
			confirmed.push(event.confirmed)
		);
		await draft.save();
		expect(confirmed).toEqual([['measurement', 'marketing']]);
	} finally {
		app.unmount();
		context.dispose();
	}
});

test('a draft lists the displayed policy scope in consentTypes order and confirms only it', async () => {
	const context = createVueConsentKernelContext({
		config: {
			consentCategories: [
				'necessary',
				'measurement',
				'experience',
				'marketing',
			],
		},
		kernelConfig: {
			initialPolicyResolution: resolution({
				categories: ['functionality', 'marketing', 'measurement'],
			}),
		},
	});
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, {
		consentCategories: ['necessary', 'measurement', 'experience', 'marketing'],
	});
	app.mount(document.createElement('div'));
	try {
		// Every framework lists the choice scope in consentTypes order. The
		// resolved policy scope is sorted (marketing, measurement).
		expect(draft.displayedCategories.value).toEqual([
			'necessary',
			'measurement',
			'marketing',
		]);
		await draft.save();
		expect(context.snapshot.value.explicitChoice?.categories).toEqual({
			marketing: expect.objectContaining({ value: false }),
			measurement: expect.objectContaining({ value: false }),
		});
	} finally {
		app.unmount();
		context.dispose();
	}
});

test('material policy changes block an already displayed draft until review', async () => {
	let current = resolution();
	const context = createVueConsentKernelContext({
		config: { consentCategories: DECLARED },
		kernelConfig: {
			initialPolicyResolution: current,
			transport: {
				init: () =>
					Promise.resolve({
						policyResolution: writePolicyResolutionWire(current),
					}),
			},
		},
	});
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, { consentCategories: DECLARED });
	app.mount(document.createElement('div'));
	try {
		draft.values.value.marketing = true;
		current = resolution({ categories: ['measurement'] });
		await context.kernel.commands.init();
		expect(await draft.save()).toEqual({ ok: false });
		expect(context.snapshot.value.explicitChoice).toBeNull();
		draft.reset();
		expect(await draft.save()).toMatchObject({ ok: true });
		expect(
			Object.keys(context.snapshot.value.explicitChoice?.categories ?? {})
		).toEqual(['measurement']);
	} finally {
		app.unmount();
		context.dispose();
	}
});

test('notice dismissal and registration do not replay choice callbacks', async () => {
	const choice = vi.fn();
	const permissions = vi.fn();
	const context = createVueConsentKernelContext({
		config: {
			callbacks: {
				onChoiceRecorded: choice,
				onPermissionsChanged: permissions,
			},
		},
		kernelConfig: {
			initialPolicyResolution: resolution({
				model: 'opt-out',
				prompt: 'notice',
			}),
		},
	});
	try {
		expect(choice).not.toHaveBeenCalled();
		expect(permissions).not.toHaveBeenCalled();
		await context.kernel.commands.dismissNotice();
		expect(choice).not.toHaveBeenCalled();
		expect(permissions).not.toHaveBeenCalled();
		expect(context.snapshot.value.explicitChoice).toBeNull();
		await context.kernel.commands.save({ measurement: false });
		expect(choice).toHaveBeenCalledOnce();
		expect(permissions).toHaveBeenCalledOnce();
		expect(choice.mock.calls[0]?.[0]).not.toHaveProperty('type');
	} finally {
		context.dispose();
	}
});

test('onSurfaceShown fires for the server-rendered banner and an opened dialog', () => {
	const now = 1_800_000_000_000;
	vi.spyOn(Date, 'now').mockReturnValue(now);
	const surfaceShown = vi.fn();
	const config = {
		callbacks: { onSurfaceShown: surfaceShown },
		iframeBlocker: false as const,
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution(), now },
	});
	expect(surfaceShown).not.toHaveBeenCalled();
	// No init on the prefetch path: the runtime marks the kernel live itself.
	context.start();
	const { dispose } = context;
	try {
		expect(surfaceShown).toHaveBeenCalledOnce();
		expect(surfaceShown.mock.calls[0]?.[0]).toMatchObject({
			shownAt: now,
			surface: 'banner',
		});
		expect(surfaceShown.mock.calls[0]?.[0]).not.toHaveProperty('type');

		vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
		context.activeUI.value = 'manager';
		expect(surfaceShown).toHaveBeenCalledTimes(2);
		expect(surfaceShown.mock.calls[1]?.[0]).toMatchObject({
			shownAt: now + 2000,
			surface: 'dialog',
		});
	} finally {
		dispose();
	}
});

test.each([true, false, 'true', 1, undefined])(
	'browser GPC accepts only the exact boolean signal %s',
	(signal) => {
		const previous = Object.getOwnPropertyDescriptor(
			navigator,
			'globalPrivacyControl'
		);
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: signal,
		});
		const config = { iframeBlocker: false as const };
		const context = createVueConsentKernelContext({
			config,
			kernelConfig: {
				initialPolicyResolution: resolution({
					model: 'opt-out',
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'notice',
				}),
			},
		});
		context.start();
		const { dispose } = context;
		try {
			expect(context.snapshot.value.privacySignals.gpc.detected).toBe(
				signal === true
			);
		} finally {
			dispose();
			if (previous) {
				Object.defineProperty(navigator, 'globalPrivacyControl', previous);
			} else {
				Reflect.deleteProperty(navigator, 'globalPrivacyControl');
			}
		}
	}
);

test.each(['header', 'browser', 'header-with-browser-false'] as const)(
	'prepared mount applies %s GPC live without recording consent or storage',
	async (source) => {
		const now = Date.now();
		vi.spyOn(Date, 'now').mockReturnValue(now);
		const previous = Object.getOwnPropertyDescriptor(
			navigator,
			'globalPrivacyControl'
		);
		const browserSignals = {
			browser: true,
			header: undefined,
			'header-with-browser-false': false,
		};
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: browserSignals[source],
		});
		const choice = vi.fn();
		const consentSave = vi.fn(() => Promise.resolve({ ok: true }));
		const storageConfig = { storageKey: `vue-prepared-gpc-${source}` };
		const config = {
			callbacks: { onChoiceRecorded: choice },
			iframeBlocker: false as const,
			storageConfig,
		};
		const context = createVueConsentKernelContext({
			config,
			initialRecords: {
				choice: null,
				noticeDismissal: null,
				now: now - 1000,
				subject: null,
			},
			kernelConfig: {
				initialPolicyResolution: resolution({
					model: 'opt-out',
					privacySignals: { gpc: { denyCategories: ['marketing'] } },
					prompt: 'notice',
				}),
				initialPrivacySignals: { gpc: source !== 'browser' },
				transport: { save: consentSave },
			},
		});
		context.start();
		const { dispose } = context;
		try {
			// A browser reporting `false` does not withdraw the signal the
			// request carried: any source asserting GPC keeps it active.
			await vi.waitFor(() =>
				expect(context.snapshot.value.privacySignals.gpc.active).toBe(true)
			);
			expect(context.snapshot.value.effectivePermissions.marketing).toBe(false);
			expect(context.snapshot.value.explicitChoice).toBeNull();
			expect(choice).not.toHaveBeenCalled();
			expect(consentSave).not.toHaveBeenCalled();
			expect(readStoredRecords(storageConfig, now).records.choice).toBeNull();
			expect(
				localStorage.getItem(`${storageConfig.storageKey}-privacy`)
			).toBeNull();
		} finally {
			dispose();
			if (previous) {
				Object.defineProperty(navigator, 'globalPrivacyControl', previous);
			} else {
				Reflect.deleteProperty(navigator, 'globalPrivacyControl');
			}
		}
	}
);

test('a vendor record saved by another surface keeps a dirty draft', async () => {
	const context = createVueConsentKernelContext({
		config: {
			vendors: [
				{
					category: 'marketing',
					id: 'google-ads',
					name: 'Google Ads',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
			],
		},
		kernelConfig: { initialPolicyResolution: resolution() },
	});
	await context.kernel.commands.save('all');
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, {});
	app.mount(document.createElement('div'));
	try {
		draft.values.value.marketing = false;
		// Another surface on the same kernel records a vendor-only save.
		await context.kernel.commands.save({ vendors: { 'google-ads': false } });
		await nextTick();
		expect(context.snapshot.value.vendorChoice?.denied).toEqual(['google-ads']);
		expect(draft.values.value.marketing).toBe(false);
		expect(draft.isStale.value).toBe(false);
		// A clean draft follows the new record.
		draft.reset();
		expect(draft.vendors.value['google-ads']).toBe(false);
	} finally {
		app.unmount();
		context.dispose();
	}
});

test('a category record saved by another surface keeps a staged vendor toggle', async () => {
	const context = createVueConsentKernelContext({
		config: {
			vendors: [
				{
					category: 'marketing',
					id: 'google-ads',
					name: 'Google Ads',
					privacyPolicyUrl: 'https://policies.google.com/privacy',
				},
			],
		},
		kernelConfig: { initialPolicyResolution: resolution() },
	});
	await context.kernel.commands.save('all');
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, {});
	app.mount(document.createElement('div'));
	try {
		draft.setVendor('google-ads', false);
		// Another surface on the same kernel turns marketing off.
		await context.kernel.commands.save({ marketing: false });
		await nextTick();
		expect(
			context.snapshot.value.explicitChoice?.categories.marketing?.value
		).toBe(false);
		// The staged toggle survives and the untouched category follows the
		// new record, so this surface's save does not turn marketing back on.
		expect(draft.vendors.value['google-ads']).toBe(false);
		expect(draft.values.value.marketing).toBe(false);
		expect(draft.isStale.value).toBe(false);
		await draft.save();
		expect(
			context.snapshot.value.explicitChoice?.categories.marketing?.value
		).toBe(false);
		expect(context.snapshot.value.vendorChoice?.denied).toEqual(['google-ads']);
	} finally {
		app.unmount();
		context.dispose();
	}
});
