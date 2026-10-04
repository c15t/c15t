/**
 * Surface actions at their interface: which surface shows after a visitor
 * acts, and which older action loses to a newer one. Every adapter calls
 * these functions, so the sequences are pinned here rather than per
 * renderer.
 */
import { describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../index';
import type {
	ConsentKernel,
	KernelConfig,
	KernelIABAuthority,
	SaveResult,
} from '../index';
import {
	hasConsentPreferences,
	hasConsentUI,
	saveConsentBlanket,
	saveConsentSurface,
	saveIABConsentSurface,
	showConsentSurface,
} from '../surface-actions';
import type { ConsentSurfaceIAB } from '../surface-actions';
import {
	choiceRecords,
	iabRule,
	matchedResolution,
	noneRule,
	NOW,
	optInRule,
} from './fixtures/kernel-fixtures';

const OPT_IN = matchedResolution(optInRule());
const IAB = matchedResolution(iabRule());
const CATEGORIES = ['necessary', 'marketing', 'measurement'] as const;

/** A save whose backend never answers unless the test says so. */
const pendingTransport = function pendingTransport() {
	const response = Promise.withResolvers<SaveResult>();
	return {
		resolve: response.resolve,
		save: vi.fn(() => response.promise),
	};
};

const createKernel = function createKernel(config: KernelConfig = {}) {
	return createConsentKernel({
		consentCategories: CATEGORIES,
		initialPolicyResolution: OPT_IN,
		now: NOW,
		transport: { save: pendingTransport().save },
		...config,
	});
};

/** A visitor who already chose under the current policy: no prompt owed. */
const returningVisitor = function returningVisitor(config: KernelConfig = {}) {
	return createKernel({
		initialRecords: choiceRecords(
			{ marketing: true, measurement: true },
			{ fingerprint: OPT_IN.fingerprints.choice }
		),
		...config,
	});
};

const flush = () =>
	new Promise((resolve) => {
		setTimeout(resolve, 0);
	});

/** A save that records nothing and resolves when the test says so. */
const unrecordedSave = function unrecordedSave() {
	const response = Promise.withResolvers<SaveResult>();
	return { resolve: response.resolve, save: () => response.promise };
};

describe('hasConsentUI and hasConsentPreferences', () => {
	test.each([
		['a rule with a prompt', { initialPolicyResolution: OPT_IN }, true, true],
		[
			'a `none` rule without rights',
			{ initialPolicyResolution: matchedResolution(noneRule()) },
			false,
			false,
		],
		[
			'a `none` rule with a preferences right',
			{
				initialPolicyResolution: matchedResolution(
					noneRule({ rights: ['preferences'] })
				),
			},
			true,
			true,
		],
		[
			'a failed resolution',
			{
				initialPolicyResolution: {
					policy: null,
					reason: 'transport',
					status: 'failed',
				},
			},
			false,
			false,
		],
		[
			'a policy still pending',
			{ initialPolicyPending: true, initialPolicyResolution: undefined },
			false,
			false,
		],
		[
			'an external CMP',
			{ initialExternalPermissions: { marketing: true } },
			false,
			true,
		],
	] as const)('%s', (_name, config, ui, preferences) => {
		const kernel = createKernel(config as KernelConfig);
		expect(hasConsentUI(kernel.getSnapshot())).toBe(ui);
		expect(hasConsentPreferences(kernel.getSnapshot())).toBe(preferences);
	});
});

describe('saveConsentSurface', () => {
	test.each(['dialog', 'banner'] as const)(
		'a %s closes in the click task once the choice is recorded, and a failed request never reopens it',
		async (surface) => {
			const transport = pendingTransport();
			const kernel = returningVisitor({
				transport: { save: transport.save },
			});
			showConsentSurface(kernel, surface);
			const pending = saveConsentSurface(kernel, () =>
				kernel.commands.save('none')
			);
			expect(kernel.getSnapshot().activeUI).toBe('none');
			expect(transport.save).not.toHaveBeenCalled();
			await flush();
			transport.resolve({ ok: false });
			await pending;
			expect(kernel.getSnapshot().activeUI).toBe('none');
		}
	);

	test('a first-time choice from the dialog leaves no surface', () => {
		const kernel = createKernel();
		showConsentSurface(kernel, 'dialog');
		void saveConsentSurface(kernel, () => kernel.commands.save('all'));
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('a save that recorded nothing closes once it resolves ok', async () => {
		const kernel = returningVisitor();
		showConsentSurface(kernel, 'dialog');
		const save = unrecordedSave();
		const pending = saveConsentSurface(kernel, save.save);
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
		save.resolve({ ok: true });
		await pending;
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test.each([
		['the banner while a choice is still owed', {}, 'banner'],
		[
			'nothing while the policy is pending',
			{ initialPolicyPending: true, initialPolicyResolution: undefined },
			'none',
		],
		[
			'nothing after a failed resolution',
			{
				initialPolicyResolution: {
					policy: null,
					reason: 'transport',
					status: 'failed',
				},
			},
			'none',
		],
	] as const)(
		'the surface left behind is %s',
		async (_name, config, expected) => {
			const kernel = createKernel(config as KernelConfig);
			showConsentSurface(kernel, 'dialog');
			const save = unrecordedSave();
			const pending = saveConsentSurface(kernel, save.save);
			save.resolve({ ok: true });
			await pending;
			expect(kernel.getSnapshot().activeUI).toBe(expected);
		}
	);

	test('an unsuccessful save that recorded nothing keeps the dialog', async () => {
		const kernel = returningVisitor();
		showConsentSurface(kernel, 'dialog');
		const save = unrecordedSave();
		const pending = saveConsentSurface(kernel, save.save);
		save.resolve({ ok: false });
		await pending;
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
	});

	test('`canClose` vetoes the deferred close', async () => {
		const kernel = returningVisitor();
		showConsentSurface(kernel, 'dialog');
		const save = unrecordedSave();
		const pending = saveConsentSurface(kernel, save.save, () => false);
		save.resolve({ ok: true });
		await pending;
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
	});

	test.each(['dialog', 'banner', 'none'] as const)(
		'navigating to %s supersedes a pending save',
		async (surface) => {
			const kernel = returningVisitor();
			showConsentSurface(kernel, 'dialog');
			const save = unrecordedSave();
			const pending = saveConsentSurface(kernel, save.save);
			showConsentSurface(kernel, surface);
			save.resolve({ ok: true });
			await pending;
			expect(kernel.getSnapshot().activeUI).toBe(surface);
		}
	);

	test('an older save cannot close a dialog reopened by a newer action', async () => {
		const kernel = returningVisitor();
		showConsentSurface(kernel, 'dialog');
		const older = unrecordedSave();
		const pendingOlder = saveConsentSurface(kernel, older.save);
		const newer = unrecordedSave();
		const pendingNewer = saveConsentSurface(kernel, newer.save);
		older.resolve({ ok: true });
		await pendingOlder;
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
		newer.resolve({ ok: true });
		await pendingNewer;
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('with no surface open it only saves', async () => {
		const kernel = returningVisitor();
		const setActiveUI = vi.spyOn(kernel.set, 'activeUI');
		await saveConsentSurface(kernel, () => Promise.resolve({ ok: true }));
		expect(setActiveUI).not.toHaveBeenCalled();
	});
});

const AUTHORITY: KernelIABAuthority = {
	choiceFingerprint: IAB.fingerprints.choice,
	confirmedAt: NOW,
	expiresAt: NOW + 1000,
	purposeConsents: { 1: true },
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	tcString: 'tc',
	vendorConsents: {},
	vendorLegitimateInterests: {},
};

const createIABKernel = function createIABKernel(): ConsentKernel {
	return createKernel({
		initialIab: { enabled: true },
		initialPolicyResolution: IAB,
	});
};

/** A CMP handle whose `save` records a new authority, or fails. */
const fakeIAB = function fakeIAB(
	kernel: ConsentKernel,
	outcome: 'records' | 'records-nothing' | 'throws' = 'records'
) {
	const response = Promise.withResolvers<undefined>();
	const handle: ConsentSurfaceIAB & { finish: () => void } = {
		acceptAll: vi.fn(),
		finish() {
			if (outcome === 'throws') {
				response.reject(new Error('vendor list failed'));
				return;
			}
			if (outcome === 'records') {
				kernel.set.iab({ authority: { ...AUTHORITY } });
			}
			response.resolve(undefined);
		},
		rejectAll: vi.fn(),
		save: vi.fn(() => response.promise),
	};
	return handle;
};

describe('saveIABConsentSurface', () => {
	test('closes in the click task and stays closed once the TC string is recorded', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'banner');
		const iab = fakeIAB(kernel);
		const pending = saveIABConsentSurface(kernel, iab.save);
		expect(kernel.getSnapshot().activeUI).toBe('none');
		iab.finish();
		await expect(pending).resolves.toEqual({ ok: true });
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('brings the surface back when nothing was recorded', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'dialog');
		const iab = fakeIAB(kernel, 'records-nothing');
		const pending = saveIABConsentSurface(kernel, iab.save);
		iab.finish();
		await expect(pending).resolves.toEqual({ ok: false });
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
	});

	test('brings the surface back and rethrows when the save fails', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'dialog');
		const iab = fakeIAB(kernel, 'throws');
		const pending = saveIABConsentSurface(kernel, iab.save);
		iab.finish();
		await expect(pending).rejects.toThrow('vendor list failed');
		expect(kernel.getSnapshot().activeUI).toBe('dialog');
	});

	test('a superseded save does not reopen the surface a newer save closed', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'banner');
		const older = fakeIAB(kernel, 'records-nothing');
		const pendingOlder = saveIABConsentSurface(kernel, older.save);
		const newer = fakeIAB(kernel);
		const pendingNewer = saveIABConsentSurface(kernel, newer.save);
		older.finish();
		await pendingOlder;
		expect(kernel.getSnapshot().activeUI).toBe('none');
		newer.finish();
		await pendingNewer;
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});

	test('explicit navigation supersedes a pending save', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'dialog');
		const iab = fakeIAB(kernel, 'records-nothing');
		const pending = saveIABConsentSurface(kernel, iab.save);
		showConsentSurface(kernel, 'none');
		iab.finish();
		await pending;
		expect(kernel.getSnapshot().activeUI).toBe('none');
	});
});

