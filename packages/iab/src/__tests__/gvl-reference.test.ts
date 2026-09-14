/** @vitest-environment jsdom */
import {
	createConsentKernel,
	deferInitGvl,
	resolveIABBannerSummary,
} from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { afterEach, expect, test, vi } from 'vitest';

import { createIAB } from '../index';
import { clearGVLCache, setMockGVL } from '../tcf/fetch-gvl';
import { decodeTCString } from '../tcf/tc-string';
import { completeGVL } from './fixtures/gvl-sample';

const policy = normalizePolicyRule({
	id: 'iab-reference',
	match: { isDefault: true },
	model: 'iab',
	prompt: 'choice',
});
const resolution = {
	fingerprints: createPolicyRuleFingerprints(policy),
	matchedBy: 'default' as const,
	policy,
	policyId: policy.id,
	status: 'matched' as const,
};
const payload = {
	gvl: completeGVL,
	policyResolution: writePolicyResolutionWire(resolution),
	translations: { language: 'de', translations: {} },
} as InitOutput;
const reference = deferInitGvl(
	payload,
	'/api/privacy?c15t-gvl=142&language=de'
).gvlReference;
const disposers: (() => void)[] = [];
const kernelWithReference = () => {
	const kernel = createConsentKernel({
		initialIab: {
			cmpId: 28,
			enabled: true,
			gvl: null,
			gvlReference: reference,
		},
		initialPolicyResolution: resolution,
	});
	disposers.push(kernel.dispose);
	return kernel;
};
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
	setMockGVL(undefined);
	clearGVLCache();
	vi.unstubAllGlobals();
});

test('retains identical banner copy across serialization and list loading', async () => {
	const kernel = kernelWithReference();
	const expected = resolveIABBannerSummary({ gvl: completeGVL });
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab)).toEqual(expected);
	let complete!: (response: Response) => void;
	const fetch = vi.fn(
		() =>
			new Promise<Response>((resolve) => {
				complete = resolve;
			})
	);
	vi.stubGlobal('fetch', fetch);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	expect(kernel.getSnapshot().model).toBe('iab');
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab)).toEqual(expected);
	expect(fetch).toHaveBeenCalledWith(
		expect.stringContaining('/api/privacy?'),
		expect.objectContaining({ headers: { 'accept-language': 'de' } })
	);
	complete(Response.json(completeGVL));
	await handle.whenReady();
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab)).toEqual(expected);
	expect(kernel.getSnapshot().iab?.gvlReference).toBeUndefined();
});

test.each(['acceptAll', 'rejectAll'] as const)(
	'queues %s and saves a valid TC string before the list arrives',
	async (action) => {
		const kernel = kernelWithReference();
		let complete!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			() =>
				new Promise<Response>((resolve) => {
					complete = resolve;
				})
		);
		const handle = createIAB({ cmpId: 28, kernel });
		disposers.push(handle.dispose);
		handle[action]();
		const save = handle.save();
		complete(Response.json(completeGVL));
		await save;
		const tcString = kernel.getSnapshot().iab?.authority?.tcString;
		expect(tcString).toBeTruthy();
		if (!tcString) {
			throw new Error('Expected a saved TC string');
		}
		const decoded = await decodeTCString(tcString);
		expect(decoded.vendorListVersion).toBe(completeGVL.vendorListVersion);
		expect(kernel.getSnapshot().iab?.purposeConsents[1]).toBe(
			action === 'acceptAll'
		);
	}
);

test('rejects a changed vendor list and keeps the banner available', async () => {
	const kernel = kernelWithReference();
	vi.stubGlobal('fetch', () =>
		Promise.resolve(Response.json({ ...completeGVL, vendorListVersion: 999 }))
	);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	await expect(handle.whenReady()).rejects.toThrow('vendor list changed');
	await expect(handle.save()).rejects.toThrow('vendor list changed');
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	expect(kernel.getSnapshot().model).toBe('iab');
});

test('an explicit null overrides the reference without fetching', async () => {
	const kernel = kernelWithReference();
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);
	const handle = createIAB({ cmpId: 28, gvl: null, kernel });
	disposers.push(handle.dispose);
	await handle.whenReady();
	expect(fetch).not.toHaveBeenCalled();
	expect(kernel.getSnapshot().iab?.enabled).toBe(false);
});

test('clearing records cancels an action queued behind the list fetch', async () => {
	const kernel = kernelWithReference();
	let complete: (response: Response) => void = () => {};
	vi.stubGlobal(
		'fetch',
		() =>
			new Promise<Response>((resolve) => {
				complete = resolve;
			})
	);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	handle.acceptAll();
	const save = handle.save();
	kernel.events.emit({ type: 'records:cleared' });
	complete(Response.json(completeGVL));
	await expect(save).rejects.toThrow('cancelled');
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
	expect(kernel.getSnapshot().iab?.purposeConsents[1]).not.toBe(true);
});

test('loads a hosted init reference without using its policy or subject data', async () => {
	const kernel = kernelWithReference();
	if (!reference) {
		throw new Error('Expected reference');
	}
	kernel.set.iab({ gvlReference: { ...reference, format: 'init' } });
	vi.stubGlobal('fetch', () =>
		Promise.resolve(
			Response.json({
				gvl: completeGVL,
				policyResolution: null,
				subjectId: 'other-visitor',
			})
		)
	);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	await handle.whenReady();
	expect(kernel.getSnapshot().iab?.gvl?.vendorListVersion).toBe(
		completeGVL.vendorListVersion
	);
	expect(kernel.getSnapshot().subject?.subjectId).not.toBe('other-visitor');
	expect(kernel.getSnapshot().model).toBe('iab');
});

