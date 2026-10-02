import { describe, expect, test } from 'vitest';

import { compareCanonical } from './canonical-order';
import { normalizePolicyRule } from './policy-rule';
import {
	choicePromptFingerprintInput,
	noticePromptFingerprintInput,
	policyFingerprintInput,
} from './policy-rule-fingerprint';
import { policyRulePresets } from './policy-rule-presets';

const PRINTABLE = Array.from({ length: 0x7f - 0x20 }, (_, index) =>
	String.fromCharCode(0x20 + index)
);

/** Small deterministic generator so a failure reproduces. */
const random = function random(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) % 0x1_0000_0000;
		return state / 0x1_0000_0000;
	};
};

const sign = function sign(value: number): number {
	return Math.sign(value);
};

describe('compareCanonical', () => {
	test('agrees with localeCompare on every printable ASCII pair', () => {
		for (const left of PRINTABLE) {
			for (const right of PRINTABLE) {
				expect(
					sign(compareCanonical(left, right)),
					`${JSON.stringify(left)} vs ${JSON.stringify(right)}`
				).toBe(sign(left.localeCompare(right, 'en')));
			}
		}
	});

	test('agrees with localeCompare on random printable ASCII strings', () => {
		const draw = random(20_260_928);
		const alphabet = [...PRINTABLE, 'a', 'A', 'a', 'A', 'e', 'E', '_', '-'];
		const word = () => {
			const length = Math.floor(draw() * 9);
			let value = '';
			for (let index = 0; index < length; index += 1) {
				value += alphabet[Math.floor(draw() * alphabet.length)];
			}
			return value;
		};
		for (let run = 0; run < 20_000; run += 1) {
			const left = word();
			const right = draw() < 0.2 ? left + word() : word();
			expect(
				sign(compareCanonical(left, right)),
				`${JSON.stringify(left)} vs ${JSON.stringify(right)}`
			).toBe(sign(left.localeCompare(right, 'en')));
		}
	});

	test('orders case-variants lowercase first, after the primary letters', () => {
		expect(['AB', 'Ab', 'aB', 'ab', 'aa', 'b'].sort(compareCanonical)).toEqual([
			'aa',
			'ab',
			'aB',
			'Ab',
			'AB',
			'b',
		]);
	});

	test('sorts the fingerprint keys the way stableStringify always has', () => {
		const keys = [
			'version',
			'scopeMode',
			'scope',
			'requiredActions',
			'privacySignals',
			'validityMs',
			'copyRevision',
			'domain',
			'model',
			'prompt',
			'rights',
			'actions',
			'preselectedCategories',
			'gpc',
			'denyCategories',
			'storeIp',
			'storeLanguage',
			'storeUserAgent',
		];
		expect([...keys].sort(compareCanonical)).toEqual(
			[...keys].sort((left, right) => left.localeCompare(right, 'en'))
		);
	});

	test('falls back to localeCompare outside printable ASCII', () => {
		const values = ['é', 'e', 'f', 'z', 'Ω', '\t', 'a b', 'ab'];
		expect([...values].sort(compareCanonical)).toEqual(
			[...values].sort((left, right) => left.localeCompare(right, 'en'))
		);
	});
});

describe('fingerprint inputs under other locales', () => {
	const collect = function collect(value: unknown, sets: string[][]): void {
		if (Array.isArray(value)) {
			if (value.every((item) => typeof item === 'string')) {
				sets.push(value as string[]);
			}
			for (const item of value) {
				collect(item, sets);
			}
			return;
		}
		if (value && typeof value === 'object') {
			sets.push(Object.keys(value));
			for (const item of Object.values(value)) {
				collect(item, sets);
			}
		}
	};

	const sets: string[][] = [];
	for (const preset of Object.values(policyRulePresets)) {
		const rule = normalizePolicyRule(preset('statistics-review-1'));
		collect(policyFingerprintInput(rule), sets);
		collect(choicePromptFingerprintInput(rule), sets);
		collect(noticePromptFingerprintInput(rule), sets);
		collect(preset('statistics-review-1').legacyMaterial ?? null, sets);
	}

	test.each(['en', 'tr', 'da', 'nb', 'sv', 'fi', 'cs', 'sk', 'de', 'es', 'pl'])(
		'every preset key set and value set sorts the same as localeCompare under %s',
		(locale) => {
			expect(sets.length).toBeGreaterThan(50);
			for (const set of sets) {
				expect([...set].sort(compareCanonical)).toEqual(
					[...set].sort((left, right) => left.localeCompare(right, locale))
				);
			}
		}
	);
});
