/** @vitest-environment jsdom */
import { createConsentKernel, evaluateConsent } from '@c15t/core';
import type { ConsentKernel, KernelTransport } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { createAuthorityReceipt, validateAuthority } from '../authority';
import { createIAB } from '../index';
import { decodeTCString, generateTCString } from '../tcf/tc-string';
import { completeGVL } from './fixtures/gvl-sample';

const NOW = Date.UTC(2026, 8, 5, 12);
const DAY = 86_400_000;
const disposers: (() => void)[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	localStorage.clear();
});
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const makeKernel = function makeKernel(
	transport?: KernelTransport
): ConsentKernel {
	const policy = normalizePolicyRule({
		id: 'iab-test',
		match: { isDefault: true },
		model: 'iab',
		prompt: 'choice',
		validity: { choiceDays: 1 },
	});
	const kernel = createConsentKernel({
		initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
		initialPolicyResolution: {
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'default',
			policy,
			policyId: policy.id,
			status: 'matched',
		},
		now: NOW,
		transport,
	});
	disposers.push(kernel.dispose);
	return kernel;
};

const data = {
	purposeConsents: { 1: true, 2: true, 3: true },
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	vendorConsents: { '755': true },
	vendorLegitimateInterests: {},
	vendorsDisclosed: { '755': true },
};

test('validates actual TC and rejects stale, future, malformed and mismatched receipts', async () => {
	const kernel = makeKernel();
	const tcString = await generateTCString(data, completeGVL, { cmpId: 28 });
	const receipt = createAuthorityReceipt(kernel.getSnapshot(), tcString, NOW);
	const authority = await validateAuthority(receipt, kernel.getSnapshot(), NOW);
	expect(authority?.vendorConsents['755']).toBe(true);
	expect(authority?.confirmedAt).toBe(NOW);
	expect(
		await validateAuthority(receipt, kernel.getSnapshot(), NOW + DAY)
	).toBeNull();
	await Promise.all(
		[
			{ tcString: 'garbage' },
			{ confirmedAt: NOW + 1 },
			{ confirmedAt: NOW - DAY },
			{ choiceFingerprint: 'old-policy' },
			{ expiresAt: NOW + 2 * DAY },
		].map(async (patch) => {
			expect(
				await validateAuthority(
					{ ...receipt, ...patch },
					kernel.getSnapshot(),
					NOW
				)
			).toBeNull();
		})
	);
});

test('IAB draft changes do not grant; save records one category action and confirmed authority', async () => {
	const kernel = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	const recorded = vi.fn();
	kernel.events.on('choice:recorded', recorded);
	addon.acceptAll();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(false);
	await addon.save();
	expect(recorded).toHaveBeenCalledTimes(1);
	expect(kernel.getSnapshot().iab?.authority).not.toBeNull();
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 755 },
			kernel.getSnapshot()
		)
	).toBe(true);
	const authority = kernel.getSnapshot().iab?.authority;
	addon.setVendorConsent(755, false);
	expect(kernel.getSnapshot().iab?.authority).toBe(authority);
	await vi.advanceTimersByTimeAsync(DAY);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

test('stored authority hydration preserves clocks and does not write or record choice', async () => {
	const original = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	addon.acceptAll();
	await addon.save();
	const confirmedAt = original.getSnapshot().iab?.authority?.confirmedAt;
	addon.dispose();
	vi.setSystemTime(NOW + 1000);
	const kernel = makeKernel();
	const recorded = vi.fn();
	kernel.events.on('choice:recorded', recorded);
	const write = vi.spyOn(Storage.prototype, 'setItem');
	const hydrated = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(hydrated.dispose);
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
	);
	expect(kernel.getSnapshot().iab?.authority?.confirmedAt).toBe(confirmedAt);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(recorded).not.toHaveBeenCalled();
	expect(write).not.toHaveBeenCalled();
});

