/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel, KernelConfig } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { GppModel } from '@iabgpp/cmpapi';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createGPP, destroyGPPStub, initializeGPPStub } from '../gpp';
import type { GPPEventData, GPPHandle, GPPPingData } from '../gpp';
import { createIAB } from '../index';
import { completeGVL } from './fixtures/gvl-sample';

const NOW = Date.UTC(2026, 8, 5, 12);
const disposers: (() => void)[] = [];

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
});
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	destroyGPPStub();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const US_OPT_OUT: Omit<PolicyRule, 'id'> = {
	match: { isDefault: true },
	model: 'opt-out',
	privacySignals: { gpc: { denyCategories: ['marketing', 'measurement'] } },
	prompt: 'none',
	rights: ['preferences'],
	validity: { choiceDays: 365 },
};

const makeKernel = function makeKernel(
	rule: Omit<PolicyRule, 'id'>,
	config: Partial<KernelConfig> = {}
): ConsentKernel {
	const policy = normalizePolicyRule({ ...rule, id: 'gpp-test' });
	const kernel = createConsentKernel({
		initialPolicyResolution: {
			fingerprints: createPolicyRuleFingerprints(policy),
			matchedBy: 'default',
			policy,
			policyId: policy.id,
			status: 'matched',
		},
		now: NOW,
		...config,
	});
	disposers.push(kernel.dispose);
	return kernel;
};

const mount = function mount(
	options: Parameters<typeof createGPP>[0]
): GPPHandle {
	const handle = createGPP(options);
	disposers.push(handle.dispose);
	return handle;
};

const call = function call<DataType>(
	command: string,
	parameter?: unknown
): { data: DataType; success: boolean } {
	let result: { data: DataType; success: boolean } | undefined;
	window.__gpp?.(
		command,
		(data, success) => {
			result = { data: data as DataType, success };
		},
		parameter
	);
	if (!result) {
		throw new Error(`__gpp('${command}') did not answer synchronously`);
	}
	return result;
};

const ping = (): GPPPingData => call<GPPPingData>('ping').data;

const listen = function listen(): GPPEventData[] {
	const events: GPPEventData[] = [];
	window.__gpp?.('addEventListener', (data) => {
		events.push(data as GPPEventData);
	});
	return events;
};

