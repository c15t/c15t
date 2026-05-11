import { describe, expect, it } from 'vitest';
import {
	expectScriptMatchesIntegration,
	getTestGlobal,
	runOnBeforeLoad,
	setupScriptHelperTest,
} from '../../__tests__/helpers';
import { linkedinInsights } from './linkedin-insights';

describe('linkedinInsights', () => {
	setupScriptHelperTest();

	it('matches registry metadata with default loader URL', () => {
		const script = linkedinInsights({ id: '987654' });

		expectScriptMatchesIntegration('linkedinInsights', script, {
			alwaysLoad: undefined,
			persistAfterConsentRevoked: undefined,
			src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		});
	});

	it('sets LinkedIn globals and initializes lintrk queue', () => {
		const globalRef = getTestGlobal();
		const script = linkedinInsights({ id: '987654' });

		runOnBeforeLoad(script);

		expect(globalRef._linkedin_partner_id).toBe('987654');
		expect(globalRef._linkedin_data_partner_ids).toEqual(['987654']);

		const lintrk = globalRef.lintrk as
			| (((...args: unknown[]) => void) & { q?: unknown[][] })
			| undefined;
		expect(typeof lintrk).toBe('function');
		expect(lintrk?.q).toEqual([]);

		lintrk?.('track', { conversion_id: 'abc123' });
		expect(lintrk?.q).toEqual([['track', { conversion_id: 'abc123' }]]);
	});

	it('supports overriding the loader URL', () => {
		const script = linkedinInsights({
			id: '987654',
			scriptSrc: 'https://cdn.example.com/insight.min.js',
		});

		expect(script.src).toBe('https://cdn.example.com/insight.min.js');
	});
});
