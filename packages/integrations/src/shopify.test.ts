/** @vitest-environment jsdom */
import { createConsentKernel, resolvePolicyRules } from '@c15t/core';
import type { ConsentKernel, KernelTransport } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShopifyCustomerPrivacy } from './shopify';
import type {
	ShopifyConsentPreferences,
	ShopifyConsentSnapshot,
} from './shopify';

const ALL_DENIED: ShopifyConsentPreferences = {
	analytics: false,
	marketing: false,
	preferences: false,
	sale_of_data: false,
};
const ALL_GRANTED: ShopifyConsentPreferences = {
	analytics: true,
	marketing: true,
	preferences: true,
	sale_of_data: true,
};

const kernels: ConsentKernel[] = [];
afterEach(() => {
	for (const kernel of kernels.splice(0)) {
		kernel.dispose();
	}
	delete (window as { Shopify?: unknown }).Shopify;
	vi.restoreAllMocks();
	vi.clearAllTimers();
	vi.useRealTimers();
});

// Retries wait on timers. Faking them keeps a pending retry from firing
// during a later test.
const fakeRetryTimers = () => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
};

const rule = (model: 'opt-in' | 'opt-out') =>
	resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				categories: ['functionality', 'marketing', 'measurement'],
				id: model,
				match: { isDefault: true },
				model,
				prompt: 'choice',
				scopeMode: 'permissive',
			},
		],
	});

const kernelWith = (
	model: 'opt-in' | 'opt-out',
	config: Parameters<typeof createConsentKernel>[0] = {}
) => {
	const kernel = createConsentKernel({
		consentCategories: ['functionality', 'marketing', 'measurement'],
		initialPolicyResolution: rule(model),
		...config,
	});
	kernels.push(kernel);
	return kernel;
};

/**
 * Installs `window.Shopify.customerPrivacy` the way the v0.2 script does.
 * `respond` stands in for Shopify's server: it throws or rejects to fail.
 * Like the real script, the mock then calls back with `(null, response)` or
 * `({ error: message })`, and its returned promise fulfills either way.
 */
const installCustomerPrivacy = (
	respond: (consent: ShopifyConsentPreferences) => unknown = () => undefined
) => {
	const sent: ShopifyConsentPreferences[] = [];
	const setTrackingConsent = vi.fn(
		async (
			consent: ShopifyConsentPreferences,
			reply: (result: unknown, response?: unknown) => void
		) => {
			sent.push(consent);
			let response: unknown;
			try {
				response = await respond(consent);
			} catch (error) {
				reply({ error: error instanceof Error ? error.message : error });
				return;
			}
			reply(null, response);
			return response;
		}
	);
	(window as { Shopify?: unknown }).Shopify = {
		customerPrivacy: { setTrackingConsent },
	};
	return { sent, setTrackingConsent };
};

const isSettled = async (promise: Promise<unknown>) => {
	let settled = false;
	void promise.then(() => {
		settled = true;
	});
	if (vi.isFakeTimers()) {
		await vi.advanceTimersByTimeAsync(0);
	} else {
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	}
	return settled;
};

