import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { evaluateBlock } from '../decide';
import { createNetworkBlocker } from '../index';

/** The slugs these tests deny, declared so the gate honors the denial. */
const declaredVendors = (ids: readonly string[]) => ({
	declared: ids.map((id) => ({
		category: 'marketing' as const,
		id,
		presentable: false,
		source: 'script' as const,
	})),
	listVersion: null,
});

describe('network rules with a vendor slug', () => {
	test('a denied vendor blocks a request whose category is granted', () => {
		const snap = createConsentKernel({
			initialRecords: {
				...choiceRecords({ marketing: true }),
				vendorChoice: {
					confirmedAt: NOW - 1,
					denied: ['meta-pixel'],
					version: 1,
				},
			},
			initialVendors: declaredVendors(['meta-pixel']),
			now: NOW,
		}).getSnapshot();
		const rules = [
			{
				category: 'marketing' as const,
				domain: 'facebook.com',
				vendor: 'meta-pixel',
			},
			{
				category: 'marketing' as const,
				domain: 'doubleclick.net',
				vendor: 'google-ads',
			},
		];
		expect(
			evaluateBlock(new URL('https://www.facebook.com/tr'), 'GET', rules, snap)
				.shouldBlock
		).toBe(true);
		expect(
			evaluateBlock(new URL('https://ad.doubleclick.net/x'), 'GET', rules, snap)
				.shouldBlock
		).toBe(false);
	});
});

describe('rule-owned vendor declarations', () => {
	test('rules swapped in later declare their vendor slug', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		const blocker = createNetworkBlocker({ kernel, rules: [] });
		expect(kernel.getSnapshot().vendors).toBeNull();
		blocker.updateRules([
			{ category: 'marketing', domain: 'facebook.com', vendor: 'meta-pixel' },
		]);
		expect(
			kernel.getSnapshot().vendors?.declared.map((vendor) => vendor.id)
		).toEqual(['meta-pixel']);
		blocker.dispose();
		kernel.dispose();
	});

	test('a blocker puts its slug back when another source sweeps it away', () => {
		const kernel = createConsentKernel({
			initialRecords: choiceRecords({ marketing: true }),
			now: NOW,
		});
		const blocker = createNetworkBlocker({
			kernel,
			rules: [
				{ category: 'marketing', domain: 'facebook.com', vendor: 'meta-pixel' },
			],
		});
		kernel.set.vendors({ declared: [] }, { replaceSource: 'script' });
		expect(
			kernel
				.getSnapshot()
				.vendors?.declared.map((vendor) => [vendor.id, vendor.source])
		).toEqual([['meta-pixel', 'script']]);
		blocker.dispose();
		kernel.dispose();
	});
});