describe('saveConsentBlanket', () => {
	test.each([
		['all', 'acceptAll'],
		['none', 'rejectAll'],
	] as const)(
		'%s under an IAB policy goes through the CMP handle',
		async (choice, method) => {
			const kernel = createIABKernel();
			showConsentSurface(kernel, 'banner');
			const iab = fakeIAB(kernel);
			const pending = saveConsentBlanket(kernel, choice, iab);
			expect(kernel.getSnapshot().activeUI).toBe('none');
			expect(iab[method]).toHaveBeenCalledOnce();
			expect(iab.save).toHaveBeenCalledOnce();
			iab.finish();
			await expect(pending).resolves.toEqual({ ok: true });
			expect(kernel.getSnapshot().explicitChoice).toBeNull();
		}
	);

	test('under an IAB policy without a CMP handle records nothing', async () => {
		const kernel = createIABKernel();
		showConsentSurface(kernel, 'banner');
		await expect(saveConsentBlanket(kernel, 'all', null)).resolves.toEqual({
			ok: false,
		});
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
	});

	test('an IAB policy whose IAB state is disabled records categories', () => {
		const kernel = createKernel({
			initialIab: { enabled: false },
			initialPolicyResolution: IAB,
		});
		const iab = fakeIAB(kernel);
		void saveConsentBlanket(kernel, 'all', iab);
		expect(iab.save).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().explicitChoice).not.toBeNull();
	});

	test.each(['all', 'none'] as const)(
		'%s records every category and closes the dialog',
		(choice) => {
			const kernel = returningVisitor();
			showConsentSurface(kernel, 'dialog');
			void saveConsentBlanket(kernel, choice);
			const { explicitChoice } = kernel.getSnapshot();
			expect(explicitChoice?.categories.marketing?.value).toBe(
				choice === 'all'
			);
			expect(explicitChoice?.categories.measurement?.value).toBe(
				choice === 'all'
			);
			expect(kernel.getSnapshot().activeUI).toBe('none');
		}
	);
});