describe('Shopify Customer Privacy bridge', () => {
	it('sends nothing before an opt-in visitor answers, then sends Reject All and releases Hydrogen', async () => {
		const shopify = installCustomerPrivacy();
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();

		expect(await isSettled(setup)).toBe(false);
		expect(shopify.sent).toEqual([]);

		// Rejecting leaves effective permissions unchanged, so a script
		// callback would not fire. The bridge still has to send it.
		await kernel.commands.save('none');

		await setup;
		expect(shopify.sent).toEqual([ALL_DENIED]);
	});

	it('resolves setup only after Shopify accepts the choice', async () => {
		let accept: () => void = () => {};
		installCustomerPrivacy(
			() =>
				new Promise<void>((resolve) => {
					accept = resolve;
				})
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		expect(await isSettled(setup)).toBe(false);

		accept();
		expect(await isSettled(setup)).toBe(true);
	});

	it('maps categories and lets callers override them', async () => {
		const shopify = installCustomerPrivacy();
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({
			categories: { sale_of_data: 'measurement' },
		});
		bridge.connect(kernel);

		await kernel.commands.save({
			functionality: false,
			marketing: false,
			measurement: true,
		});
		await bridge.setup();

		expect(shopify.sent).toEqual([
			{
				analytics: true,
				marketing: false,
				preferences: false,
				sale_of_data: true,
			},
		]);
	});

	it('waits for the policy, then leaves an untouched opt-out visitor to Shopify', async () => {
		const shopify = installCustomerPrivacy();
		let resolveInit: () => void = () => {};
		const transport: KernelTransport = {
			init: () =>
				new Promise((resolve) => {
					resolveInit = () =>
						resolve({ policyResolution: { ...rule('opt-out'), version: 1 } });
				}),
		};
		const kernel = kernelWith('opt-in', {
			initialPolicyPending: true,
			transport,
		});
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();
		const init = kernel.commands.init();

		expect(await isSettled(setup)).toBe(false);

		resolveInit();
		await init;
		// Shopify records consent only on a visitor interaction, and applies
		// its own region defaults until then.
		expect(await isSettled(setup)).toBe(true);
		expect(shopify.sent).toEqual([]);

		await kernel.commands.save({ marketing: false });
		await vi.waitFor(() =>
			expect(shopify.sent).toEqual([
				{
					analytics: true,
					marketing: false,
					preferences: true,
					sale_of_data: false,
				},
			])
		);
	});

	it.each(['consentTrackingApiLoaded', 'shopifyCustomerPrivacyApiLoaded'])(
		'waits for the Customer Privacy API to load (%s)',
		async (event) => {
			const kernel = kernelWith('opt-in');
			const bridge = createShopifyCustomerPrivacy();
			bridge.connect(kernel);
			await kernel.commands.save('all');

			const shopify = installCustomerPrivacy();
			expect(shopify.sent).toEqual([]);

			document.dispatchEvent(new Event(event));
			await vi.waitFor(() => expect(shopify.sent).toEqual([ALL_GRANTED]));
			await bridge.setup();
			expect(shopify.sent).toEqual([ALL_GRANTED]);
		}
	);

	it('sends each later change once', async () => {
		const shopify = installCustomerPrivacy();
		const kernel = kernelWith('opt-in');
		const onSync = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onSync });
		bridge.connect(kernel);

		await kernel.commands.save('all');
		await bridge.setup();
		bridge.update(kernel.getSnapshot());
		await kernel.commands.save({ marketing: false });
		await vi.waitFor(() => expect(onSync).toHaveBeenCalledTimes(2));

		expect(shopify.sent).toHaveLength(2);
		expect(shopify.sent[1]).toEqual({
			analytics: true,
			marketing: false,
			preferences: true,
			sale_of_data: false,
		});
	});

	it('revokes the grants Shopify has when an opt-in choice expires', async () => {
		const shopify = installCustomerPrivacy();
		const kernel = kernelWith('opt-in');
		const onSync = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onSync });
		bridge.connect(kernel);

		await kernel.commands.save('all');
		await bridge.setup();
		expect(shopify.sent).toEqual([ALL_GRANTED]);

		// Hydrogen has released its events, so Shopify would keep using the
		// expired grants until the visitor answers the banner again.
		const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
		const expired = kernel.refresh(Date.now() + twoYears);
		expect(expired.promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		await vi.waitFor(() => expect(onSync).toHaveBeenCalledTimes(2));

		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_DENIED]);
	});

	it('revokes the grants Shopify has on a page load after an opt-in choice expired', async () => {
		const shopify = installCustomerPrivacy();
		const lastVisit = kernelWith('opt-in');
		await lastVisit.commands.save('all');
		const { explicitChoice } = lastVisit.getSnapshot();

		// A new page builds a new bridge, with the stored choice now expired.
		const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
		const kernel = kernelWith('opt-in', {
			initialRecords: { choice: explicitChoice, now: Date.now() + twoYears },
		});
		expect(kernel.getSnapshot().promptRequirement).toEqual({
			kind: 'choice',
			reason: 'expired',
		});
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();

		await vi.waitFor(() => expect(shopify.sent).toEqual([ALL_DENIED]));
		// The visitor still owes a choice, so Hydrogen keeps holding events.
		expect(await isSettled(setup)).toBe(false);
	});

	it('revokes grants Shopify reports when an IAB visitor owes a choice c15t has no record of', async () => {
		const shopify = installCustomerPrivacy();
		let held: Record<string, string> = {
			analytics: '',
			marketing: '',
			preferences: '',
			sale_of_data: '',
		};
		Object.assign(
			(window as { Shopify: { customerPrivacy: object } }).Shopify
				.customerPrivacy,
			{ currentVisitorConsent: () => held }
		);
		// IAB consent confirmed through the CMP API leaves no explicit choice.
		const owesChoice: ShopifyConsentSnapshot = {
			effectivePermissions: {
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			explicitChoice: null,
			model: 'iab',
			policyPending: false,
			promptRequirement: { kind: 'choice', reason: 'policy-changed' },
		};
		const bridge = createShopifyCustomerPrivacy();
		const setup = bridge.setup();

		bridge.update(owesChoice);
		await isSettled(setup);
		expect(shopify.sent).toEqual([]);

		held = { ...held, analytics: 'yes', marketing: 'no' };
		bridge.update({ ...owesChoice });

		await vi.waitFor(() =>
			expect(shopify.sent).toEqual([{ analytics: false }])
		);
		expect(await isSettled(setup)).toBe(false);
	});

	it('releases Hydrogen when a policy change drops a pending revocation for untouched opt-out', async () => {
		const shopify = installCustomerPrivacy();
		const bridge = createShopifyCustomerPrivacy();
		const setup = bridge.setup();

		bridge.update({
			effectivePermissions: {
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			explicitChoice: null,
			model: 'opt-in',
			policyPending: false,
			promptRequirement: { kind: 'choice', reason: 'policy-changed' },
		});
		expect(await isSettled(setup)).toBe(false);

		bridge.update({
			effectivePermissions: {
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			explicitChoice: null,
			model: 'opt-out',
			policyPending: false,
			promptRequirement: { kind: 'none' },
		});

		expect(await isSettled(setup)).toBe(true);
		expect(shopify.sent).toEqual([]);
	});

	it('drops only the grants c15t denies before releasing an opt-out visitor to Shopify', async () => {
		const shopify = installCustomerPrivacy();
		Object.assign(
			(window as { Shopify: { customerPrivacy: object } }).Shopify
				.customerPrivacy,
			{
				// Unset signals keep Shopify's region defaults.
				currentVisitorConsent: () => ({
					analytics: '',
					marketing: 'yes',
					preferences: '',
					sale_of_data: 'yes',
				}),
			}
		);
		const bridge = createShopifyCustomerPrivacy();
		const setup = bridge.setup();

		// GPC denies marketing under opt-out, and the visitor owes a choice.
		bridge.update({
			effectivePermissions: {
				functionality: true,
				marketing: false,
				measurement: true,
				necessary: true,
			},
			explicitChoice: null,
			model: 'opt-out',
			policyPending: false,
			promptRequirement: { kind: 'choice', reason: 'policy-changed' },
		});

		await setup;
		expect(shopify.sent).toEqual([{ marketing: false, sale_of_data: false }]);
	});

	it('drops a queued choice when the visitor moves to untouched opt-out', async () => {
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();

		// The choice waits for the Customer Privacy API to load.
		await kernel.commands.save('all');
		bridge.update({
			effectivePermissions: {
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			explicitChoice: null,
			model: 'opt-out',
			policyPending: false,
			promptRequirement: { kind: 'none' },
		});
		const shopify = installCustomerPrivacy();
		document.dispatchEvent(new Event('consentTrackingApiLoaded'));

		await setup;
		expect(shopify.sent).toEqual([]);
	});

	it('cancels a scheduled retry when the policy becomes pending', async () => {
		fakeRetryTimers();
		const shopify = installCustomerPrivacy(() =>
			Promise.reject(new Error('consent domain'))
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: () => {} });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.waitFor(() => expect(shopify.sent).toHaveLength(1));
		bridge.update({ ...kernel.getSnapshot(), policyPending: true });
		await vi.advanceTimersByTimeAsync(10_000);

		expect(shopify.sent).toHaveLength(1);
		expect(await isSettled(setup)).toBe(false);
	});

	it('gives a choice fresh retries after the policy was pending', async () => {
		fakeRetryTimers();
		let failuresLeft = 5;
		const shopify = installCustomerPrivacy(() => {
			if (failuresLeft > 0) {
				failuresLeft -= 1;
				return Promise.reject(new Error('network'));
			}
			return Promise.resolve();
		});
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn() });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(7000);
		// The first try and three retries.
		expect(shopify.sent).toHaveLength(4);

		bridge.update({ ...kernel.getSnapshot(), policyPending: true });
		bridge.update(kernel.getSnapshot());
		await vi.waitFor(() => expect(shopify.sent).toHaveLength(5));
		await vi.advanceTimersByTimeAsync(1000);

		expect(shopify.sent).toHaveLength(6);
		expect(await isSettled(setup)).toBe(true);
	});

	it('reports a rejected choice and retries with the next update', async () => {
		fakeRetryTimers();
		let fail = true;
		const shopify = installCustomerPrivacy(() =>
			fail ? Promise.reject(new Error('consent domain')) : Promise.resolve()
		);
		const kernel = kernelWith('opt-in');
		const onError = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onError });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
		expect(await isSettled(setup)).toBe(false);

		fail = false;
		bridge.update(kernel.getSnapshot());
		await setup;
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_GRANTED]);
	});

	it('reports an error Shopify calls back with and keeps Hydrogen blocked', async () => {
		fakeRetryTimers();
		const onSync = vi.fn();
		installCustomerPrivacy(() => Promise.reject(new Error('Invalid domain')));
		const kernel = kernelWith('opt-in');
		const onError = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onError, onSync });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledWith(new Error('Invalid domain'))
		);
		expect(await isSettled(setup)).toBe(false);
		expect(onSync).not.toHaveBeenCalled();
	});

	it('resends a rejected choice on its own, then stops after three retries', async () => {
		fakeRetryTimers();
		let failuresLeft = 2;
		const shopify = installCustomerPrivacy(() => {
			if (failuresLeft > 0) {
				failuresLeft -= 1;
				return Promise.reject(new Error('network'));
			}
			return Promise.resolve();
		});
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn() });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(1000);
		expect(await isSettled(setup)).toBe(false);
		await vi.advanceTimersByTimeAsync(2000);
		expect(await isSettled(setup)).toBe(true);
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_GRANTED, ALL_GRANTED]);

		failuresLeft = Number.POSITIVE_INFINITY;
		await kernel.commands.save({ marketing: false });
		await vi.advanceTimersByTimeAsync(60_000);
		// The first try and three retries.
		expect(shopify.sent).toHaveLength(7);
	});

	it('gives a choice that fails again after a success a fresh set of retries', async () => {
		fakeRetryTimers();
		let failuresLeft = 2;
		installCustomerPrivacy(() => {
			if (failuresLeft > 0) {
				failuresLeft -= 1;
				return Promise.reject(new Error('network'));
			}
			return Promise.resolve();
		});
		const kernel = kernelWith('opt-in');
		const onSync = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn(), onSync });
		bridge.connect(kernel);

		await kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(3000);
		expect(onSync).toHaveBeenCalledTimes(1);
		await kernel.commands.save('none');
		await vi.waitFor(() => expect(onSync).toHaveBeenCalledTimes(2));

		failuresLeft = 1;
		await kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(1000);
		expect(onSync).toHaveBeenCalledTimes(3);
	});

	it('gives a failed choice fresh retries after the visitor returns to the accepted one', async () => {
		fakeRetryTimers();
		const shopify = installCustomerPrivacy((consent) =>
			consent.marketing
				? Promise.resolve()
				: Promise.reject(new Error('network'))
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn() });
		bridge.connect(kernel);

		await kernel.commands.save('all');
		await vi.waitFor(() => expect(shopify.sent).toHaveLength(1));
		await kernel.commands.save('none');
		// The first try and three retries.
		await vi.advanceTimersByTimeAsync(60_000);
		expect(shopify.sent).toHaveLength(5);

		await kernel.commands.save('all');
		await kernel.commands.save('none');
		await vi.waitFor(() => expect(shopify.sent).toHaveLength(6));
		await vi.advanceTimersByTimeAsync(1000);
		expect(shopify.sent).toHaveLength(7);
	});

	it('sends a choice made during a request that Shopify rejects', async () => {
		fakeRetryTimers();
		let rejectFirst: () => void = () => {};
		const shopify = installCustomerPrivacy((consent) =>
			consent.marketing
				? new Promise((_resolve, reject) => {
						rejectFirst = () => reject(new Error('network'));
					})
				: Promise.resolve()
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn() });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await kernel.commands.save('none');
		rejectFirst();

		await setup;
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_DENIED]);
	});

	it('releases Hydrogen only after Shopify accepts the newest choice', async () => {
		const accepts: (() => void)[] = [];
		const shopify = installCustomerPrivacy(
			() =>
				new Promise<void>((resolve) => {
					accepts.push(resolve);
				})
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await kernel.commands.save('none');
		accepts[0]?.();
		expect(await isSettled(setup)).toBe(false);
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_DENIED]);

		accepts[1]?.();
		expect(await isSettled(setup)).toBe(true);
	});

	it('releases Hydrogen when the visitor returns to an accepted choice while a newer one fails', async () => {
		fakeRetryTimers();
		const requests: { resolve: () => void; reject: () => void }[] = [];
		const shopify = installCustomerPrivacy(
			() =>
				new Promise<void>((resolve, reject) => {
					requests.push({
						reject: () => reject(new Error('network')),
						resolve,
					});
				})
		);
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy({ onError: vi.fn() });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await kernel.commands.save('none');
		requests[0]?.resolve();
		await vi.waitFor(() => expect(requests).toHaveLength(2));
		await kernel.commands.save('all');
		requests[1]?.reject();

		expect(await isSettled(setup)).toBe(true);
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_DENIED]);
	});

	it('keeps retrying when onError throws', async () => {
		fakeRetryTimers();
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		let failuresLeft = 1;
		const shopify = installCustomerPrivacy(() => {
			if (failuresLeft > 0) {
				failuresLeft -= 1;
				return Promise.reject(new Error('network'));
			}
			return Promise.resolve();
		});
		const kernel = kernelWith('opt-in');
		const failure = new Error('app callback');
		const bridge = createShopifyCustomerPrivacy({
			onError: () => {
				throw failure;
			},
		});
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.advanceTimersByTimeAsync(1000);

		expect(await isSettled(setup)).toBe(true);
		expect(shopify.sent).toEqual([ALL_GRANTED, ALL_GRANTED]);
		expect(consoleError).toHaveBeenCalledWith(expect.any(String), failure);
	});

	it('releases Hydrogen when onSync throws', async () => {
		installCustomerPrivacy();
		const kernel = kernelWith('opt-in');
		const failure = new Error('app callback');
		const onError = vi.fn();
		const bridge = createShopifyCustomerPrivacy({
			onError,
			onSync: () => {
				throw failure;
			},
		});
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await setup;
		expect(onError).toHaveBeenCalledWith(failure);
	});
});
