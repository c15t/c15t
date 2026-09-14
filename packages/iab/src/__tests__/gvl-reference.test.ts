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
