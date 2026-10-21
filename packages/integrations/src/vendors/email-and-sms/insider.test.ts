/**
 * @vitest-environment jsdom
 */

import type { Script } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { insiderTag } from './insider';
import type { InsiderPageType } from './insider';

const account = { partnerId: '123456', partnerName: 'yourpartner' };

const product = {
	id: 'product-1',
	name: 'Blue dress',
	product_image_url: 'https://example.com/blue-dress.png',
	taxonomy: ['Dresses'],
	unit_price: 100,
	unit_sale_price: 90,
	url: 'https://example.com/blue-dress',
};

const pageTypes: InsiderPageType[] = [
	{ type: 'home' },
	{ type: 'other', value: { name: 'Help' } },
	{ type: 'category', value: { breadcrumb: ['Dresses', 'Blue'] } },
	{ type: 'product', value: product },
	{
		type: 'cart',
		value: { items: [{ ...product, quantity: 2 }], total: 180 },
	},
	{
		type: 'purchase',
		value: {
			items: [{ ...product, quantity: 2 }],
			order_id: 'order-1',
			total: 180,
		},
	},
];

const runGrant = function runGrant(script: Script, mode: string): void {
	const info = createCallbackInfo({ hasConsent: true, id: script.id });
	if (mode === 'callback') {
		script.onBeforeLoad?.(info);
		return;
	}
	const start = script.serverStart?.(info, script);
	if (!start) {
		throw new Error('Expected inline Insider start code');
	}
	// oxlint-disable-next-line no-new-func -- Execute the HTML start code the helper emits.
	new Function(`${start.prelude ?? ''};${start.code}`)();
};

