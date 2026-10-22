import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { attentiveTag } from './attentive';

describe('attentiveTag', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'attentiveTag',
			attentiveTag({ siteSlug: 'c15tfake' }),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://cdn.attn.tv/c15tfake/dtag.js',
			}
		);
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() => attentiveTag({ siteSlug: id as string }),
				{ category: 'marketing', id: 'attentive' },
				'attentiveTag: missing or invalid siteSlug'
			);
		}
	);
	it.each([undefined, null])('skips absent runtime options %s', (options) => {
		expectSkippedScript(
			// @ts-expect-error JavaScript callers can omit the required options.
			() => attentiveTag(options),
			{ category: 'marketing', id: 'attentive' },
			'attentiveTag: missing or invalid siteSlug'
		);
	});
	it('preserves the category when rejecting a malformed slug', () => {
		expectSkippedScript(
			() => attentiveTag({ category: 'experience', siteSlug: 'site/path' }),
			{ category: 'experience', id: 'attentive' },
			'attentiveTag: invalid siteSlug, use the single site slug from Attentive'
		);
	});
	it('trims identifiers and custom loader URLs', () => {
		expect(
			attentiveTag({
				scriptUrl: ' https://example.com/vendor.js ',
				siteSlug: ' c15tfake ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(attentiveTag({ scriptUrl: '   ', siteSlug: 'c15tfake' }).src).toBe(
			'https://cdn.attn.tv/c15tfake/dtag.js'
		);
	});
});

it.each(['https://example.com', 'site/path', 'site?query'])(
	'rejects a URL or path as site slug %s',
	(siteSlug) => {
		expectSkippedScript(
			() => attentiveTag({ siteSlug }),
			{ category: 'marketing', id: 'attentive' },
			'attentiveTag: invalid siteSlug, use the single site slug from Attentive'
		);
	}
);
it('requires the slug even for a loader override', () => {
	expectSkippedScript(
		() =>
			attentiveTag({ scriptUrl: 'https://example.com/dtag.js', siteSlug: '' }),
		{ category: 'marketing', id: 'attentive' },
		'attentiveTag: missing or invalid siteSlug'
	);
});
