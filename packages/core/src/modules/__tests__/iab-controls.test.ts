import { describe, expect, it, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import {
	getIABControls,
	registerIABControls,
	subscribeIABControls,
} from '../iab-controls';
import type { KernelIABControls } from '../iab-controls';

const controls = (): KernelIABControls => ({
	acceptAll: vi.fn(),
	rejectAll: vi.fn(),
	save: vi.fn().mockResolvedValue(undefined),
	setPurposeConsent: vi.fn(),
	setPurposeLegitimateInterest: vi.fn(),
	setSpecialFeatureOptIn: vi.fn(),
	setVendorConsent: vi.fn(),
	setVendorLegitimateInterest: vi.fn(),
});

describe('kernel-scoped IAB controls', () => {
	it('isolates providers and ignores stale cleanup after replacement', () => {
		const first = createConsentKernel();
		const second = createConsentKernel();
		const listener = vi.fn();
		const unsubscribe = subscribeIABControls(first, listener);
		const original = controls();
		const replacement = controls();
		const removeOriginal = registerIABControls(first, original);
		expect(getIABControls(first)).toBe(original);
		expect(getIABControls(second)).toBeUndefined();
		const removeReplacement = registerIABControls(first, replacement);
		removeOriginal();
		expect(getIABControls(first)).toBe(replacement);
		expect(listener).toHaveBeenCalledTimes(2);
		removeReplacement();
		expect(getIABControls(first)).toBeUndefined();
		expect(listener).toHaveBeenCalledTimes(3);
		unsubscribe();
		registerIABControls(first, original)();
		expect(listener).toHaveBeenCalledTimes(3);
	});

	it('does not let an inspection subscriber break module registration', () => {
		const kernel = createConsentKernel();
		subscribeIABControls(kernel, () => {
			throw new Error('Inspection failed');
		});
		expect(() => registerIABControls(kernel, controls())()).not.toThrow();
	});
});
