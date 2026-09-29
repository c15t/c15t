import * as v from 'valibot';
import { describe, expect, it } from 'vitest';

import { getSubjectOutputSchema } from './get';

describe('getSubjectOutputSchema', () => {
	// 3.0.0-alpha.0 to alpha.3 backends return `privacyDirectives`. A newer
	// client talking to one of them must parse the response and ignore it.
	it('accepts and drops privacyDirectives from older alpha backends', () => {
		const result = v.safeParse(getSubjectOutputSchema, {
			consents: [],
			isValid: true,
			privacyDirectives: [
				{
					authority: 'subject',
					categories: ['marketing'],
					id: 'pd_1',
					recordedAt: 1_735_689_600_000,
					signalHeader: true,
					source: 'gpc',
				},
			],
			subject: { id: 'sub_user1' },
		});

		expect(result.success).toBe(true);
		expect(result.output).not.toHaveProperty('privacyDirectives');
	});
});
