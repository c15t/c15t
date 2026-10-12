import { describe, expect, it } from 'vitest';

import {
	expectScriptMatchesIntegration,
	expectSkippedScript,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { promptwatch } from './promptwatch';

describe('promptwatch', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = promptwatch({
			projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
		});

		expectScriptMatchesIntegration('promptwatch', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://ingest.promptwatch.com/js/client.min.js',
		});
		expect(script.attributes).toEqual({
			'data-project-id': '7d60345b-27bb-4779-a385-d4fc19ce732c',
		});
	});

	it('honors a custom loader URL', () => {
		const script = promptwatch({
			projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
			scriptUrl: 'https://cdn.example.com/promptwatch.js',
		});

		expect(script.src).toBe('https://cdn.example.com/promptwatch.js');
	});

	it('falls back to default URL when scriptUrl is blank', () => {
		const script = promptwatch({
			projectId: '7d60345b-27bb-4779-a385-d4fc19ce732c',
			scriptUrl: '   ',
		});

		expect(script.src).toBe('https://ingest.promptwatch.com/js/client.min.js');
	});

	it('logs and skips the script for an empty projectId', () => {
		expectSkippedScript(
			() => promptwatch({ projectId: '   ' }),
			{ category: 'measurement', id: 'promptwatch' },
			'promptwatch: missing or invalid projectId'
		);
	});
});
