import { createConsentKernel } from 'c15t/v3';
import { describe, expect, test, vi } from 'vitest';
import { createConsentStores } from '../index';

describe('svelte v3 stores', () => {
	test('selector stores only emit when selected value changes', () => {
		const kernel = createConsentKernel();
		const stores = createConsentStores(kernel);
		const listener = vi.fn();

		const unsubscribe = stores.consent('marketing').subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenLastCalledWith(false);

		kernel.set.consent({ functionality: true });
		expect(listener).toHaveBeenCalledTimes(1);

		kernel.set.consent({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener).toHaveBeenLastCalledWith(true);

		unsubscribe();
	});

	test('snapshot subscriptions dispose cleanly', () => {
		const kernel = createConsentKernel();
		const stores = createConsentStores(kernel);
		const listener = vi.fn();

		const unsubscribe = stores.snapshot.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();

		kernel.set.consent({ marketing: true });
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
