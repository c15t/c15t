import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
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

	it('throws for an empty projectId', () => {
		expect(() =>
			promptwatch({
				projectId: '   ',
			})
		).toThrowError(
			'promptwatch: invalid projectId - must be a non-empty string'
		);
	});
});
