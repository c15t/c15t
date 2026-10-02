import { describe, expect, test } from 'vitest';

import {
	accept,
	evaluate,
	freshChoices,
	readChoices,
	reject,
	savePreferences,
} from '../model';

describe('mixed UK exemptions kernel demo', () => {
	test('starts statistics under an exemption without creating consent', () => {
		const choices = freshChoices();
		expect(evaluate(choices, 'uk', true)).toEqual({
			advertising: false,
			exempt: true,
			needsChoice: true,
			statistics: true,
		});
		expect(choices.statisticsConsent).toBeNull();
	});
	test.each(['eu', 'unknown'] as const)(
		'%s requires consent for both purposes',
		(region) => {
			expect(evaluate(freshChoices(), region, true)).toEqual({
				advertising: false,
				exempt: false,
				needsChoice: true,
				statistics: false,
			});
		}
	);
	test('advertising consent does not reverse a statistics objection', () => {
		const refused = reject(freshChoices(), 'uk', true);
		const choices = accept(refused, 'uk', true);
		expect(evaluate(choices, 'uk', true)).toMatchObject({
			advertising: true,
			statistics: false,
		});
		expect(choices.statisticsConsent).toBeNull();
	});
	test('persists independent choices through storage and policy changes', () => {
		const choices = savePreferences(freshChoices(), 'uk', true, {
			advertising: true,
			statistics: false,
		});
		const restored = readChoices(JSON.parse(JSON.stringify(choices)));
		expect(evaluate(restored, 'uk', true)).toMatchObject({
			advertising: true,
			statistics: false,
		});
		expect(evaluate(restored, 'uk', false)).toMatchObject({
			advertising: false,
			statistics: false,
		});
	});
	test('reversing an objection enables statistics without granting consent', () => {
		const choices = savePreferences(
			reject(freshChoices(), 'uk', true),
			'uk',
			true,
			{ advertising: false, statistics: true }
		);
		expect(evaluate(choices, 'uk', true).statistics).toBe(true);
		expect(choices.statisticsConsent).toBeNull();
	});
	test('removing an exemption does not convert its permission into consent', () => {
		const choices = accept(freshChoices(), 'uk', true);
		expect(evaluate(choices, 'uk', false)).toMatchObject({
			advertising: false,
			needsChoice: true,
			statistics: false,
		});
	});
	test('rejecting optional processing also objects to exempt statistics', () => {
		expect(evaluate(reject(freshChoices(), 'uk', true), 'uk', true)).toEqual({
			advertising: false,
			exempt: true,
			needsChoice: false,
			statistics: false,
		});
	});
	test('a refusal recorded under consent still applies when an exemption is added', () => {
		const choices = reject(freshChoices(), 'uk', false);
		expect(evaluate(choices, 'uk', true).statistics).toBe(false);
	});
	test.each([
		null,
		{},
		{
			advertisingConsent: 'yes',
			statisticsConsent: null,
			statisticsObjected: false,
		},
	])('discards invalid saved choices: %j', (value) => {
		expect(readChoices(value)).toEqual(freshChoices());
	});
});
