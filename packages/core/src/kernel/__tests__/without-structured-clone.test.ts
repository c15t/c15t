/**
 * The kernel runs on browsers without `structuredClone` (Chrome < 98,
 * Firefox < 94, Safari < 15.4).
 */
import { afterEach, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { ResolvedVendor } from '../../types';
import { createKernel } from '../index';

afterEach(() => {
	vi.unstubAllGlobals();
});

test('declares vendors with nested category conditions', () => {
	vi.stubGlobal('structuredClone', undefined);
	const kernel = createKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['marketing', 'measurement'] })
		),
		now: NOW,
	});
	const vendor: ResolvedVendor = {
		category: { and: ['marketing', { not: 'measurement' }] },
		id: 'gtm',
		name: 'Google Tag Manager',
		ownerCategory: { or: ['marketing', 'measurement'] },
		presentable: true,
		source: 'config',
	};

	kernel.set.vendors({ declared: [vendor] });

	const [declared] = kernel.getSnapshot().vendors?.declared ?? [];
	expect(declared?.category).toEqual(vendor.category);
	expect(declared?.category).not.toBe(vendor.category);
	expect(declared?.ownerCategory).toEqual(vendor.ownerCategory);
	expect(declared?.ownerCategory).not.toBe(vendor.ownerCategory);
	kernel.dispose();
});
