import { describe, expect, test } from 'vitest';

import { generateOptionsText } from './options';

describe('generateOptionsText', () => {
	test('wraps inline custom endpoint responses in transport envelopes', () => {
		const output = generateOptionsText(
			'custom',
			'/api/consent',
			false,
			false,
			true
		);

		expect(output).toContain('return { ok: res.ok, data: await res.json() };');
		expect(output.match(/return \{ ok: res\.ok, data:/gu)).toHaveLength(2);
	});
});
