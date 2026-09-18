import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { evaluateBlock } from '../decide';
import { createNetworkBlocker } from '../index';

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
});
