/** @vitest-environment jsdom */
import { createConsentKernel, resolvePolicyRules } from '@c15t/core';
import type { ConsentKernel, KernelTransport } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createShopifyCustomerPrivacy } from './shopify';
import type { ShopifyConsentPreferences } from './shopify';

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
});

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

/** Installs `window.Shopify.customerPrivacy` the way the v0.2 script does. */
const installCustomerPrivacy = (
	respond: (
		consent: ShopifyConsentPreferences,
		reply: (result?: unknown) => void
	) => unknown = (_consent, reply) => {
		queueMicrotask(() => reply({}));
	}
) => {
	const sent: ShopifyConsentPreferences[] = [];
	const setTrackingConsent = vi.fn(
		(consent: ShopifyConsentPreferences, reply: (result?: unknown) => void) => {
			sent.push(consent);
			return respond(consent, reply);
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
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
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
		installCustomerPrivacy((_consent, reply) => {
			accept = () => reply({});
		});
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

	it('waits for the policy, then sends opt-out defaults before the visitor clicks', async () => {
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
		expect(shopify.sent).toEqual([]);

		resolveInit();
		await init;
		await setup;
		expect(shopify.sent).toEqual([ALL_GRANTED]);
	});

	it('waits for the Customer Privacy API to load', async () => {
		const kernel = kernelWith('opt-in');
		const bridge = createShopifyCustomerPrivacy();
		bridge.connect(kernel);
		await kernel.commands.save('all');

		const shopify = installCustomerPrivacy();
		expect(shopify.sent).toEqual([]);

		document.dispatchEvent(new Event('consentTrackingApiLoaded'));
		await bridge.setup();
		expect(shopify.sent).toEqual([ALL_GRANTED]);
	});

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
		await vi.waitFor(() => expect(shopify.sent).toHaveLength(2));

		expect(shopify.sent[1]).toEqual({
			analytics: true,
			marketing: false,
			preferences: true,
			sale_of_data: false,
		});
		expect(onSync).toHaveBeenCalledTimes(2);
	});

	it('reports a rejected choice and retries with the next update', async () => {
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

	it('reports an error the callback returns and keeps Hydrogen blocked', async () => {
		installCustomerPrivacy((_consent, reply) => {
			queueMicrotask(() => reply({ error: 'Invalid domain' }));
		});
		const kernel = kernelWith('opt-in');
		const onError = vi.fn();
		const bridge = createShopifyCustomerPrivacy({ onError });
		bridge.connect(kernel);
		const setup = bridge.setup();

		await kernel.commands.save('all');
		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledWith(new Error('Invalid domain'))
		);
		expect(await isSettled(setup)).toBe(false);
	});
});
