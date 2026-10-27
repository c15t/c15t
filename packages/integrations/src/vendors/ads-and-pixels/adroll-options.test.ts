import { describe, expect, it, vi } from 'vitest';

import { adrollPixel } from './adroll';

describe('AdRoll account configuration', () => {
	it('uses the browser lifecycle for the official bootstrap', () => {
		expect(
			adrollPixel({ advertiserId: 'advertiser', pixelId: 'pixel' }).serverStart
		).toBeUndefined();
	});
	it('encodes the trimmed advertiser as one URL segment', () => {
		expect(
			adrollPixel({ advertiserId: ' adv/path ?#& ', pixelId: ' pixel ' }).src
		).toBe('https://s.adroll.com/j/adv%2Fpath%20%3F%23%26/roundtrip.js');
	});

	it.each(['', ' \n\t '])(
		'uses the account loader for blank overrides %j',
		(scriptUrl) => {
			expect(
				adrollPixel({
					advertiserId: ' advertiser ',
					pixelId: 'pixel',
					scriptUrl,
				}).src
			).toBe('https://s.adroll.com/j/advertiser/roundtrip.js');
		}
	);

	it('trims an explicit account loader URL', () => {
		expect(
			adrollPixel({
				advertiserId: 'advertiser',
				pixelId: 'pixel',
				scriptUrl: ' https://cdn.example.com/adroll.js?account=1&v=2 ',
			}).src
		).toBe('https://cdn.example.com/adroll.js?account=1&v=2');
	});

	it.each([
		{ advertiserId: '', missing: 'advertiserId', pixelId: 'pixel' },
		{ advertiserId: ' \t ', missing: 'advertiserId', pixelId: 'pixel' },
		{ advertiserId: 'advertiser', missing: 'pixelId', pixelId: '' },
		{ advertiserId: 'advertiser', missing: 'pixelId', pixelId: ' \n ' },
	])('skips missing $missing', (options) => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		try {
			const script = adrollPixel(options);
			expect(script).toMatchObject({
				callbackOnly: true,
				category: 'marketing',
				id: 'adroll',
				vendor: 'adroll',
			});
			expect(script.src).toBeUndefined();
			expect(script.onBeforeLoad).toBeUndefined();
			expect(error).toHaveBeenCalledExactlyOnceWith(
				`adrollPixel: missing or invalid ${options.missing}. The script will not load.`
			);
		} finally {
			error.mockRestore();
		}
	});
});
