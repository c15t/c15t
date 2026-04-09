import { describe, expect, test } from 'vitest';
import { collapsibleVariants } from '../collapsible';

describe('collapsibleVariants', () => {
	test('returns stable classes for every slot', () => {
		const variants = collapsibleVariants();

		expect(variants.root()).toContain('root');
		expect(variants.trigger()).toContain('trigger');
		expect(variants.content()).toContain('content');
		expect(variants.contentViewport()).toContain('contentViewport');
		expect(variants.contentInner()).toContain('contentInner');
	});
});
