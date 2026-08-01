import { buildConsentId as shared } from '@c15t/schema/types';
import { assert, it } from 'vitest';
import { buildConsentId as shipped } from '~/handlers/subject/consent-idempotency';

it('shared derivation matches the shipping one byte for byte', async () => {
	const cases = [
		{
			subjectId: 'sub_1',
			domainId: 'dom_1',
			givenAt: new Date(1_700_000_000_000),
		},
		{
			tenantId: 't1',
			subjectId: 'sub_2',
			domainId: 'dom_2',
			policyId: 'pol_1',
			givenAt: new Date(1_800_000_123_456),
		},
		{
			subjectId: 'sub_3',
			domainId: 'dom_3',
			policyId: null,
			givenAt: new Date(1_650_000_000_000),
		},
	];
	for (const input of cases) {
		assert.strictEqual(
			await shared(input),
			await shipped(input),
			JSON.stringify(input)
		);
	}
});
