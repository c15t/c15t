import { describe, expect, test } from 'vitest';

import {
	choiceRecords,
	NOW,
} from '../../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../../kernel';
import { evaluateBlock } from '../decide';

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
