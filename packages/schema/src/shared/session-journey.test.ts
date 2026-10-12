import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import type { InitOutput } from '../api/init';
import { consentSessionReportSchema } from '../api/session';
import {
	appendJourneyParams,
	buildConsentSessionReport,
	deriveJourneyPrompt,
	journeyDomainFrom,
	readJourneyParams,
	readSessionJourney,
} from './session-report';

const ID = '3b241101-e2bb-4255-8caf-4136c566a962';

const matched = (prompt: 'choice' | 'notice' | 'none') =>
	({
		policyResolution: {
			fingerprints: { choice: 'c', notice: 'n', policy: 'p' },
			matchedBy: 'country',
			policy: {
				id: 'rule',
				model: prompt === 'none' ? 'none' : 'opt-in',
				prompt,
			},
			policyId: 'rule',
			status: 'matched',
			version: 1,
		},
		translations: { language: 'en' },
	}) as unknown as InitOutput;

const unmatched = (status: 'failed' | 'no-match' | 'unconfigured') =>
	({
		policyResolution: { policy: null, status, version: 1 },
		translations: { language: 'en' },
	}) as unknown as InitOutput;

describe('journey query parameters', () => {
	it('round-trips through a relative URL with an existing query', () => {
		const url = appendJourneyParams('/api/c15t/init?lang=de', {
			id: ID,
			scope: 'tab',
			storedChoice: false,
		});
		expect(url).toBe(
			`/api/c15t/init?lang=de&journey=${ID}&journeyScope=tab&stored=0`
		);
		expect(readJourneyParams(url)).toEqual({
			id: ID,
			scope: 'tab',
			storedChoice: false,
		});
	});

	it('leaves the stored flag out when it is not known', () => {
		const url = appendJourneyParams('https://consent.example.com/subjects', {
			id: ID,
			scope: 'page',
		});
		expect(readJourneyParams(new URL(url))).toEqual({ id: ID, scope: 'page' });
	});

	it('reads junk as no journey', () => {
		for (const query of [
			'',
			'?journey=not-a-uuid&journeyScope=page',
			`?journey=${ID}x&journeyScope=page`,
			`?journey=${ID}&journeyScope=window`,
			`?journey=${ID}`,
			'?journeyScope=page',
		]) {
			expect(readJourneyParams(`https://example.com/init${query}`)).toBeNull();
		}
		expect(readJourneyParams(undefined)).toBeNull();
	});

	it('replaces a journey the URL already carries', () => {
		const other = '9c5b94b1-35ad-49bb-b118-8e8fc24abf80';
		expect(
			appendJourneyParams(
				`/subjects?journey=${other}&journeyScope=tab&site=a`,
				{
					id: ID,
					scope: 'page',
				}
			)
		).toBe(`/subjects?site=a&journey=${ID}&journeyScope=page`);
	});

	it('reads the alpha parameter names when the current ones are absent', () => {
		// 3.0.0-alpha.8 and alpha.9 clients sent `c15tJourney`,
		// `c15tJourneyScope` and `c15tStored`.
		expect(
			readJourneyParams(
				`/init?c15tJourney=${ID}&c15tJourneyScope=tab&c15tStored=1`
			)
		).toEqual({ id: ID, scope: 'tab', storedChoice: true });
		expect(
			readSessionJourney(
				`/init?c15tJourney=${ID}&c15tJourneyScope=page&c15tStored=0`
			)
		).toEqual({ id: ID, scope: 'page', storedChoice: false });
	});

	it('prefers the current names and never mixes them with the alpha names', () => {
		const other = '9c5b94b1-35ad-49bb-b118-8e8fc24abf80';
		expect(
			readJourneyParams(
				`/init?c15tJourney=${other}&c15tJourneyScope=tab&c15tStored=1&journey=${ID}&journeyScope=page&stored=0`
			)
		).toEqual({ id: ID, scope: 'page', storedChoice: false });
		// A current id with only an alpha scope is no journey under either set.
		expect(
			readJourneyParams(`/init?journey=${ID}&c15tJourneyScope=page`)
		).toBeNull();
	});

	it('ignores a stored flag that is not 0 or 1', () => {
		expect(
			readJourneyParams(
				`/init?journey=${ID.toUpperCase()}&journeyScope=page&stored=yes`
			)
		).toEqual({ id: ID, scope: 'page' });
	});
});

describe('deriveJourneyPrompt', () => {
	it('is not required when the policy shows no prompt', () => {
		expect(deriveJourneyPrompt(matched('none'), false)).toBe('not-required');
		expect(deriveJourneyPrompt(matched('none'), true)).toBe('not-required');
	});

	it('is not required when the resolution failed or is missing', () => {
		expect(deriveJourneyPrompt(unmatched('failed'), false)).toBe(
			'not-required'
		);
		expect(
			deriveJourneyPrompt({ policyResolution: undefined } as never, false)
		).toBe('not-required');
	});

	it('is stored or due for a prompting policy', () => {
		expect(deriveJourneyPrompt(matched('choice'), true)).toBe('stored');
		expect(deriveJourneyPrompt(matched('choice'), false)).toBe('due');
		expect(deriveJourneyPrompt(matched('notice'), false)).toBe('due');
	});

	it('treats no match as the fallback prompt the browser still shows', () => {
		expect(deriveJourneyPrompt(unmatched('no-match'), false)).toBe('due');
		expect(deriveJourneyPrompt(unmatched('unconfigured'), true)).toBe('stored');
	});
});

describe('journeyDomainFrom', () => {
	it('reads the hostname of an http origin only', () => {
		expect(journeyDomainFrom('https://shop.example.com:8443')).toBe(
			'shop.example.com'
		);
		expect(journeyDomainFrom('null')).toBeUndefined();
		expect(journeyDomainFrom('chrome-extension://abc')).toBeUndefined();
		expect(journeyDomainFrom(undefined)).toBeUndefined();
	});
});

describe('readSessionJourney', () => {
	it('needs the stored flag and takes the domain from the site', () => {
		expect(
			readSessionJourney(
				`/init?journey=${ID}&journeyScope=page&stored=0`,
				'https://shop.example.com'
			)
		).toEqual({
			domain: 'shop.example.com',
			id: ID,
			scope: 'page',
			storedChoice: false,
		});
		expect(
			readSessionJourney(`/init?journey=${ID}&journeyScope=page`)
		).toBeNull();
	});
});

describe('session report journey', () => {
	it('adds the journey with its derived prompt, and the schema accepts it', () => {
		const report = buildConsentSessionReport({
			init: matched('choice'),
			journey: {
				domain: 'shop.example.com',
				id: ID,
				scope: 'page',
				storedChoice: false,
			},
			manifest: { revision: 'rev-1' },
			source: 'route',
		});
		expect(report.journey).toEqual({
			domain: 'shop.example.com',
			id: ID,
			prompt: 'due',
			scope: 'page',
			storedChoice: false,
		});
		expect(v.safeParse(consentSessionReportSchema, report).success).toBe(true);
	});

	it('has no journey without one', () => {
		const report = buildConsentSessionReport({
			init: matched('choice'),
			manifest: { revision: 'rev-1' },
			source: 'route',
		});
		expect(Object.hasOwn(report, 'journey')).toBe(false);
	});

	it('rejects a report whose journey id is not a UUID', () => {
		const report = buildConsentSessionReport({
			init: matched('choice'),
			journey: { id: 'visitor-42', scope: 'page', storedChoice: false },
			manifest: { revision: 'rev-1' },
			source: 'route',
		});
		expect(v.safeParse(consentSessionReportSchema, report).success).toBe(false);
	});
});
