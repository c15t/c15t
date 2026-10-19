/**
 * The configured-scripts list a save carries: only gating fields, and only
 * entries the POST /subjects schema accepts, so one bad script config never
 * costs the visitor their consent record.
 */
import { subjectScriptsWireSchema } from '@c15t/schema';
import { describe, expect, test } from 'vitest';

import {
	isSaveScripts,
	MAX_SAVE_SCRIPTS,
	mergeSaveScripts,
	toSaveScripts,
} from '../save-scripts';
import type { Script } from '../script-loader/types';

describe('toSaveScripts', () => {
	test('keeps the gating fields and nothing that loads code', () => {
		const scripts: Script[] = [
			{
				alwaysLoad: false,
				category: { and: ['marketing', { not: 'measurement' }] },
				iabLegIntPurposes: [],
				iabPurposes: [1, 3],
				id: 'meta-pixel',
				onLoad: () => undefined,
				persistAfterConsentRevoked: true,
				src: 'https://connect.facebook.net/en_US/fbevents.js',
				vendor: 'meta-pixel',
				vendorId: 755,
			},
			{
				callbackOnly: true,
				category: 'measurement',
				id: 'inline',
				textContent: 'window.track()',
			},
		];
		expect(toSaveScripts(scripts)).toEqual([
			{
				category: { and: ['marketing', { not: 'measurement' }] },
				iabPurposes: [1, 3],
				id: 'meta-pixel',
				persistAfterConsentRevoked: true,
				vendor: 'meta-pixel',
				vendorId: 755,
			},
			{ callbackOnly: true, category: 'measurement', id: 'inline' },
		]);
	});

	test('drops invalid fields and scripts the backend would refuse', () => {
		const scripts = [
			{ category: 'marketing', id: 'bad-vendor', vendor: 'Not A Slug' },
			{ category: 'marketing', iabPurposes: [0, 1.5], id: 'bad-iab' },
			{ category: 'advertising', id: 'unknown-category' },
			{ category: { or: [] }, id: 'empty-or' },
			{ category: 'marketing', id: '' },
			{ category: 'marketing', id: 'x'.repeat(257) },
		] as unknown as Script[];
		expect(toSaveScripts(scripts)).toEqual([
			{ category: 'marketing', id: 'bad-vendor' },
			{ category: 'marketing', id: 'bad-iab' },
		]);
	});

	test('produces a list the POST /subjects schema accepts unchanged', () => {
		const saved = toSaveScripts([
			{
				alwaysLoad: true,
				category: { or: ['measurement', 'marketing'] },
				iabSpecialFeatures: [1],
				id: 'a',
				src: 'https://example.com/a.js',
				vendorId: 'custom-1',
			},
			{ category: 'necessary', id: 'b', vendor: 'google-tag-manager' },
		]);
		// Through Standard Schema, as core does not depend on valibot.
		const parsed = subjectScriptsWireSchema['~standard'].validate(saved);
		expect(parsed).not.toHaveProperty('issues');
		expect(parsed).toMatchObject({ value: saved });
	});
});

describe('isSaveScripts', () => {
	test('accepts what toSaveScripts builds', () => {
		expect(
			isSaveScripts(toSaveScripts([{ category: 'measurement', id: 'ga' }]))
		).toBe(true);
	});

	test('refuses unknown keys, flags other than true and oversize lists', () => {
		expect(
			isSaveScripts([{ category: 'measurement', id: 'ga', src: 'x' }])
		).toBe(false);
		expect(
			isSaveScripts([{ alwaysLoad: false, category: 'measurement', id: 'ga' }])
		).toBe(false);
		expect(
			isSaveScripts(
				Array.from({ length: MAX_SAVE_SCRIPTS + 1 }, (_, index) => ({
					category: 'measurement',
					id: `s${index}`,
				}))
			)
		).toBe(false);
	});
});

describe('mergeSaveScripts', () => {
	test('lists identical entries once, in first-declared order', () => {
		expect(
			mergeSaveScripts([
				[
					{ category: 'measurement', id: 'ga' },
					{ category: 'marketing', id: 'pixel' },
				],
				[
					{ category: 'measurement', id: 'ga' },
					{ category: 'marketing', id: 'ads' },
				],
			])
		).toEqual([
			{ category: 'measurement', id: 'ga' },
			{ category: 'marketing', id: 'pixel' },
			{ category: 'marketing', id: 'ads' },
		]);
	});

	test('caps the list and is undefined when nothing was declared', () => {
		const many = Array.from({ length: MAX_SAVE_SCRIPTS + 10 }, (_, index) => ({
			category: 'measurement' as const,
			id: `s${index}`,
		}));
		expect(mergeSaveScripts([many])).toHaveLength(MAX_SAVE_SCRIPTS);
		expect(mergeSaveScripts([])).toBeUndefined();
		expect(mergeSaveScripts([[]])).toBeUndefined();
	});
});
