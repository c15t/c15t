import { describe, expect, it } from 'vitest';

import { generate } from '../src/commands/generate';

describe('Command Integration', () => {
	describe('generate command', () => {
		it('exports the generate command entrypoint', () => {
			expect(generate).toBeTypeOf('function');
		});
	});
});
