import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { notraAnalytics } from './notra-analytics';

const pinnedIntegrity =
	'sha384-LuUp5Hj+rSQ4/mZp1sWBOrJDHIHKGqflwF1GYIreqmWdCaI1otOQealWJGRj6Toj';
const pinnedPlusIntegrity =
	'sha384-MgLdHKufD0WdkO4pxtkT/bbNCKxl6PxOyUJe+M/qwFGfjOdZ5rEnljxTlOVQIzF+';

describe('notraAnalytics', () => {
	setupScriptHelperTest();

	it('loads the pinned build with integrity and the trimmed web key', () => {
		const script = notraAnalytics({ webKey: ' nwk.test_key ' });
		expectScriptMatchesIntegration('notraAnalytics', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://static.usenotra.com/notra.ce3c872ef9c9.js',
		});
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-api': 'https://ingest.usenotra.com/api/collect',
			'data-key': 'nwk.test_key',
			integrity: pinnedIntegrity,
		});
		expect(script.async).toBe(true);
	});

	it('loads the pinned error-reporting build and sets hash routing', () => {
		const script = notraAnalytics({
			errors: true,
			hash: true,
			webKey: 'nwk.test_key',
		});
		expect(script.src).toBe(
			'https://static.usenotra.com/notra.plus.d703b9cc5508.js'
		);
		expect(script.attributes).toMatchObject({
			'data-hash': '',
			integrity: pinnedPlusIntegrity,
		});
	});

	it('loads the pinned build from an endpoint and leaves collection to its origin', () => {
		const script = notraAnalytics({
			endpoint: ' https://notra.example.com// ',
			webKey: 'nwk.test_key',
		});
		expect(script.src).toBe(
			'https://notra.example.com/api/notra.ce3c872ef9c9.js'
		);
		expect(script.attributes).toEqual({
			crossorigin: 'anonymous',
			'data-key': 'nwk.test_key',
			integrity: pinnedIntegrity,
		});
	});

	it('loads a custom script URL without integrity and forwards the collection URL', () => {
		const script = notraAnalytics({
			apiUrl: ' https://example.com/collect ',
			endpoint: 'https://notra.example.com',
			errors: true,
			scriptUrl: ' https://cdn.example.com/notra.js ',
			webKey: 'nwk.test_key',
		});
		expect(script.src).toBe('https://cdn.example.com/notra.js');
		expect(script.attributes).toEqual({
			'data-api': 'https://example.com/collect',
			'data-key': 'nwk.test_key',
		});
	});

	it.each(['', '   ', 'test_key', 'pk_test_key'])(
		'skips a web key that is blank or lacks the nwk. prefix: %j',
		(webKey) => {
			expectSkippedScript(
				() => notraAnalytics({ webKey }),
				{ category: 'measurement', id: 'notra-analytics' },
				'notraAnalytics: missing or invalid webKey'
			);
		}
	);
});