test.each(['clear', 'dispose', 'draft'])(
	'late encoding cannot grant after %s',
	async (change) => {
		const kernel = makeKernel();
		const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
		disposers.push(addon.dispose);
		addon.acceptAll();
		const pending = addon.save();
		if (change === 'clear') {
			kernel.hydrate({ choice: null, subject: null });
		}
		if (change === 'dispose') {
			addon.dispose();
		}
		if (change === 'draft') {
			addon.rejectAll();
		}
		await pending;
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().iab?.authority).toBeNull();
	}
);

test.each([NOW, NOW + 12 * 60 * 60 * 1000 - 1])(
	'async encoding preserves confirmation time across midnight: %s',
	async (actionAt) => {
		vi.setSystemTime(actionAt);
		const kernel = makeKernel();
		const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
		disposers.push(addon.dispose);
		addon.acceptAll();
		const pending = addon.save();
		vi.setSystemTime(actionAt + 5000);
		await pending;
		expect(kernel.getSnapshot().iab?.authority?.confirmedAt).toBe(actionAt);
		expect(
			kernel.getSnapshot().explicitChoice?.categories.marketing?.confirmedAt
		).toBe(actionAt);
		const tcString = kernel.getSnapshot().iab?.authority?.tcString;
		expect(tcString).toBeTruthy();
		const decoded = await decodeTCString(tcString ?? '');
		expect(decoded.lastUpdated.getTime()).toBe(
			Math.floor(actionAt / DAY) * DAY
		);
	}
);

test('custom vendor ids and rejections survive validation without inherited grants', async () => {
	const kernel = makeKernel();
	const addon = createIAB({
		cmpId: 28,
		customVendors: [
			{
				id: '__proto__',
				name: 'Custom',
				privacyPolicyUrl: 'https://example.test/privacy',
				purposes: [1],
			},
			{
				id: 9001,
				name: 'Numeric custom',
				privacyPolicyUrl: 'https://example.test/privacy',
				purposes: [1],
			},
		],
		gvl: completeGVL,
		kernel,
	});
	disposers.push(addon.dispose);
	addon.acceptAll();
	addon.setVendorConsent(9001, false);
	await addon.save();
	const authority = kernel.getSnapshot().iab?.authority;
	expect(authority).not.toBeNull();
	expect(Object.hasOwn(authority?.vendorConsents ?? {}, '__proto__')).toBe(
		true
	);
	expect(
		Object.getOwnPropertyDescriptor(
			authority?.vendorConsents ?? {},
			'__proto__'
		)?.value
	).toBe(true);
	expect(authority?.vendorConsents['9001']).toBe(false);
	expect(
		evaluateConsent(
			{ category: 'marketing', vendorId: 'toString' },
			kernel.getSnapshot()
		)
	).toBe(false);
});

test('material policy change while encoding cannot restore old IAB authority', async () => {
	const kernel = makeKernel({
		init: () =>
			Promise.resolve({
				policyResolution: {
					policy: null,
					reason: 'invalid-payload',
					status: 'failed',
				},
			}),
	});
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	addon.acceptAll();
	const pending = addon.save();
	await kernel.commands.init();
	await pending;
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

test('stored authority restores after delayed policy initialization', async () => {
	const original = makeKernel();
	const saved = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	saved.acceptAll();
	await saved.save();
	saved.dispose();
	const kernel = createConsentKernel({
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						original.getSnapshot().resolution
					),
				}),
		},
	});
	disposers.push(kernel.dispose);
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	await vi.advanceTimersByTimeAsync(1);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	await kernel.commands.init();
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
	);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
});

