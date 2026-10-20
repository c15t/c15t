import { describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import { mountRuntimeIAB } from '../iab-mount';
import type { ConsentRuntimeIABFactory } from '../types';

describe('mountRuntimeIAB', () => {
	test('creates the CMP once when createIAB updates the kernel while mounting', () => {
		const kernel = createConsentKernel();
		// Like `seedInitialIAB`: every call writes a fresh `publisherRestrictions`.
		const createIAB = vi.fn((options) => {
			options.kernel.set.iab({ publisherRestrictions: [] });
			return { dispose: vi.fn() };
		}) as unknown as ConsentRuntimeIABFactory;
		const onHandle = vi.fn();

		mountRuntimeIAB({ createIAB, iab: {}, kernel, onHandle });
		expect(createIAB).not.toHaveBeenCalled();

		// A resolved IAB policy hands the kernel its `cmpId`.
		kernel.set.iab({ cmpId: 4095 });

		expect(createIAB).toHaveBeenCalledTimes(1);
		expect(onHandle).toHaveBeenCalledTimes(1);
	});
});