describe('createGPP: US state sections', () => {
	test('a California visitor who has not opted out', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
		});
		mount({ kernel });

		const data = ping();
		expect(data).toMatchObject({
			applicableSections: [8],
			cmpDisplayStatus: 'hidden',
			cmpId: 1,
			cmpStatus: 'loaded',
			gppVersion: '1.1',
			sectionList: [8],
			signalStatus: 'ready',
		});
		expect(data.supportedAPIs).toContain('8:usca');
		expect(data.supportedAPIs).not.toContain('7:usnat');

		const decoded = new GppModel(data.gppString);
		expect(decoded.getSection('usca')).toMatchObject({
			Gpc: false,
			MspaCoveredTransaction: 2,
			MspaOptOutOptionMode: 0,
			MspaServiceProviderMode: 0,
			SaleOptOut: 2,
			SaleOptOutNotice: 1,
			SharingOptOut: 2,
			SharingOptOutNotice: 1,
		});
		expect(call('getField', 'usca.SaleOptOut')).toEqual({
			data: 2,
			success: true,
		});
		expect(call('getField', 'usca.Gpc').data).toBe(false);
		expect(call('getField', 'usnat.SaleOptOut').data).toBeNull();
		expect(call('hasSection', 'usca').data).toBe(true);
		expect(call('hasSection', 'usnat').data).toBe(false);
		const [core, gpc] = call<Record<string, unknown>[]>(
			'getSection',
			'usca'
		).data;
		expect(core).toMatchObject({ SaleOptOut: 2, Version: 1 });
		expect(gpc).toEqual({ Gpc: false, SubsectionType: 1 });
		expect(data.parsedSections.usca).toEqual([core, gpc]);
	});

	test('an opt-out is signalled in the events order the spec requires', async () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'US-CA' },
		});
		mount({ kernel });
		const events = listen();

		await kernel.commands.save({ marketing: false });

		expect(events.map(({ eventName, data }) => [eventName, data])).toEqual([
			['listenerRegistered', true],
			['signalStatus', 'not ready'],
			['sectionChange', 'usca'],
			['signalStatus', 'ready'],
		]);
		const decoded = new GppModel(ping().gppString);
		expect(decoded.getFieldValue('usca', 'SaleOptOut')).toBe(1);
		expect(decoded.getFieldValue('usca', 'SharingOptOut')).toBe(1);
		expect(events.at(-1)?.pingData.gppString).toBe(ping().gppString);
	});

	test('a GPC signal opts out and sets the GPC subsection', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CO' },
			initialPrivacySignals: { gpc: true },
		});
		mount({ kernel });

		const decoded = new GppModel(ping().gppString);
		expect(ping().applicableSections).toEqual([10]);
		expect(decoded.getFieldValue('usco', 'SaleOptOut')).toBe(1);
		expect(decoded.getFieldValue('usco', 'TargetedAdvertisingOptOut')).toBe(1);
		expect(decoded.getFieldValue('usco', 'Gpc')).toBe(true);
	});

	test('an opt-in policy reports an opt-out until marketing is granted', async () => {
		const kernel = makeKernel(
			{ ...US_OPT_OUT, model: 'opt-in', prompt: 'choice', rights: undefined },
			{ initialLocation: { countryCode: 'US', regionCode: 'VA' } }
		);
		kernel.set.activeUI('none');
		mount({ kernel });
		expect(
			new GppModel(ping().gppString).getFieldValue('usva', 'SaleOptOut')
		).toBe(1);

		await kernel.commands.save({ marketing: true });
		expect(
			new GppModel(ping().gppString).getFieldValue('usva', 'SaleOptOut')
		).toBe(2);
	});

	test.each([
		['an unknown region', null],
		['a state without a section', 'NY'],
		['a state c15t does not encode yet', 'MD'],
	])('a US visitor in %s gets usnat', (_, regionCode) => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode },
		});
		mount({ kernel });
		expect(ping()).toMatchObject({
			applicableSections: [7],
			sectionList: [7],
			signalStatus: 'ready',
		});
		expect(new GppModel(ping().gppString).getSection('usnat')).toMatchObject({
			MspaCoveredTransaction: 2,
			SaleOptOut: 2,
			SaleOptOutNotice: 1,
			SharingNotice: 1,
		});
	});

	test('a visitor outside the US gets no section', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'DE', regionCode: 'BE' },
		});
		const handle = mount({ kernel });
		expect(ping()).toMatchObject({
			applicableSections: [-1],
			gppString: '',
			sectionList: [],
			signalStatus: 'ready',
		});
		expect(handle.getGPPString()).toBe('');
	});

	test('a rule that offers no opt-out gets no section, wherever the visitor is', () => {
		const kernel = makeKernel(
			{ match: { isDefault: true }, model: 'none', prompt: 'none' },
			{
				initialLocation: { countryCode: 'US', regionCode: 'CA' },
				initialPrivacySignals: { gpc: true },
			}
		);
		mount({ kernel });
		expect(ping()).toMatchObject({
			applicableSections: [-1],
			gppString: '',
			signalStatus: 'ready',
		});
	});

	test.each([
		[
			'a none rule with only the preferences right',
			{
				match: { isDefault: true },
				model: 'none',
				prompt: 'none',
				rights: ['preferences'],
			} satisfies Omit<PolicyRule, 'id'>,
			2,
		],
		['an opt-out rule, which has the disclosure right', US_OPT_OUT, 1],
	])('the processing notice follows %s', (_, rule, notice) => {
		const kernel = makeKernel(rule, {
			initialLocation: { countryCode: 'US', regionCode: 'TX' },
		});
		mount({ kernel });
		expect(ping().applicableSections).toEqual([16]);
		expect(new GppModel(ping().gppString).getSection('ustx')).toMatchObject({
			ProcessingNotice: notice,
			SaleOptOut: 2,
			SaleOptOutNotice: 1,
		});
	});

	test('a developer override of the location wins', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'DE', regionCode: null },
		});
		mount({ kernel });
		expect(ping().applicableSections).toEqual([-1]);

		kernel.set.overrides({ country: 'US', region: 'TX' });
		expect(ping().applicableSections).toEqual([16]);
	});
});

