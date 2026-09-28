import { describe, expect, it, vi } from 'vitest';
import {
	expectScriptMatchesIntegration,
	expectStubCommandQueue,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { resolveManifest } from '../../resolve';
import {
	pinterestTag,
	pinterestTagEvent,
	pinterestTagManifest,
} from './pinterest-tag';

type PintrkStub =
	| (((...args: unknown[]) => void) & {
			queue?: unknown[][];
			version?: string;
	  })
	| undefined;

describe('pinterestTag', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = pinterestTag({ tagId: '2613654212508' });

		expectScriptMatchesIntegration('pinterestTag', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: 'https://s.pinimg.com/ct/core.js',
		});
	});

	it('seeds the pintrk stub, load, consent, and page calls before script load', () => {
		const globalRef = getTestGlobal();
		const script = pinterestTag({ tagId: '2613654212508' });

		runOnBeforeLoad(script, { hasConsent: true });

		const stub = globalRef.pintrk as PintrkStub;

		expect(typeof stub).toBe('function');
		expect(stub?.version).toBe('3.0');
		expectStubCommandQueue(stub, 'queue', [
			['load', '2613654212508'],
			['setconsent', true],
			['page'],
		]);
	});

	it('supports load options, disabling the page visit, and a custom loader URL', () => {
		const globalRef = getTestGlobal();
		const script = pinterestTag({
			tagId: '2613654212508',
			loadOptions: { em: 'hello@example.com' },
			trackPageVisit: false,
			scriptUrl: 'https://cdn.example.com/core.js',
		});

		expect(script.src).toBe('https://cdn.example.com/core.js');
		runOnBeforeLoad(script, { hasConsent: true });

		const stub = globalRef.pintrk as PintrkStub;
		expectStubCommandQueue(stub, 'queue', [
			['load', '2613654212508', { em: 'hello@example.com' }],
			['setconsent', true],
		]);
	});

	it('does not redefine an existing pintrk stub', () => {
		const globalRef = getTestGlobal();
		const existing = vi.fn();
		globalRef.pintrk = existing;

		const script = pinterestTag({ tagId: '2613654212508' });
		runOnBeforeLoad(script, { hasConsent: true });

		expect(globalRef.pintrk).toBe(existing);
		expect(existing).toHaveBeenCalledWith('load', '2613654212508');
		expect(existing).toHaveBeenCalledWith('setconsent', true);
		expect(existing).toHaveBeenCalledWith('page');
	});

	it('keeps the exported manifest resolvable without load options', () => {
		const globalRef = getTestGlobal();
		const script = resolveManifest(pinterestTagManifest, {
			tagId: '2613654212508',
			scriptUrl: 'https://s.pinimg.com/ct/core.js',
		});

		runOnBeforeLoad(script, { hasConsent: true });

		const stub = globalRef.pintrk as PintrkStub;
		expectStubCommandQueue(stub, 'queue', [
			['load', '2613654212508'],
			['setconsent', true],
			['page'],
		]);
	});

	it('signals consent changes through pintrk setconsent', () => {
		const globalRef = getTestGlobal();
		const script = pinterestTag({ tagId: '2613654212508' });

		runOnBeforeLoad(script, { hasConsent: true });

		const pintrk = vi.fn();
		globalRef.pintrk = pintrk;

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});
		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: true,
				experience: false,
			},
		});

		expect(pintrk).toHaveBeenNthCalledWith(1, 'setconsent', false);
		expect(pintrk).toHaveBeenNthCalledWith(2, 'setconsent', true);
		expect(pintrk).toHaveBeenCalledTimes(2);
	});
});

describe('pinterestTagEvent', () => {
	setupScriptHelperTest();

	it('is a no-op when pintrk is not defined', () => {
		expect(() => pinterestTagEvent('lead')).not.toThrow();
	});

	it('forwards the event name without data when none is provided', () => {
		const globalRef = getTestGlobal();
		const pintrk = vi.fn();
		globalRef.pintrk = pintrk;

		pinterestTagEvent('signup');

		expect(pintrk).toHaveBeenCalledWith('track', 'signup');
		expect(pintrk.mock.calls[0]).toHaveLength(2);
	});

	it('forwards checkout metadata, line items, and deduplication IDs to pintrk', () => {
		const globalRef = getTestGlobal();
		const pintrk = vi.fn();
		globalRef.pintrk = pintrk;

		const eventData = {
			event_id: 'eventId0001',
			value: 100,
			order_quantity: 1,
			currency: 'USD',
			order_id: 'X-15148',
			promo_code: 'WINTER10',
			property: 'Athleta',
			line_items: [
				{
					product_name: 'Parker Boots',
					product_id: '1414',
					product_category: 'Shoes',
					product_variant_id: '1414-Red',
					product_variant: 'Red',
					product_price: 99.99,
					product_quantity: 1,
					product_brand: 'Parker',
				},
			],
		};

		pinterestTagEvent('checkout', eventData);

		expect(pintrk).toHaveBeenCalledWith('track', 'checkout', eventData);
	});

	it('passes the callback positionally after event data', () => {
		const globalRef = getTestGlobal();
		const pintrk = vi.fn();
		globalRef.pintrk = pintrk;
		const callback = vi.fn();

		pinterestTagEvent('lead', { lead_type: 'Newsletter' }, callback);
		pinterestTagEvent('signup', undefined, callback);

		expect(pintrk).toHaveBeenNthCalledWith(
			1,
			'track',
			'lead',
			{ lead_type: 'Newsletter' },
			callback
		);
		expect(pintrk).toHaveBeenNthCalledWith(2, 'track', 'signup', {}, callback);
	});

	it('accepts user-defined event names for audience targeting', () => {
		const globalRef = getTestGlobal();
		const pintrk = vi.fn();
		globalRef.pintrk = pintrk;

		pinterestTagEvent('user_defined_event_name', { property: 'Athleta' });

		expect(pintrk).toHaveBeenCalledWith('track', 'user_defined_event_name', {
			property: 'Athleta',
		});
	});
});