test('a newer draft cancels a blanket action queued while the list loads', async () => {
	const kernel = kernelWithReference();
	let complete!: (response: Response) => void;
	vi.stubGlobal(
		'fetch',
		() =>
			new Promise<Response>((resolve) => {
				complete = resolve;
			})
	);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	handle.acceptAll();
	handle.setPurposeConsent(1, false);
	complete(Response.json(completeGVL));
	await handle.whenReady();
	await Promise.resolve();
	expect(kernel.getSnapshot().iab?.purposeConsents[1]).toBe(false);
	expect(kernel.getSnapshot().iab?.vendorConsents).toEqual({});
});

test.each([null, 1, 'invalid', [], {}])(
	'handles invalid hosted init payload %j',
	async (invalidPayload) => {
		const kernel = kernelWithReference();
		if (!reference) {
			throw new Error('Expected reference');
		}
		kernel.set.iab({ gvlReference: { ...reference, format: 'init' } });
		vi.stubGlobal('fetch', () =>
			Promise.resolve(Response.json(invalidPayload))
		);
		const handle = createIAB({ cmpId: 28, kernel });
		disposers.push(handle.dispose);
		await expect(handle.whenReady()).rejects.toThrow('Unable to load');
		expect(kernel.getSnapshot().iab?.gvl).toBeNull();
	}
);

test('a client allowlist waits for accurate vendor counts and disclosures', async () => {
	const kernel = kernelWithReference();
	let complete!: (response: Response) => void;
	vi.stubGlobal(
		'fetch',
		() =>
			new Promise<Response>((resolve) => {
				complete = resolve;
			})
	);
	const id = Number(Object.keys(completeGVL.vendors)[0]);
	const handle = createIAB({ cmpId: 28, kernel, vendors: [id, id, 999999] });
	disposers.push(handle.dispose);
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab).isReady).toBe(false);
	complete(Response.json(completeGVL));
	await handle.whenReady();
	const vendor = completeGVL.vendors[id];
	if (!vendor) {
		throw new Error('Expected fixture vendor');
	}
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab)).toEqual(
		resolveIABBannerSummary({
			gvl: { ...completeGVL, vendors: { [id]: vendor } },
		})
	);
	expect(resolveIABBannerSummary(kernel.getSnapshot().iab).vendorCount).toBe(1);
});

test('a new reference loads without waiting for an obsolete request', async () => {
	const kernel = kernelWithReference();
	let completeOld!: (response: Response) => void;
	const nextList = { ...completeGVL, vendorListVersion: 999 };
	vi.stubGlobal(
		'fetch',
		vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<Response>((resolve) => {
						completeOld = resolve;
					})
			)
			.mockResolvedValueOnce(Response.json(nextList))
	);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	if (!reference) {
		throw new Error('Expected reference');
	}
	handle.acceptAll();
	const save = handle.save();
	kernel.set.iab({
		gvl: null,
		gvlReference: { ...reference, url: '/new-list', vendorListVersion: 999 },
	});
	await handle.whenReady();
	await expect(save).rejects.toThrow('cancelled');
	expect(kernel.getSnapshot().iab?.gvl?.vendorListVersion).toBe(999);
	completeOld(Response.json(completeGVL));
	await Promise.resolve();
	await Promise.resolve();
	expect(kernel.getSnapshot().iab?.gvl?.vendorListVersion).toBe(999);
	expect(kernel.getSnapshot().iab?.authority).toBeNull();
});

test('reinitialization updates the list while retaining TCF listeners', async () => {
	const kernel = kernelWithReference();
	vi.stubGlobal('fetch', () => Promise.resolve(Response.json(completeGVL)));
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	await handle.whenReady();
	const api = handle.cmpApi;
	const listener = vi.fn();
	window.__tcfapi?.('addEventListener', 2, listener);
	await vi.waitFor(() => expect(listener).toHaveBeenCalled());
	listener.mockClear();
	if (!reference) {
		throw new Error('Expected reference');
	}
	const nextList = { ...completeGVL, vendorListVersion: 999 };
	vi.stubGlobal('fetch', () => Promise.resolve(Response.json(nextList)));
	kernel.set.iab({
		gvl: null,
		gvlReference: { ...reference, language: 'fr', vendorListVersion: 999 },
	});
	await handle.whenReady();
	expect(handle.cmpApi).toBe(api);
	expect(kernel.getSnapshot().iab?.gvl?.vendorListVersion).toBe(999);
	handle.acceptAll();
	await handle.save();
	await vi.waitFor(() =>
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ eventStatus: 'useractioncomplete' }),
			true
		)
	);
	const tcString = kernel.getSnapshot().iab?.authority?.tcString;
	if (!tcString) {
		throw new Error('Expected consent');
	}
	expect((await decodeTCString(tcString)).vendorListVersion).toBe(999);
});

test('a consent action retries a transient list failure', async () => {
	const kernel = kernelWithReference();
	const fetch = vi
		.fn()
		.mockRejectedValueOnce(new Error('offline'))
		.mockResolvedValueOnce(Response.json(completeGVL));
	vi.stubGlobal('fetch', fetch);
	const handle = createIAB({ cmpId: 28, kernel });
	disposers.push(handle.dispose);
	await expect(handle.whenReady()).rejects.toThrow('offline');
	handle.acceptAll();
	await handle.save();
	expect(fetch).toHaveBeenCalledTimes(2);
	expect(kernel.getSnapshot().iab?.authority?.tcString).toBeTruthy();
});
