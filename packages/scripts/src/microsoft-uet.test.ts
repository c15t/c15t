import { describe, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from './__tests__/helpers';
import { microsoftUet } from './microsoft-uet';

describe('microsoftUet', () => {
	setupScriptHelperTest();

	it('matches registry metadata and default script output', () => {
		expectScriptMatchesIntegration('microsoftUet', microsoftUet({ id: 'uet-123' }), {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: true,
			src: '//bat.bing.com/bat.js',
		});
	});
});
