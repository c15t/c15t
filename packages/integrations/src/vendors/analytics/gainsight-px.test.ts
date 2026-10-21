import { afterEach, describe, expect, it } from 'vitest';

import {
	createCallbackInfo,
	expectSkippedScript,
	getTestGlobal,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { gainsightPx } from './gainsight-px';

const getAptrinsic = function getAptrinsic() {
	return getTestGlobal().aptrinsic as ((...args: unknown[]) => void) & {
		q: IArguments[];
		p: string;
		c: Record<string, unknown>;
	};
};

describe('gainsightPx', () => {
	setupScriptHelperTest();
	afterEach(() => {
		delete getTestGlobal().aptrinsic;
		delete getTestGlobal().__c15tGainsightPxProductKey;
	});

	it('returns metadata and a blocked loader without browser side effects', () => {
		const script = gainsightPx({ productKey: ' AP-PRODUCT-KEY-2 ' });
		expect(script).toMatchObject({
			category: 'measurement',
			id: 'gainsight-px',
			src: 'https://web-sdk.aptrinsic.com/api/aptrinsic.js?a=AP-PRODUCT-KEY-2',
			vendor: 'gainsight-px',
			vendorDetails: { name: 'Gainsight PX' },
		});
		expect(script.alwaysLoad).toBeUndefined();
		expect(script.persistAfterConsentRevoked).toBe('loaded');
		expect(getTestGlobal().aptrinsic).toBeUndefined();
	});

	it('uses the official arguments queue, product key and fifth configuration argument', () => {
		const config = Object.freeze({ fullDomainCookie: true });
		const user = Object.freeze({ id: 'user-123', plan: 'paid' });
		const account = Object.freeze({ id: 'account-456' });
		const script = gainsightPx({
			account,
			config,
			productKey: 'AP-KEY-2',
			user,
		});
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		const aptrinsic = getAptrinsic();
		expect(aptrinsic.p).toBe('AP-KEY-2');
		expect(aptrinsic.c).toEqual({ enableTag: true, fullDomainCookie: true });
		expect(aptrinsic.q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['identify', user, account],
		]);
		expect(Object.prototype.toString.call(aptrinsic.q[0])).toBe(
			'[object Arguments]'
		);
		expect(config).toEqual({ fullDomainCookie: true });
	});

	it('omits identify unless a user is supplied and omits an absent account argument', () => {
		const script = gainsightPx({
			productKey: 'AP-KEY-2',
			user: { id: 'user' },
		});
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['identify', { id: 'user' }],
		]);
	});

	it('sends documented opt-out commands once per denied transition', () => {
		const script = gainsightPx({ productKey: 'AP-KEY-2' });
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		const denied = createCallbackInfo({ hasConsent: false, id: script.id });
		script.onConsentChange?.(denied);
		script.onConsentChange?.(denied);
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['config', 'enableTag', false],
			['reset'],
		]);
	});

	it('preserves a running vendor API and honors category and loader overrides', () => {
		const calls: unknown[][] = [];
		const runtime = (...args: unknown[]) => calls.push(args);
		getTestGlobal().aptrinsic = runtime;
		const script = gainsightPx({
			category: 'experience',
			productKey: 'AP-KEY-2',
			scriptUrl: ' https://static.example.com/px.js ',
		});
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(getTestGlobal().aptrinsic).toBe(runtime);
		expect(calls).toEqual([['config', 'enableTag', true]]);
		expect(script.category).toBe('experience');
		expect(script.src).toBe('https://static.example.com/px.js');
	});

	it('encodes the product key as a single query value', () => {
		expect(gainsightPx({ productKey: 'AP-test&other=value' }).src).toBe(
			'https://web-sdk.aptrinsic.com/api/aptrinsic.js?a=AP-test%26other%3Dvalue'
		);
	});

	it('rejects a pre-created different key when its granted lifecycle runs after SDK startup', () => {
		const original = gainsightPx({ productKey: 'AP-ORIGINAL-2' });
		const replacement = gainsightPx({ productKey: 'AP-REPLACEMENT-2' });
		const granted = createCallbackInfo({ hasConsent: true, id: original.id });
		original.onBeforeLoad?.(granted);
		Reflect.set(getAptrinsic(), '__sdkBundleStarted', true);
		expect(() => replacement.onBeforeLoad?.(granted)).toThrow(
			'cannot change productKey after the SDK has started'
		);
		expect(() => replacement.onConsentChange?.(granted)).toThrow(
			'cannot change productKey after the SDK has started'
		);
		replacement.onConsentChange?.(
			createCallbackInfo({ hasConsent: false, id: original.id })
		);
		expect(getAptrinsic().q.map((entry) => Array.from(entry))).toEqual([
			['config', 'enableTag', true],
			['config', 'enableTag', false],
			['reset'],
		]);
	});

	it('skips missing keys while preserving the configured consent category', () => {
		for (const productKey of ['', '  ', undefined]) {
			expectSkippedScript(
				() =>
					gainsightPx({
						category: 'experience',
						productKey: productKey as string,
					}),
				{ category: 'experience', id: 'gainsight-px' },
				'gainsightPx: missing or invalid productKey'
			);
		}
	});
});
