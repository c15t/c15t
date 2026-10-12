import { describe, expect, test } from 'vitest';

import {
	normalizeResourceName,
	parseIterations,
	summarizeDialogSamples,
} from './loader-audit';

describe('loader audit artifacts', () => {
	test.each(['0', '-1', 'NaN', '1.5', '', 'Infinity', '9007199254740992'])(
		'rejects invalid iterations %s',
		(value) => {
			expect(() => parseIterations(value, 10)).toThrow('positive safe integer');
		}
	);
	test('accepts the default and positive integers', () => {
		expect(parseIterations(undefined, 10)).toBe(10);
		expect(parseIterations('3', 10)).toBe(3);
	});
	test('scrubs local paths without changing ordinary resource URLs', () => {
		expect(
			normalizeResourceName(
				'http://localhost/@fs/Users/dev/repo/packages/a.ts',
				'/Users/dev/repo'
			)
		).toBe('http://localhost/@fs/<workspace>/packages/a.ts');
		expect(
			normalizeResourceName(
				'http://localhost/@fs/home/other/cache/a.js',
				'/Users/dev/repo'
			)
		).toBe('http://localhost/@fs/<external>/a.js');
		expect(
			normalizeResourceName('http://localhost/app.js?x=1', '/Users/dev/repo')
		).toBe('http://localhost/app.js?x=1');
	});
	test('derives per-sample download gaps and distinguishes no downloads', () => {
		const sample = {
			fullyVisible: 190,
			mounted: 40,
			resources: [
				{ end: 10, name: '/chunk.js' },
				{ end: 20, name: '/style.css?x=1' },
				{ end: 99, name: '/init' },
			],
			visible: 50,
		};
		expect(summarizeDialogSamples([sample])).toEqual({
			downloadToMount: 20,
			downloadsComplete: 20,
			fullyVisible: 190,
			mounted: 40,
			visible: 50,
		});
		expect(
			summarizeDialogSamples([{ ...sample, resources: [] }])
		).toMatchObject({ downloadToMount: null, downloadsComplete: null });
		expect(() => summarizeDialogSamples([])).toThrow('empty samples');
	});
});
