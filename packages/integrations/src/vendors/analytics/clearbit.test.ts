import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { clearbit } from './clearbit';

describe('clearbit', () => {
	setupScriptHelperTest();

	it('matches registry metadata with the default loader URL', () => {
		const script = clearbit({
			publishableKey: 'pk_contract',
		});

		expectScriptMatchesIntegration('clearbit', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://tag.clearbitscripts.com/v1/pk_contract/tags.js',
		});
		expect(script.attributes).toEqual({
			referrerpolicy: 'strict-origin-when-cross-origin',
		});
	});

	it('URL-encodes reserved characters in the publishable key', () => {
		const script = clearbit({ publishableKey: 'pk/with?chars' });

		expect(script.src).toBe(
			'https://tag.clearbitscripts.com/v1/pk%2Fwith%3Fchars/tags.js'
		);
	});

	it('logs and skips the script for publishable keys of the wrong type', () => {
		for (const publishableKey of [null, {}]) {
			expectSkippedScript(
				() => clearbit({ publishableKey: publishableKey as unknown as string }),
				{ category: 'marketing', id: 'clearbit' },
				'clearbit: missing or invalid publishableKey'
			);
		}
	});

	it('trims the publishable key before building the loader URL', () => {
		const script = clearbit({
			publishableKey: ' pk_contract ',
		});

		expect(script.src).toBe(
			'https://tag.clearbitscripts.com/v1/pk_contract/tags.js'
		);
	});

	it('honors a custom loader URL', () => {
		const script = clearbit({
			publishableKey: 'pk_contract',
			scriptUrl: 'https://cdn.example.com/clearbit-tags.js',
		});

		expect(script.src).toBe('https://cdn.example.com/clearbit-tags.js');
	});

	it('falls back to the default URL when scriptUrl is blank', () => {
		const script = clearbit({
			publishableKey: 'pk_contract',
			scriptUrl: '   ',
		});

		expect(script.src).toBe(
			'https://tag.clearbitscripts.com/v1/pk_contract/tags.js'
		);
	});

	it('logs and skips the script for an empty publishableKey', () => {
		expectSkippedScript(
			() => clearbit({ publishableKey: '   ' }),
			{ category: 'marketing', id: 'clearbit' },
			'clearbit: missing or invalid publishableKey'
		);
	});
});