test('clearing during stored TC hydration cannot restore authority', async () => {
	const original = makeKernel();
	const saved = createIAB({ cmpId: 28, gvl: completeGVL, kernel: original });
	saved.acceptAll();
	await saved.save();
	saved.dispose();
	const kernel = makeKernel();
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	kernel.hydrate({ choice: null, subject: null });
	await vi.advanceTimersByTimeAsync(1);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

const target = {
	category: 'marketing',
	iabPurposes: [1],
	vendorId: 755,
} as const;

const createAddon = function createAddon(kernel: ConsentKernel) {
	const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
	disposers.push(addon.dispose);
	return addon;
};

test('server-assigned subject preserves locally confirmed authority', async () => {
	const kernel = makeKernel({
		save: () => Promise.resolve({ ok: true, subjectId: 'canonical' }),
	});
	const addon = createAddon(kernel);
	addon.acceptAll();
	const save = addon.save();
	await vi.waitFor(() =>
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe('canonical')
	);
	await save;
	expect(evaluateConsent(target, kernel.getSnapshot(), NOW)).toBe(true);
});

test('failed transport retains authority and replays the original TC and clock', async () => {
	const send = vi
		.fn()
		.mockResolvedValueOnce({ ok: false })
		.mockResolvedValue({ ok: true });
	const kernel = makeKernel({ save: send });
	const addon = createAddon(kernel);
	addon.acceptAll();
	const save = expect(addon.save()).rejects.toThrow(
		'Unable to save IAB preferences.'
	);
	await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
	await save;
	const authority = kernel.getSnapshot().iab?.authority;
	expect(evaluateConsent(target, kernel.getSnapshot(), NOW)).toBe(true);
	vi.setSystemTime(NOW + 1000);
	window.dispatchEvent(new Event('online'));
	await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
	expect(send.mock.calls[1]?.[0]).toEqual(send.mock.calls[0]?.[0]);
	expect(send.mock.calls[1]?.[0].tcString).toBe(authority?.tcString);
	expect(send.mock.calls[1]?.[0].givenAt).toBe(NOW);
	expect(kernel.getSnapshot().iab?.authority).toBe(authority);
});

test('clearing during a pending transport never restores authority', async () => {
	let finish!: (value: { ok: boolean; subjectId: string }) => void;
	const send = vi.fn(
		() =>
			// oxlint-disable-next-line promise/avoid-new -- Controls the transport response to exercise races.
			new Promise<{ ok: boolean; subjectId: string }>((resolve) => {
				finish = resolve;
			})
	);
	const kernel = makeKernel({ save: send });
	const addon = createAddon(kernel);
	addon.acceptAll();
	const save = addon.save();
	await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
	kernel.hydrate({ choice: null, subject: null });
	finish({ ok: true, subjectId: 'stale' });
	await save;
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	expect(kernel.getSnapshot().subject?.subjectId ?? null).toBeNull();
});

test('overlapping confirmations retain the newest authority', async () => {
	const kernel = makeKernel();
	const addon = createAddon(kernel);
	addon.acceptAll();
	const first = addon.save();
	addon.rejectAll();
	const second = addon.save();
	await Promise.all([first, second]);
	expect(kernel.getSnapshot().iab?.authority).not.toBeNull();
	expect(evaluateConsent(target, kernel.getSnapshot(), NOW)).toBe(false);
});

test.each(['subject', 'identity'] as const)(
	'changing %s during encoding cancels the old action',
	async (change) => {
		const kernel = makeKernel();
		const addon = createAddon(kernel);
		addon.acceptAll();
		const save = addon.save();
		if (change === 'subject') {
			kernel.set.subjectId('other');
		} else {
			await kernel.commands.identify({ externalId: 'other' });
		}
		await save;
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
		expect(kernel.getSnapshot().iab?.authority).toBeNull();
	}
);

test.each(['clear', 'dispose', 'policy'] as const)(
	'public TC generation cancels stale writes after %s',
	async (change) => {
		const kernel = makeKernel({
			init: () =>
				Promise.resolve({
					policyResolution: { policy: null, status: 'no-match' },
				}),
		});
		const addon = createAddon(kernel);
		addon.acceptAll();
		const generate = addon.generateTCString();
		if (change === 'clear') {
			kernel.hydrate({ choice: null, subject: null });
		}
		if (change === 'dispose') {
			addon.dispose();
		}
		if (change === 'policy') {
			await kernel.commands.init();
		}
		await generate;
		expect(kernel.getSnapshot().iab?.tcString).toBeNull();
	}
);

test.each(['invalid', 'pending', 'installed', 'unmounted'] as const)(
	'explicit clear removes all addon bytes with %s authority',
	async (state) => {
		const original = makeKernel();
		const firstAddon = createAddon(original);
		firstAddon.acceptAll();
		await firstAddon.save();
		firstAddon.dispose();
		original.dispose();
		if (state === 'invalid') {
			localStorage.setItem('c15t-iab-authority-v1', '{"invalid":true}');
		}
		const kernel = makeKernel();
		const addon = state === 'unmounted' ? null : createAddon(kernel);
		const persistence = createPersistence({ kernel, skipHydration: true });
		disposers.push(persistence.dispose);
		if (state === 'installed') {
			await vi.waitFor(() =>
				expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
			);
		}
		persistence.clear();
		await vi.advanceTimersByTimeAsync(1);
		expect(localStorage.getItem('c15t-iab-authority-v1')).toBeNull();
		expect(localStorage.getItem('euconsent-v2')).toBeNull();
		expect(document.cookie.includes('euconsent-v2=')).toBe(false);
		addon?.dispose();
		kernel.dispose();
		const reloaded = makeKernel();
		createAddon(reloaded);
		await vi.advanceTimersByTimeAsync(10);
		expect(reloaded.getSnapshot().iab?.authority).toBeNull();
	}
);

test.each(['subject', 'identity', 'new-save'] as const)(
	'pending response cannot overwrite %s',
	async (change) => {
		let finish!: (value: { ok: boolean; subjectId: string }) => void;
		const send = vi
			.fn()
			.mockImplementationOnce(
				() =>
					// oxlint-disable-next-line promise/avoid-new -- Controls the transport response to exercise races.
					new Promise<{ ok: boolean; subjectId: string }>((resolve) => {
						finish = resolve;
					})
			)
			.mockResolvedValue({ ok: true });
		const kernel = makeKernel({ save: send });
		const addon = createAddon(kernel);
		addon.acceptAll();
		const first = addon.save();
		await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
		if (change === 'subject') {
			kernel.set.subjectId('other');
		}
		if (change === 'identity') {
			await kernel.commands.identify({ externalId: 'other' });
		}
		if (change === 'new-save') {
			addon.rejectAll();
			const second = addon.save();
			await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
			await second;
		}
		const before = kernel.getSnapshot();
		finish({ ok: true, subjectId: 'stale' });
		await first;
		expect(kernel.getSnapshot().subject?.subjectId ?? null).toBe(
			before.subject?.subjectId ?? null
		);
		expect(kernel.getSnapshot().iab?.authority).toBe(before.iab?.authority);
		expect(evaluateConsent(target, kernel.getSnapshot(), NOW)).toBe(false);
	}
);

test.each(['clock', 'fingerprint', 'maps', 'expiry'] as const)(
	'invalid addon %s is an atomic no-op',
	async (field) => {
		const original = makeKernel();
		const addon = createAddon(original);
		addon.acceptAll();
		await addon.save();
		const authority = original.getSnapshot().iab?.authority;
		if (!authority) {
			throw new Error('Missing valid fixture authority');
		}
		const invalid = { ...authority };
		if (field === 'clock') {
			invalid.confirmedAt = NOW - 1;
		}
		if (field === 'fingerprint') {
			invalid.choiceFingerprint = 'stale';
		}
		if (field === 'maps') {
			Reflect.set(invalid, 'vendorConsents', null);
		}
		if (field === 'expiry') {
			invalid.expiresAt = NOW;
		}
		const send = vi.fn();
		const kernel = makeKernel({ save: send });
		const before = kernel.getSnapshot();
		const emit = vi.fn();
		kernel.events.on('command:save:started', emit);
		kernel.events.on('choice:recorded', emit);
		const result = await kernel.commands.save('all', {
			actionAt: NOW,
			iabAuthority: invalid,
		});
		expect(result.ok).toBe(false);
		expect(kernel.getSnapshot()).toBe(before);
		expect(emit).not.toHaveBeenCalled();
		expect(send).not.toHaveBeenCalled();
	}
);
