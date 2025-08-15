import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/inputs', () => ({}));

import { validateOptions } from '../src/steps/validate';

describe('validateOptions', () => {
	it('does not throw (no-op after simplification)', () => {
		expect(() => validateOptions()).not.toThrowError();
	});
});
