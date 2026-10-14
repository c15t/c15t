/** @vitest-environment jsdom */
import { afterEach, expect, test, vi } from 'vitest';

import { createCMPApi } from '../tcf/cmp-api';
import { generateTCString } from '../tcf/tc-string';
import { completeGVL } from './fixtures/gvl-sample';

const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0)) {
		dispose();
	}
});

test.each(['replacement', 'withdrawal'] as const)(
	'notifies listeners of a TC string %s while the dialog is visible',
	async (change) => {
		const accepted = await generateTCString(
			{
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorConsents: { '1': true },
				vendorLegitimateInterests: {},
				vendorsDisclosed: { '1': true },
			},
			completeGVL,
			{ cmpId: 28 }
		);
		const rejected = await generateTCString(
			{
				purposeConsents: {},
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorConsents: {},
				vendorLegitimateInterests: {},
				vendorsDisclosed: { '1': true },
			},
			completeGVL,
			{ cmpId: 28 }
		);
		const api = createCMPApi({ cmpId: 28, gvl: completeGVL });
		disposers.push(api.destroy);
		api.updateConsent(accepted);
		api.setDisplayStatus('visible');
		const listener = vi.fn();
		window.__tcfapi?.('addEventListener', 2, listener);
		await vi.waitFor(() =>
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					eventStatus: 'cmpuishown',
					tcString: accepted,
				}),
				true
			)
		);
		listener.mockClear();

		const nextString = change === 'replacement' ? rejected : '';
		api.updateConsent(nextString);
		await vi.waitFor(() =>
			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					eventStatus: change === 'replacement' ? 'cmpuishown' : undefined,
					purpose: expect.objectContaining({ consents: {} }),
					tcString: nextString,
					vendor: expect.objectContaining({ consents: {} }),
				}),
				true
			)
		);
	}
);

const BASE_FIELDS = [
	'cmpId',
	'cmpStatus',
	'cmpVersion',
	'eventStatus',
	'gdprApplies',
	'listenerId',
	'tcfPolicyVersion',
];

const savedString = () =>
	generateTCString(
		{
			purposeConsents: { 1: true },
			purposeLegitimateInterests: {},
			specialFeatureOptIns: {},
			vendorConsents: { '1': true },
			vendorLegitimateInterests: {},
			vendorsDisclosed: { '1': true },
		},
		completeGVL,
		{ cmpId: 28 }
	);

test.each(['getTCData', 'addEventListener'] as const)(
	'%s returns only the base fields when the policy does not use TCF',
	async (command) => {
		const tcString = await savedString();
		const api = createCMPApi({
			cmpId: 28,
			gdprApplies: false,
			getAddtlConsent: () => '2~89~dv.2572',
			gvl: completeGVL,
		});
		disposers.push(api.destroy);
		api.updateConsent(tcString);

		const callback = vi.fn();
		window.__tcfapi?.(command, 2, callback);
		await vi.waitFor(() => expect(callback).toHaveBeenCalled());
		const [data, success] = callback.mock.calls[0] ?? [];
		expect(success).toBe(true);
		expect(data).toMatchObject({
			cmpId: 28,
			gdprApplies: false,
			tcfPolicyVersion: completeGVL.tcfPolicyVersion,
		});
		expect(
			Object.keys(data).filter((key) => !BASE_FIELDS.includes(key))
		).toEqual([]);
	}
);

test('switches TC data shape when the policy starts or stops using TCF', async () => {
	const tcString = await savedString();
	const api = createCMPApi({ cmpId: 28, gvl: completeGVL });
	disposers.push(api.destroy);
	api.updateConsent(tcString, undefined, true);
	const read = async () => {
		const callback = vi.fn();
		window.__tcfapi?.('getTCData', 2, callback);
		await vi.waitFor(() => expect(callback).toHaveBeenCalled());
		return callback.mock.calls[0]?.[0];
	};

	expect(await read()).toMatchObject({ gdprApplies: true, tcString });
	api.updateConsent(tcString, undefined, false);
	const outside = await read();
	expect(outside.gdprApplies).toBe(false);
	expect(outside).not.toHaveProperty('tcString');
	expect(outside).not.toHaveProperty('purpose');
	api.updateConsent(tcString, undefined, true);
	expect(await read()).toMatchObject({ gdprApplies: true, tcString });
});

test('getTCData has no unset status keys when the policy does not use TCF', async () => {
	const api = createCMPApi({ cmpId: 28, gdprApplies: false, gvl: completeGVL });
	disposers.push(api.destroy);
	const callback = vi.fn();
	window.__tcfapi?.('getTCData', 2, callback);
	await vi.waitFor(() => expect(callback).toHaveBeenCalled());
	expect(Object.keys(callback.mock.calls[0]?.[0]).toSorted()).toEqual([
		'cmpId',
		'cmpStatus',
		'cmpVersion',
		'gdprApplies',
		'tcfPolicyVersion',
	]);
});

test('withholds the TC string when the policy stops using TCF mid-decode', async () => {
	const tcString = await savedString();
	const api = createCMPApi({ cmpId: 28, gvl: completeGVL });
	disposers.push(api.destroy);
	api.updateConsent(tcString, undefined, true);
	const callback = vi.fn();
	window.__tcfapi?.('getTCData', 2, callback);
	// The string is still decoding when the policy changes.
	api.updateConsent(tcString, undefined, false);
	await vi.waitFor(() => expect(callback).toHaveBeenCalled());
	const [data] = callback.mock.calls[0] ?? [];
	expect(data.gdprApplies).toBe(false);
	expect(data).not.toHaveProperty('tcString');
});