describe('createGPP: options', () => {
	test('the national approach uses usnat for every US visitor', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'NY' },
		});
		mount({
			cmpId: 28,
			kernel,
			mspaMode: 'opt-out-option',
			usApproach: 'national',
		});

		const data = ping();
		expect(data.cmpId).toBe(28);
		expect(data.applicableSections).toEqual([7]);
		expect(data.supportedAPIs).toContain('7:usnat');
		expect(data.supportedAPIs).not.toContain('8:usca');
		expect(new GppModel(data.gppString).getSection('usnat')).toMatchObject({
			MspaCoveredTransaction: 1,
			MspaOptOutOptionMode: 1,
			MspaServiceProviderMode: 2,
			SaleOptOut: 2,
			SharingNotice: 1,
			Version: 2,
		});
	});

	test('service provider mode reports the opt-outs as not applicable', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
		});
		mount({ kernel, mspaMode: 'service-provider' });
		expect(new GppModel(ping().gppString).getSection('usca')).toMatchObject({
			MspaCoveredTransaction: 1,
			MspaOptOutOptionMode: 2,
			MspaServiceProviderMode: 1,
			SaleOptOut: 0,
			SaleOptOutNotice: 0,
		});
	});

	test('opt-out categories decide which refusal opts out', async () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
		});
		mount({ kernel, optOutCategories: ['measurement'] });
		await kernel.commands.save({ marketing: false, measurement: true });
		expect(call('getField', 'usca.SaleOptOut').data).toBe(2);
		await kernel.commands.save({ marketing: true, measurement: false });
		expect(call('getField', 'usca.SaleOptOut').data).toBe(1);
	});

	test('rejects a cmpId that is neither 1 nor a registered ID', () => {
		const kernel = makeKernel(US_OPT_OUT);
		expect(() => createGPP({ cmpId: 0, kernel })).toThrow(/cmpId/u);
		expect(() => createGPP({ cmpId: 5000, kernel })).toThrow(/cmpId/u);
		expect(window.__gpp).toBeUndefined();
	});
});

describe('createGPP: CMP lifecycle', () => {
	test('waits while the policy is pending', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
			initialPolicyPending: true,
		});
		mount({ kernel });
		expect(ping()).toMatchObject({
			applicableSections: [0],
			gppString: '',
			signalStatus: 'not ready',
		});
	});

	test('waits while the banner or dialog is open', () => {
		const kernel = makeKernel(
			{ ...US_OPT_OUT, prompt: 'notice', rights: undefined },
			{ initialLocation: { countryCode: 'US', regionCode: 'CA' } }
		);
		kernel.set.activeUI('banner');
		mount({ kernel });
		const events = listen();
		expect(ping()).toMatchObject({
			cmpDisplayStatus: 'visible',
			signalStatus: 'not ready',
		});

		kernel.set.activeUI('none');
		expect(
			events.slice(1).map(({ eventName, data }) => [eventName, data])
		).toEqual([
			['cmpDisplayStatus', 'hidden'],
			['signalStatus', 'ready'],
		]);

		kernel.set.activeUI('dialog');
		expect(
			events.slice(3).map(({ eventName, data }) => [eventName, data])
		).toEqual([
			['signalStatus', 'not ready'],
			['cmpDisplayStatus', 'visible'],
		]);
	});

	test('takes over calls and listeners a stub queued', () => {
		initializeGPPStub();
		expect(
			document.querySelector('iframe[name="__gppLocator"]')
		).not.toBeNull();
		const stubPing = call<GPPPingData>('ping').data;
		expect(stubPing).toMatchObject({
			cmpStatus: 'stub',
			signalStatus: 'not ready',
		});
		const events = listen();
		const queued = vi.fn();
		window.__gpp?.('usca.customCommand', queued);
		expect(queued).not.toHaveBeenCalled();
		expect(call('getSection', 'usca').data).toBeNull();

		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
		});
		mount({ kernel });

		expect(queued).toHaveBeenCalledWith(null, false);
		expect(events.map(({ eventName, data }) => [eventName, data])).toEqual([
			['listenerRegistered', true],
			['cmpStatus', 'loaded'],
			['sectionChange', 'usca'],
			['signalStatus', 'ready'],
		]);
		expect(events.every(({ listenerId }) => listenerId === 1)).toBe(true);
		const removed = call<boolean>('removeEventListener', 1);
		expect(removed).toEqual({ data: true, success: true });
		expect(call<boolean>('removeEventListener', 1).data).toBe(false);
	});

	test('answers frames through postMessage', () => {
		const kernel = makeKernel(US_OPT_OUT, {
			initialLocation: { countryCode: 'US', regionCode: 'CA' },
		});
		mount({ kernel });
		const reply = vi.fn();
		const source = { postMessage: reply } as unknown as Window;
		window.dispatchEvent(
			new MessageEvent('message', {
				data: JSON.stringify({
					__gppCall: {
						callId: 'a',
						command: 'getField',
						parameter: 'usca.SaleOptOut',
					},
				}),
			})
		);
		const event = new MessageEvent('message', {
			data: { __gppCall: { callId: 7, command: 'ping', version: '1.1' } },
		});
		Object.defineProperty(event, 'source', { value: source });
		window.dispatchEvent(event);

		expect(reply).toHaveBeenCalledWith(
			{
				__gppReturn: {
					callId: 7,
					returnValue: expect.objectContaining({ applicableSections: [8] }),
					success: true,
				},
			},
			'*'
		);
	});

	test('dispose removes __gpp and the locator frame', () => {
		const kernel = makeKernel(US_OPT_OUT);
		const handle = createGPP({ kernel });
		expect(typeof window.__gpp).toBe('function');
		handle.dispose();
		expect(window.__gpp).toBeUndefined();
		expect(document.querySelector('iframe[name="__gppLocator"]')).toBeNull();
	});
});

