/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import {
	AD_TECH_PROVIDER_FETCH_TIMEOUT_MS,
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createIAB } from '../index';
import type { IABHandle } from '../index';
import {
	additionalConsentFor,
	decodeAdditionalConsent,
	encodeAdditionalConsent,
	fetchAdTechProviders,
} from '../tcf/additional-consent';
import type { TCData } from '../tcf/iab-tcf-types';
import { completeGVL } from './fixtures/gvl-sample';

describe('ACv2 string', () => {
	// The four examples in Google's specification, for providers 1, 2, 3, 4
	// and 10 disclosed.
	test.each([
		['seen, no decision', [], '2~~dv.1.2.3.4.10'],
		['all consented', [1, 2, 3, 4, 10], '2~1.2.3.4.10~dv.'],
		['all rejected', [], '2~~dv.1.2.3.4.10'],
		['1 and 10 consented', [1, 10], '2~1.10~dv.2.3.4'],
	])('encodes the spec example: %s', (_name, consented, expected) => {
		expect(
			encodeAdditionalConsent({ consented, disclosed: [10, 4, 3, 2, 1] })
		).toBe(expected);
	});

	test('round-trips through decode, including the dotless dv form', () => {
		expect(decodeAdditionalConsent('2~1.10~dv.2.3.4')).toEqual({
			consented: [1, 10],
			disclosed: [1, 2, 3, 4, 10],
		});
		expect(decodeAdditionalConsent('2~1.2~dv')).toEqual({
			consented: [1, 2],
			disclosed: [1, 2],
		});
	});

	test.each(['1~1.35.41', '2~1.x~dv.', '2~1~2', '2~~', '', '2~0~dv.'])(
		'rejects %j',
		(value) => {
			expect(decodeAdditionalConsent(value)).toBeNull();
		}
	);

	test('lists a provider as consented only with TCF purposes 1, 3 and 4', () => {
		const choices = { '2577': false, '89': true };
		expect(additionalConsentFor(choices, { 1: true, 3: true, 4: true })).toBe(
			'2~89~dv.2577'
		);
		for (const missing of [1, 3, 4]) {
			const purposes = { 1: true, 3: true, 4: true, [missing]: false };
			expect(additionalConsentFor(choices, purposes)).toBe('2~~dv.89.2577');
		}
	});

	test('builds no string when no provider was shown', () => {
		expect(additionalConsentFor({}, { 1: true, 3: true, 4: true })).toBe(
			undefined
		);
	});
});

describe('provider list', () => {
	const payload = {
		providers: {
			'2577': {
				id: 2577,
				name: 'Second',
				policyUrl: 'https://second.example/privacy',
			},
			'89': { id: 89, name: 'First', policyUrl: 'https://first.example/p' },
			'99': { id: 99, name: 'Unrequested', policyUrl: 'https://x.example' },
			bad: { id: 5, name: 'No URL', policyUrl: 'ftp://files.example/privacy' },
		},
	};

	test('requests only the configured IDs and shares concurrent requests', async () => {
		const fetchMock = vi.fn(() => Promise.resolve(Response.json(payload)));
		vi.stubGlobal('fetch', fetchMock);
		const [first, second] = await Promise.all([
			fetchAdTechProviders([2577, 89], 'https://lists.example/ac'),
			fetchAdTechProviders([89, 2577], 'https://lists.example/ac'),
		]);
		expect(first).toEqual(second);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://lists.example/ac?providerIds=89%2C2577',
			{ signal: expect.any(AbortSignal) }
		);
		vi.unstubAllGlobals();
	});
});

