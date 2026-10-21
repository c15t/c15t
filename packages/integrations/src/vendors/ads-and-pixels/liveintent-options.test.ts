import { describe, expect, it, vi } from 'vitest';

import { liveIntentTag } from './liveintent';

describe('LiveIntent account configuration', () => {
	it('encodes the trimmed account tag as one filename segment', () => {
		expect(liveIntentTag({ tagId: ' tag/path ?#& ' }).src).toBe(
			'https://b-code.liadm.com/tag%2Fpath%20%3F%23%26.min.js'
		);
	});

	it.each(['', ' \n\t '])(
		'uses the account loader for blank overrides %j',
		(scriptUrl) => {
			expect(liveIntentTag({ scriptUrl, tagId: ' account-tag ' }).src).toBe(
				'https://b-code.liadm.com/account-tag.min.js'
			);
		}
	);

	it('trims an explicit account tag URL', () => {
		expect(
			liveIntentTag({
				scriptUrl: ' https://cdn.example.com/liveconnect.js?tag=1&v=2 ',
				tagId: 'account-tag',
			}).src
		).toBe('https://cdn.example.com/liveconnect.js?tag=1&v=2');
	});

	it.each(['', ' \t\n '])(
		'skips a blank tag ID %j with the configured category',
		(tagId) => {
			const error = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			try {
				const script = liveIntentTag({ category: 'measurement', tagId });
				expect(script).toMatchObject({
					callbackOnly: true,
					category: 'measurement',
					id: 'liveintent',
					vendor: 'liveintent',
				});
				expect(script.src).toBeUndefined();
				expect(script.onBeforeLoad).toBeUndefined();
				expect(error).toHaveBeenCalledExactlyOnceWith(
					'liveIntentTag: missing or invalid tagId. The script will not load.'
				);
			} finally {
				error.mockRestore();
			}
		}
	);
});
