import { expect, test } from 'bun:test';

import {
	findAllowEntry,
	PARITY_ALLOWLIST,
	unusedAllowlistEntries,
} from './parity-allowlist';
import type { ParityAllowEntry } from './parity-allowlist';

const entry = function entry(
	overrides: Partial<ParityAllowEntry> = {}
): ParityAllowEntry {
	return {
		check: 'geometry',
		framework: 'vue',
		reason: 'because',
		slot: 'consent-banner-card',
		story: 'Core/Consent Banner/Default',
		...overrides,
	};
};

test('an exact key matches', () => {
	const list = [entry()];
	expect(
		findAllowEntry(
			{
				check: 'geometry',
				framework: 'vue',
				slot: 'consent-banner-card',
				story: 'Core/Consent Banner/Default',
			},
			list
		)
	).toBe(list[0] as ParityAllowEntry);
});

test('the check has to match', () => {
	expect(
		findAllowEntry(
			{
				check: 'pixel',
				framework: 'vue',
				slot: 'consent-banner-card',
				story: 'Core/Consent Banner/Default',
			},
			[entry()]
		)
	).toBeUndefined();
});

test('a trailing star matches a slot prefix', () => {
	const list = [entry({ slot: 'consent-widget-accordion-trigger-*' })];
	expect(
		findAllowEntry(
			{
				check: 'geometry',
				framework: 'vue',
				slot: 'consent-widget-accordion-trigger-necessary',
				story: 'Core/Consent Banner/Default',
			},
			list
		)
	).toBeDefined();
	expect(
		findAllowEntry(
			{
				check: 'geometry',
				framework: 'vue',
				slot: 'consent-widget-footer',
				story: 'Core/Consent Banner/Default',
			},
			list
		)
	).toBeUndefined();
});

test('a bare slot id covers its repeat indices', () => {
	expect(
		findAllowEntry(
			{
				check: 'geometry',
				framework: 'vue',
				slot: 'consent-banner-card[2]',
				story: 'Core/Consent Banner/Default',
			},
			[entry()]
		)
	).toBeDefined();
});

test('unused entries are scoped to the checks that ran', () => {
	const geometry = entry();
	const pixel = entry({ check: 'pixel' });
	const list = [geometry, pixel];
	expect(
		unusedAllowlistEntries(new Set(), ['geometry'], ['vue'], list)
	).toEqual([geometry]);
	expect(
		unusedAllowlistEntries(new Set([geometry]), ['geometry'], ['vue'], list)
	).toEqual([]);
});

test('a Vue allowance is not stale in a run that never compared Vue', () => {
	const vue = entry({ framework: 'vue' });
	const svelte = entry({ framework: 'svelte' });
	const list = [vue, svelte];
	expect(
		unusedAllowlistEntries(new Set(), ['geometry'], ['svelte'], list)
	).toEqual([svelte]);
});

test('a wildcard allowance is stale only when some framework ran', () => {
	const list = [entry({ framework: '*' })];
	expect(
		unusedAllowlistEntries(new Set(), ['geometry'], ['svelte'], list)
	).toEqual(list);
	expect(unusedAllowlistEntries(new Set(), ['geometry'], [], list)).toEqual([]);
});

test('every shipped entry carries a reason', () => {
	for (const shipped of PARITY_ALLOWLIST) {
		expect(shipped.reason.length).toBeGreaterThan(20);
	}
});
