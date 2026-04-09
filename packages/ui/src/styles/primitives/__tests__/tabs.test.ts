import { describe, expect, test } from 'vitest';
import { tabsVariants } from '../tabs';

describe('tabsVariants', () => {
	test('returns horizontal list classes by default', () => {
		const variants = tabsVariants();

		expect(variants.root()).toContain('root');
		expect(variants.list()).toContain('list');
		expect(variants.trigger()).toContain('trigger');
		expect(variants.content()).toContain('content');
	});

	test('adds vertical list class when requested', () => {
		const variants = tabsVariants({ orientation: 'vertical' });

		expect(variants.list()).toContain('list-vertical');
	});
});