describe('insiderTag', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete window.InsiderQueue;
	});

	it('matches the marketing registry without pre-consent loading or persistence', () => {
		expectScriptMatchesIntegration('insiderTag', insiderTag(account), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://yourpartner.api.useinsider.com/ins.js?id=123456',
		});
	});

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips an invalid partner name %s',
		(partnerName) => {
			expectSkippedScript(
				() => insiderTag({ ...account, partnerName: partnerName as string }),
				{ category: 'marketing', id: 'insider' },
				'insiderTag: missing or invalid partnerName'
			);
		}
	);

	it.each(['', '   ', undefined, null, {}])(
		'logs and skips an invalid partner ID %s',
		(partnerId) => {
			expectSkippedScript(
				() => insiderTag({ ...account, partnerId: partnerId as string }),
				{ category: 'marketing', id: 'insider' },
				'insiderTag: missing or invalid partnerId'
			);
		}
	);

	it.each([
		'partner.example',
		'partner/path',
		'-partner',
		'partner-',
		'a'.repeat(64),
	])('rejects a partner name that is not one DNS label: %s', (partnerName) => {
		expectSkippedScript(
			() => insiderTag({ ...account, partnerName }),
			{ category: 'marketing', id: 'insider' },
			'insiderTag: missing or invalid partnerName'
		);
	});

	it('normalizes the account and encodes the ID as one query value', () => {
		const script = insiderTag({
			partnerId: ' abc&test=1 ',
			partnerName: ' Partner ',
		});
		expect(script.src).toBe(
			'https://partner.api.useinsider.com/ins.js?id=abc%26test%3D1'
		);
	});

	it('preserves a custom consent condition when an ID is missing', () => {
		expectSkippedScript(
			() => insiderTag({ ...account, category: 'experience', partnerId: '' }),
			{ category: 'experience', id: 'insider' },
			'insiderTag: missing or invalid partnerId'
		);
	});

	it.each([null, 123, {}, '', '   '])(
		'rejects invalid optional currency %s',
		(currency) => {
			expect(() =>
				insiderTag({ ...account, currency: currency as string })
			).toThrow('insiderTag: currency must be a non-blank string');
		}
	);

	it('passes currency unchanged without a code whitelist or case conversion', () => {
		const script = insiderTag({ ...account, currency: 'usd' });
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(window.InsiderQueue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'currency', value: 'usd' },
			{ type: 'other' },
			{ type: 'init' },
		]);
	});

	it('does not create a vendor global while creating the configuration', () => {
		insiderTag(account);
		expect(window.InsiderQueue).toBeUndefined();
	});

	it.each(['callback', 'server-start'])(
		'snapshots nested identifiers independently across rebuilds through %s',
		(mode) => {
			const user = { custom: { loyalty_id: 'snapshot-A' } };
			const first = insiderTag({ ...account, user });
			user.custom.loyalty_id = 'snapshot-B';
			const rebuilt = insiderTag({ ...account, user });
			const fresh = insiderTag({
				...account,
				user: { custom: { loyalty_id: 'snapshot-A' } },
			});
			for (const [script, loyaltyId] of [
				[first, 'snapshot-A'],
				[rebuilt, 'snapshot-B'],
				[fresh, 'snapshot-A'],
			] as const) {
				delete window.InsiderQueue;
				runGrant(script, mode);
				expect(window.InsiderQueue).toEqual([
					{
						type: 'user',
						value: { custom: { loyalty_id: loyaltyId }, gdpr_optin: true },
					},
					{ type: 'other' },
					{ type: 'init' },
				]);
			}
		}
	);

	it.each(['callback', 'server-start'])(
		'accepts and snapshots JSON-serializable nested proxies through %s',
		(mode) => {
			const custom = new Proxy({ loyalty_id: 'proxy-A' }, {});
			const script = insiderTag({ ...account, user: { custom } });
			custom.loyalty_id = 'proxy-B';
			runGrant(script, mode);
			expect(window.InsiderQueue).toEqual([
				{
					type: 'user',
					value: { custom: { loyalty_id: 'proxy-A' }, gdpr_optin: true },
				},
				{ type: 'other' },
				{ type: 'init' },
			]);
		}
	);

	it.each(['callback', 'server-start'])(
		'preserves nested user JSON that resembles a runtime marker through %s',
		(mode) => {
			const user = {
				custom: {
					detail: {
						identifier: 'checkout-A',
						kind: 'c15t.runtime-value',
						value: 'timestamp',
					},
				},
				email: 'guest@example.com',
			};
			runGrant(insiderTag({ ...account, user }), mode);
			expect(window.InsiderQueue).toEqual([
				{ type: 'user', value: { ...user, gdpr_optin: true } },
				{ type: 'other' },
				{ type: 'init' },
			]);
		}
	);

	it.each(['callback', 'server-start'])(
		'preserves consent when user JSON resembles a runtime marker through %s',
		(mode) => {
			const user = {
				email: 'guest@example.com',
				gdpr_optin: false,
				kind: 'c15t.runtime-value',
				value: 'date',
			};
			runGrant(insiderTag({ ...account, user }), mode);
			expect(window.InsiderQueue).toEqual([
				{ type: 'user', value: { ...user, gdpr_optin: true } },
				{ type: 'other' },
				{ type: 'init' },
			]);
		}
	);

	it.each(['callback', 'server-start'])(
		'keeps distinct current identifier payloads separate through %s',
		(mode) => {
			insiderTag({
				...account,
				user: { custom: { loyalty_id: 'collision-A,"nickname":string:B' } },
			});
			const user = { custom: { loyalty_id: 'collision-A', nickname: 'B' } };
			const script = insiderTag({ ...account, user });
			runGrant(script, mode);
			expect(window.InsiderQueue).toEqual([
				{ type: 'user', value: { ...user, gdpr_optin: true } },
				{ type: 'other' },
				{ type: 'init' },
			]);
		}
	);

	it.each(pageTypes)(
		'queues the complete $type page between user consent and init',
		(pageType) => {
			const script = insiderTag({ ...account, pageType });
			script.onBeforeLoad?.(
				createCallbackInfo({ hasConsent: true, id: script.id })
			);
			expect(window.InsiderQueue).toEqual([
				{ type: 'user', value: { gdpr_optin: true } },
				pageType,
				{ type: 'init' },
			]);
		}
	);

	it('defaults to an other page rather than assuming the home page', () => {
		const script = insiderTag(account);
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(window.InsiderQueue).toEqual([
			{ type: 'user', value: { gdpr_optin: true } },
			{ type: 'other' },
			{ type: 'init' },
		]);
	});

	it('sends false, a neutral page and init to an existing runtime push method on revocation', () => {
		const push = vi.fn();
		const runtime = { push };
		window.InsiderQueue = runtime;
		const script = insiderTag(account);
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		push.mockClear();

		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		expect(window.InsiderQueue).toBe(runtime);
		expect(push.mock.calls).toEqual([
			[{ type: 'user', value: { gdpr_optin: false } }],
			[{ type: 'other' }],
			[{ type: 'init' }],
		]);
	});

	it('does not repeat init for an unrelated consent update or duplicate denial', () => {
		const script = insiderTag(account);
		const push = vi.fn();
		window.InsiderQueue = { push };
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		push.mockClear();
		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(push).not.toHaveBeenCalled();
		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		script.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: script.id })
		);
		expect(push).toHaveBeenCalledTimes(3);
	});

	it('can create its configuration during SSR', () => {
		vi.stubGlobal('window', undefined);
		expect(() => insiderTag(account)).not.toThrow();
	});
});