describe('createIAB with Additional Consent', () => {
	const NOW = Date.UTC(2026, 8, 5, 12);
	const PROVIDERS = {
		providers: {
			'2577': {
				id: 2577,
				name: 'Second Provider',
				policyUrl: 'https://second.example/privacy',
			},
			'89': {
				id: 89,
				name: 'First Provider',
				policyUrl: 'https://first.example/privacy',
			},
		},
	};
	const disposers: (() => void)[] = [];
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(NOW);
		localStorage.clear();
		for (const pair of document.cookie.split(';')) {
			const name = pair.split('=')[0]?.trim();
			if (name) {
				document.cookie = `${name}=; max-age=0; path=/`;
			}
		}
		fetchMock = vi.fn(() => Promise.resolve(Response.json(PROVIDERS)));
		vi.stubGlobal('fetch', fetchMock);
	});
	afterEach(() => {
		for (const dispose of disposers.splice(0)) {
			dispose();
		}
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	const makeKernel = function makeKernel(
		gvl = completeGVL,
		save?: ReturnType<typeof vi.fn>
	): ConsentKernel {
		const policy = normalizePolicyRule({
			id: 'iab-test',
			match: { isDefault: true },
			model: 'iab',
			prompt: 'choice',
			validity: { choiceDays: 30 },
		});
		const kernel = createConsentKernel({
			initialIab: { cmpId: 28, enabled: true, gvl },
			initialPolicyResolution: {
				fingerprints: createPolicyRuleFingerprints(policy),
				matchedBy: 'default',
				policy,
				policyId: policy.id,
				status: 'matched',
			},
			now: NOW,
			...(save && { transport: { save } }),
		});
		disposers.push(kernel.dispose);
		return kernel;
	};

	const mount = async function mount(
		kernel: ConsentKernel,
		providers: number[] = [89, 2577, 404],
		gvl = completeGVL
	): Promise<IABHandle> {
		const addon = createIAB({
			additionalConsent: { providers, url: 'https://lists.example/ac' },
			cmpId: 28,
			gvl,
			kernel,
		});
		disposers.push(addon.dispose);
		await addon.whenReady();
		return addon;
	};

	const tcData = () =>
		new Promise<TCData>((resolve) => {
			window.__tcfapi?.('getTCData', 2, (data) => resolve(data as TCData));
		});

	test('lists only the configured providers Google still lists', async () => {
		const kernel = makeKernel();
		await mount(kernel);
		expect(
			kernel.getSnapshot().iab?.adTechProviders?.map(({ id }) => id)
		).toEqual([89, 2577]);
		expect(fetchMock).toHaveBeenCalledWith(
			'https://lists.example/ac?providerIds=89%2C404%2C2577',
			{ signal: expect.any(AbortSignal) }
		);
	});

	test('publishes no AC string before the visitor saves', async () => {
		await mount(makeKernel());
		const data = await tcData();
		expect(data.tcString).toBe('');
		expect(data).not.toHaveProperty('addtlConsent');
	});

	test('Accept All consents to every provider and stores the string with the TC string', async () => {
		const addon = await mount(makeKernel());
		addon.acceptAll();
		await addon.save();
		const data = await tcData();
		expect(data.tcString).not.toBe('');
		expect(data.addtlConsent).toBe('2~89.2577~dv.');
		expect(document.cookie).toContain('addtl_consent=2~89.2577~dv.');
		expect(localStorage.getItem('addtl_consent')).toBe('2~89.2577~dv.');
	});

	test('sends the AC string with the TC string to the backend', async () => {
		const save = vi.fn().mockResolvedValue({ ok: true });
		const kernel = makeKernel(completeGVL, save);
		const addon = await mount(kernel);
		addon.acceptAll();
		await addon.save();
		const payload = save.mock.calls.at(-1)?.[0];
		expect(payload?.tcString).toBe(kernel.getSnapshot().iab?.tcString);
		expect(payload?.tcString).toBeTruthy();
		expect(payload?.addtlConsent).toBe('2~89.2577~dv.');
	});

	/** The sample list with no vendor declaring personalised ads. */
	const withoutPersonalisedAds = {
		...completeGVL,
		vendors: Object.fromEntries(
			Object.entries(completeGVL.vendors).map(([id, vendor]) => [
				id,
				{
					...vendor,
					legIntPurposes: vendor.legIntPurposes.filter((p) => p !== 4),
					purposes: vendor.purposes.filter((p) => p !== 4),
				},
			])
		),
	};

	test('Accept All grants the purposes providers need when no vendor declares them', async () => {
		const kernel = makeKernel(withoutPersonalisedAds);
		const addon = await mount(kernel, undefined, withoutPersonalisedAds);
		addon.acceptAll();
		await addon.save();
		expect(kernel.getSnapshot().iab?.purposeConsents[4]).toBe(true);
		expect((await tcData()).addtlConsent).toBe('2~89.2577~dv.');
	});

	test('Save Settings grants a provider whose purposes no vendor declares', async () => {
		const kernel = makeKernel(withoutPersonalisedAds);
		const addon = await mount(kernel, undefined, withoutPersonalisedAds);
		addon.rejectAll();
		for (const purpose of [1, 3, 4]) {
			addon.setPurposeConsent(purpose, true);
		}
		addon.setAdTechProviderConsent(89, true);
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~89~dv.2577');
	});

	test('Accept All without providers leaves undeclared purposes off', async () => {
		const kernel = makeKernel(withoutPersonalisedAds);
		const addon = await mount(kernel, [404], withoutPersonalisedAds);
		addon.acceptAll();
		await addon.save();
		expect(kernel.getSnapshot().iab?.purposeConsents[4]).toBe(false);
		expect(kernel.getSnapshot().iab?.purposeConsents[1]).toBe(true);
	});

	test('Reject All discloses every provider and consents to none', async () => {
		const addon = await mount(makeKernel());
		addon.rejectAll();
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~~dv.89.2577');
	});

	test('the useractioncomplete event carries the AC string', async () => {
		const addon = await mount(makeKernel());
		const events: TCData[] = [];
		window.__tcfapi?.('addEventListener', 2, (data) => {
			events.push(data as TCData);
		});

		addon.acceptAll();
		addon.setAdTechProviderConsent(2577, false);
		await addon.save();

		await vi.waitFor(() =>
			expect(
				events.some(({ eventStatus }) => eventStatus === 'useractioncomplete')
			).toBe(true)
		);
		const complete = events.find(
			({ eventStatus }) => eventStatus === 'useractioncomplete'
		);
		expect(complete?.tcString).not.toBe('');
		expect(complete?.addtlConsent).toBe('2~89~dv.2577');
	});

	test('a provider switched on without personalised-ads purposes is only disclosed', async () => {
		const addon = await mount(makeKernel());
		addon.acceptAll();
		addon.setPurposeConsent(4, false);
		addon.setAdTechProviderConsent(2577, false);
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~~dv.89.2577');

		addon.setPurposeConsent(4, true);
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~89~dv.2577');
	});

	test('a returning visitor gets the saved string and switches back', async () => {
		const first = makeKernel();
		const addon = await mount(first);
		addon.acceptAll();
		addon.setAdTechProviderConsent(2577, false);
		await addon.save();
		addon.dispose();
		first.dispose();

		const kernel = makeKernel();
		await mount(kernel);

		await vi.waitFor(() =>
			expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
		);
		expect(kernel.getSnapshot().iab?.adTechProviderConsents).toEqual({
			'2577': false,
			'89': true,
		});
		expect((await tcData()).addtlConsent).toBe('2~89~dv.2577');
	});

	test('drops a provider Google removed from its list after the save', async () => {
		const first = makeKernel();
		const addon = await mount(first);
		addon.acceptAll();
		await addon.save();
		addon.dispose();
		first.dispose();

		fetchMock.mockImplementation(() =>
			Promise.resolve(
				Response.json({ providers: { '89': PROVIDERS.providers['89'] } })
			)
		);
		const kernel = makeKernel();
		await mount(kernel, [89, 2577, 3]);
		await vi.waitFor(() =>
			expect(kernel.getSnapshot().iab?.authority).not.toBeNull()
		);
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		expect(localStorage.getItem('addtl_consent')).toBe('2~89~dv.');
		expect(document.cookie).toContain('addtl_consent=2~89~dv.');
	});

	test('a handle remounted on a live kernel drops a provider Google removed', async () => {
		const kernel = makeKernel();
		const first = await mount(kernel);
		first.acceptAll();
		await first.save();
		expect((await tcData()).addtlConsent).toBe('2~89.2577~dv.');
		first.dispose();

		fetchMock.mockImplementation(() =>
			Promise.resolve(
				Response.json({ providers: { '89': PROVIDERS.providers['89'] } })
			)
		);
		await mount(kernel);
		expect(kernel.getSnapshot().iab?.authority?.addtlConsent).toBe('2~89~dv.');
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		expect(localStorage.getItem('addtl_consent')).toBe('2~89~dv.');
		expect(document.cookie).toContain('addtl_consent=2~89~dv.');
	});

	test('a provider list replaced in place drops the removed provider', async () => {
		const kernel = makeKernel();
		const addon = await mount(kernel);
		addon.acceptAll();
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~89.2577~dv.');

		// A re-init that returns a shorter list keeps the GVL and reference.
		kernel.set.iab({ adTechProviders: [PROVIDERS.providers['89']] });
		await vi.waitFor(() =>
			expect(kernel.getSnapshot().iab?.authority?.addtlConsent).toBe('2~89~dv.')
		);
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		expect(localStorage.getItem('addtl_consent')).toBe('2~89~dv.');
		expect(document.cookie).toContain('addtl_consent=2~89~dv.');
	});

	test('withdrawing the TC string removes the stored AC string', async () => {
		const kernel = makeKernel();
		const addon = await mount(kernel);
		addon.acceptAll();
		await addon.save();
		expect(localStorage.getItem('addtl_consent')).not.toBeNull();

		kernel.set.iab({ authority: null });
		expect(localStorage.getItem('addtl_consent')).toBeNull();
		expect(document.cookie).not.toContain('addtl_consent=');
		expect(await tcData()).not.toHaveProperty('addtlConsent');
	});

	test('a provider list that fails to load leaves the TC string working', async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(new Response('', { status: 404 }))
		);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const addon = await mount(makeKernel());
		addon.acceptAll();
		await addon.save();
		const data = await tcData();
		expect(data.tcString).not.toBe('');
		expect(data).not.toHaveProperty('addtlConsent');
		expect(localStorage.getItem('addtl_consent')).toBeNull();
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Additional Consent is off'),
			expect.any(Error)
		);
	});

	test('a provider list that stalls gives up and lets the save through', async () => {
		const deadline = new AbortController();
		const timeout = vi
			.spyOn(AbortSignal, 'timeout')
			.mockReturnValue(deadline.signal);
		fetchMock.mockImplementation(
			(_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(init.signal?.reason)
					);
				})
		);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const kernel = makeKernel();
		const addon = createIAB({
			additionalConsent: { providers: [89], url: 'https://lists.example/ac' },
			cmpId: 28,
			gvl: completeGVL,
			kernel,
		});
		disposers.push(addon.dispose);
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		deadline.abort(
			new DOMException('The operation timed out.', 'TimeoutError')
		);
		await addon.whenReady();
		addon.acceptAll();
		await addon.save();
		expect(timeout).toHaveBeenCalledWith(AD_TECH_PROVIDER_FETCH_TIMEOUT_MS);
		expect((await tcData()).tcString).not.toBe('');
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Additional Consent is off'),
			expect.anything()
		);
	});

	/** Holds the provider list until the test releases it. */
	const holdProviderList = () => {
		let release!: () => void;
		const released = new Promise<void>((resolve) => {
			release = resolve;
		});
		fetchMock.mockImplementation(async () => {
			await released;
			return Response.json(PROVIDERS);
		});
		return release;
	};

	test('Accept All before the provider list lands consents to every provider', async () => {
		const release = holdProviderList();
		const kernel = makeKernel();
		const addon = createIAB({
			additionalConsent: {
				providers: [89, 2577],
				url: 'https://lists.example/ac',
			},
			cmpId: 28,
			gvl: completeGVL,
			kernel,
		});
		disposers.push(addon.dispose);
		addon.acceptAll();
		const saved = addon.save();
		release();
		await saved;
		expect(kernel.getSnapshot().iab?.adTechProviderConsents).toEqual({
			'2577': true,
			'89': true,
		});
		expect((await tcData()).addtlConsent).toBe('2~89.2577~dv.');
	});

	test('Accept All before the provider list lands grants the purposes providers need', async () => {
		const release = holdProviderList();
		const kernel = makeKernel(withoutPersonalisedAds);
		const addon = createIAB({
			additionalConsent: {
				providers: [89, 2577],
				url: 'https://lists.example/ac',
			},
			cmpId: 28,
			gvl: withoutPersonalisedAds,
			kernel,
		});
		disposers.push(addon.dispose);
		addon.acceptAll();
		const saved = addon.save();
		release();
		await saved;
		expect(kernel.getSnapshot().iab?.purposeConsents[4]).toBe(true);
		expect((await tcData()).addtlConsent).toBe('2~89.2577~dv.');
	});

	test('a provider switched off before the list lands stays off', async () => {
		const release = holdProviderList();
		const kernel = makeKernel();
		kernel.set.iab({ adTechProviders: [PROVIDERS.providers['89']] });
		const addon = createIAB({
			additionalConsent: {
				providers: [89, 2577],
				url: 'https://lists.example/ac',
			},
			cmpId: 28,
			gvl: completeGVL,
			kernel,
		});
		disposers.push(addon.dispose);
		addon.acceptAll();
		addon.setAdTechProviderConsent(89, false);
		const saved = addon.save();
		release();
		await saved;
		expect((await tcData()).addtlConsent).toBe('2~2577~dv.89');
	});

	test('a purpose switched off after Accept All stays off when the providers land', async () => {
		const release = holdProviderList();
		const kernel = makeKernel();
		const addon = createIAB({
			additionalConsent: {
				providers: [89, 2577],
				url: 'https://lists.example/ac',
			},
			cmpId: 28,
			gvl: completeGVL,
			kernel,
		});
		disposers.push(addon.dispose);
		addon.acceptAll();
		addon.setPurposeConsent(4, false);
		const saved = addon.save();
		release();
		await saved;
		const data = await tcData();
		expect(data.purpose.consents[4]).toBe(false);
		expect(data.purpose.consents[1]).toBe(true);
		// Providers need purpose 4, so they are disclosed and not consented.
		expect(kernel.getSnapshot().iab?.adTechProviderConsents).toEqual({
			'2577': false,
			'89': false,
		});
		expect(data.addtlConsent).toBe('2~~dv.89.2577');
	});

	test('Save Settings discloses only the providers shown when it was clicked', async () => {
		const release = holdProviderList();
		const kernel = makeKernel();
		kernel.set.iab({ adTechProviders: [PROVIDERS.providers['89']] });
		const addon = createIAB({
			additionalConsent: {
				providers: [89, 2577],
				url: 'https://lists.example/ac',
			},
			cmpId: 28,
			gvl: completeGVL,
			kernel,
		});
		disposers.push(addon.dispose);
		for (const purpose of [1, 3, 4]) {
			addon.setPurposeConsent(purpose, true);
		}
		addon.setAdTechProviderConsent(89, true);
		const saved = addon.save();
		release();
		await saved;
		expect(
			kernel.getSnapshot().iab?.adTechProviders?.map(({ id }) => id)
		).toEqual([89, 2577]);
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		expect(localStorage.getItem('addtl_consent')).toBe('2~89~dv.');

		// Shown now, so the next save discloses it.
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~89~dv.2577');
	});

	test('uses providers the backend put in the kernel without fetching', async () => {
		const kernel = makeKernel();
		kernel.set.iab({
			adTechProviders: [PROVIDERS.providers['89']],
		});
		const addon = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
		disposers.push(addon.dispose);
		await addon.whenReady();
		addon.acceptAll();
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('an empty client list replaces the backend providers', async () => {
		const kernel = makeKernel();
		kernel.set.iab({ adTechProviders: [PROVIDERS.providers['89']] });
		const backendOnly = createIAB({ cmpId: 28, gvl: completeGVL, kernel });
		disposers.push(backendOnly.dispose);
		await backendOnly.whenReady();
		backendOnly.acceptAll();
		await backendOnly.save();
		expect((await tcData()).addtlConsent).toBe('2~89~dv.');
		backendOnly.dispose();

		const addon = await mount(kernel, []);
		expect(kernel.getSnapshot().iab?.adTechProviders).toEqual([]);
		expect(await tcData()).not.toHaveProperty('addtlConsent');
		addon.acceptAll();
		await addon.save();
		expect(await tcData()).not.toHaveProperty('addtlConsent');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('keeps backend providers when the client list fails to load', async () => {
		fetchMock.mockImplementation(() =>
			Promise.resolve(new Response('', { status: 500 }))
		);
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const kernel = makeKernel();
		kernel.set.iab({ adTechProviders: [PROVIDERS.providers['2577']] });
		const addon = await mount(kernel);
		expect(kernel.getSnapshot().iab?.adTechProviders).toEqual([
			PROVIDERS.providers['2577'],
		]);
		addon.rejectAll();
		await addon.save();
		expect((await tcData()).addtlConsent).toBe('2~~dv.2577');
	});

	test('fetches nothing without configured providers', async () => {
		const addon = createIAB({
			cmpId: 28,
			gvl: completeGVL,
			kernel: makeKernel(),
		});
		disposers.push(addon.dispose);
		await addon.whenReady();
		addon.acceptAll();
		await addon.save();
		expect(fetchMock).not.toHaveBeenCalled();
		expect(await tcData()).not.toHaveProperty('addtlConsent');
	});
});
