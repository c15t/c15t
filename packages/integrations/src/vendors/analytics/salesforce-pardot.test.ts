import { describe, expect, it } from 'vitest';

import {
	createCallbackInfo,
	expectScriptMatchesIntegration,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { pardotTracking } from './salesforce-pardot';

describe('pardotTracking', () => {
	it('matches its public registry and export', () => {
		expectScriptMatchesIntegration(
			'pardotTracking',
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
			{
				alwaysLoad: undefined,
				persistAfterConsentRevoked: true,
				src: 'https://pi.pardot.com/pdt.js?aid=123456',
			}
		);
	});
	it('waits for client readiness in consent mode and supports server starts in classic mode', () => {
		expect(
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}).serverStart
		).toBeUndefined();
		const classic = pardotTracking({
			mode: 'classic',
			piAId: '123456',
			piCId: '654321',
		});
		expect(
			classic.serverStart?.(
				createCallbackInfo({ hasConsent: true, id: classic.id }),
				classic
			)
		).toMatchObject({ code: expect.any(String) });
	});
	it.each(['', '   ', undefined, null, {}])(
		'skips missing required ID %s',
		(id) => {
			expectSkippedScript(
				() =>
					pardotTracking({
						piAId: id as string,
						piCId: '654321',
						piDomain: 'pi.pardot.com',
					}),
				{ category: 'marketing', id: 'salesforce-pardot' },
				'pardotTracking: missing or invalid piAId'
			);
		}
	);
	it('trims identifiers and custom loader URLs', () => {
		expect(
			pardotTracking({
				piAId: ' 123456 ',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
				scriptUrl: ' https://example.com/vendor.js ',
			}).src
		).toBe('https://example.com/vendor.js');
		expect(
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
				scriptUrl: '   ',
			}).src
		).toBe('https://pi.pardot.com/pdt.js?aid=123456');
	});
});

it('skips a missing campaign or tracker domain', () => {
	expectSkippedScript(
		() => pardotTracking({ piAId: '123456', piCId: '' }),
		{ category: 'marketing', id: 'salesforce-pardot' },
		'pardotTracking: missing or invalid piCId'
	);
	expectSkippedScript(
		() => pardotTracking({ piAId: '123456', piCId: '654321' }),
		{ category: 'marketing', id: 'salesforce-pardot' },
		'pardotTracking: missing or invalid piDomain'
	);
});
it.each(['abc', '1&aid=2', '9007199254740993'])(
	'rejects invalid numeric account ID %s',
	(piAId) => {
		expectSkippedScript(
			() =>
				pardotTracking({ piAId, piCId: '654321', piDomain: 'pi.pardot.com' }),
			{ category: 'marketing', id: 'salesforce-pardot' },
			'pardotTracking: account and campaign IDs must be positive integers from the tracking snippet'
		);
	}
);
it('rejects a tracker URL where a hostname is required', () => {
	expectSkippedScript(
		() =>
			pardotTracking({
				piAId: '123456',
				piCId: '654321',
				piDomain: 'https://example.com/?x=1',
			}),
		{ category: 'marketing', id: 'salesforce-pardot' },
		'pardotTracking: tracker domain must be a hostname'
	);
});
it('skips an unknown mode', () => {
	expectSkippedScript(
		() =>
			pardotTracking({
				mode: 'legacy' as 'classic',
				piAId: '123456',
				piCId: '654321',
				piDomain: 'pi.pardot.com',
			}),
		{ category: 'marketing', id: 'salesforce-pardot' },
		"pardotTracking: mode must be 'consent' or 'classic'"
	);
});
