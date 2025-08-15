import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/inputs', () => ({
	deleteOldComment: true,
	recreate: true,
	onlyCreateComment: false,
	onlyUpdateComment: true,
	hideAndRecreate: true,
}));

import { validateOptions } from '../src/steps/validate';

describe('validateOptions', () => {
	it('throws for invalid combinations', () => {
		expect(() => validateOptions()).toThrowError();
	});
});