describe('createGPP: TCF EU section', () => {
	const makeIABKernel = () =>
		makeKernel(
			{
				match: { isDefault: true },
				model: 'iab',
				prompt: 'choice',
				validity: { choiceDays: 1 },
			},
			{ initialIab: { cmpId: 28, enabled: true, gvl: completeGVL } }
		);

	test('carries the TC String the TCF CMP confirmed', async () => {
		const kernel = makeIABKernel();
		const iab = createIAB({
			cmpId: 28,
			gvl: completeGVL,
			kernel,
			persistence: false,
		});
		disposers.push(iab.dispose);
		await iab.whenReady();
		kernel.set.activeUI('none');
		mount({ kernel });
		expect(ping()).toMatchObject({
			applicableSections: [2],
			cmpId: 28,
			gppString: '',
			signalStatus: 'ready',
		});
		expect(ping().supportedAPIs).toContain('2:tcfeuv2');

		const events = listen();
		iab.acceptAll();
		await iab.save();
		await vi.waitFor(() => expect(ping().sectionList).toEqual([2]));

		const tcString = kernel.getSnapshot().iab?.authority?.tcString;
		expect(tcString).toBeTruthy();
		const data = ping();
		expect(data.gppString.split('~')[1]).toBe(tcString);
		const decoded = new GppModel(data.gppString);
		expect(decoded.getFieldValue('tcfeuv2', 'CmpId')).toBe(28);
		const [core] = data.parsedSections.tcfeuv2 ?? [];
		expect(core).toMatchObject({
			CmpId: 28,
			PurposeConsents: decoded.getFieldValue('tcfeuv2', 'PurposeConsents'),
			VendorConsents: decoded.getFieldValue('tcfeuv2', 'VendorConsents'),
			VendorListVersion: completeGVL.vendorListVersion,
		});
		expect(call('getField', 'tcfeuv2.CmpId').data).toBe(28);
		expect(events.at(-1)).toMatchObject({
			data: 'ready',
			eventName: 'signalStatus',
		});
		expect(events.map(({ eventName }) => eventName)).toContain('sectionChange');
	});

	test('can leave TCF out', () => {
		const kernel = makeIABKernel();
		kernel.set.activeUI('none');
		mount({ kernel, tcf: false });
		expect(ping()).toMatchObject({
			applicableSections: [-1],
			signalStatus: 'ready',
		});
		expect(ping().supportedAPIs).not.toContain('2:tcfeuv2');
	});
});
