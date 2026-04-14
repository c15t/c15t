import { describe, expect, test } from 'vitest';
import { preferenceItemVariants } from '../preference-item';

describe('preferenceItemVariants', () => {
	test('returns stable classes for every slot', () => {
		const variants = preferenceItemVariants();

		expect(variants.root()).toContain('root');
		expect(variants.trigger()).toContain('trigger');
		expect(variants.leading()).toContain('leading');
		expect(variants.header()).toContain('header');
		expect(variants.title()).toContain('title');
		expect(variants.meta()).toContain('meta');
		expect(variants.auxiliary()).toContain('auxiliary');
		expect(variants.control()).toContain('control');
		expect(variants.content()).toContain('content');
		expect(variants.contentViewport()).toContain('contentViewport');
		expect(variants.contentInner()).toContain('contentInner');
	});
});
