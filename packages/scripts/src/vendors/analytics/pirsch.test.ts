import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { pirsch } from './pirsch';

describe('pirsch', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = pirsch({
			identificationCode: 'PIRSCH-CONTRACT',
		});

		expectScriptMatchesIntegration('pirsch', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://api.pirsch.io/pa.js',
		});
		expect(script.defer).toBe(true);
		expect(script.attributes).toEqual({
			id: 'pianjs',
			'data-code': 'PIRSCH-CONTRACT',
		});
	});

	it('serializes optional script attributes', () => {
		const script = pirsch({
			identificationCode: ' PIRSCH-CONTRACT ',
			dev: 'example.com',
			domain: [
				'rollup.example.com:ROLLUP_CODE',
				'second.example.com:SECOND_CODE',
			],
			eventEndpoint: 'https://analytics.example.com/event',
			hitEndpoint: 'https://analytics.example.com/hit',
			disablePageViews: true,
		});

		expect(script.attributes).toEqual({
			id: 'pianjs',
			'data-code': 'PIRSCH-CONTRACT',
			'data-dev': 'example.com',
			'data-domain':
				'rollup.example.com:ROLLUP_CODE,second.example.com:SECOND_CODE',
			'data-event-endpoint': 'https://analytics.example.com/event',
			'data-hit-endpoint': 'https://analytics.example.com/hit',
			'data-disable-page-views': '',
		});
	});

	it('uses the extended loader and script element id', () => {
		const script = pirsch({
			identificationCode: 'PIRSCH-CONTRACT',
			extended: true,
		});

		expect(script.src).toBe('https://api.pirsch.io/pirsch-extended.js');
		expect(script.attributes?.id).toBe('pirschextendedjs');
	});

	it('honors a custom loader URL', () => {
		const script = pirsch({
			identificationCode: 'PIRSCH-CONTRACT',
			scriptUrl: 'https://cdn.example.com/pirsch.js',
		});

		expect(script.src).toBe('https://cdn.example.com/pirsch.js');
	});

	it('falls back to default URL when scriptUrl is blank', () => {
		const script = pirsch({
			identificationCode: 'PIRSCH-CONTRACT',
			scriptUrl: '   ',
		});

		expect(script.src).toBe('https://api.pirsch.io/pa.js');
	});

	it('throws for an empty identificationCode', () => {
		expect(() =>
			pirsch({
				identificationCode: '   ',
			})
		).toThrowError(
			'pirsch: invalid identificationCode - must be a non-empty string'
		);
	});
});
