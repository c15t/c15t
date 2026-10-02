import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import type { SavePayload } from '../../types';
import { createHostedRecordTransport } from '../hosted-records';
import { mapSubjectRecordToHydrationRecords } from '../subject-record';

const rule = matchedResolution(
	optInRule({
		exemptions: { measurement: { kind: 'uk-statistics', revision: '1' } },
		match: { countries: ['GB'] },
	})
);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
});

describe('exemption preference transports', () => {
	test('custom transport receives preference evidence independently of explicit consent', async () => {
		const saved: SavePayload[] = [];
		const kernel = createConsentKernel({
			initialPolicyResolution: rule,
			now: NOW,
			transport: {
				save: (payload) => {
					saved.push(payload);
					return Promise.resolve({ ok: true, subjectId: payload.subjectId });
				},
			},
		});
		await kernel.commands.save({ measurement: false });
		expect(saved[0]?.confirmed.categories).toEqual({});
		expect(saved[0]?.choice.categories.measurement).toBeUndefined();
		expect(saved[0]?.exemptionPreferences).toEqual({
			categories: { measurement: { confirmedAt: NOW, value: false } },
			version: 1,
		});
		kernel.dispose();
	});
	test('hosted save carries objection and read restores it without a receipt', async () => {
		const requests: RequestInit[] = [];
		const preferences = {
			categories: { measurement: { confirmedAt: NOW, value: false } },
			version: 1,
		};
		const transport = createHostedRecordTransport({
			backendURL: 'https://example.com/api',
			fetch: (_url, init) => {
				if (init) {
					requests.push(init);
				}
				return Promise.resolve(
					new Response(
						JSON.stringify(
							init?.method === 'POST'
								? { subjectId: 'sub_transport' }
								: {
										consents: [],
										isValid: true,
										subject: { id: 'sub_transport' },
										subjectChoice: null,
										subjectExemptionPreferences: preferences,
									}
						)
					)
				);
			},
			now: () => NOW,
		});
		const kernel = createConsentKernel({
			initialPolicyResolution: rule,
			now: NOW,
			transport,
		});
		await kernel.commands.save({ measurement: false });
		const raw = requests[0]?.body;
		if (typeof raw !== 'string') {
			throw new Error('Expected a JSON body');
		}
		const body = JSON.parse(raw);
		expect(body.exemptionPreferences).toEqual(preferences);
		expect(body.choice).toEqual({ categories: {}, version: 3 });
		expect(body.preferences).toEqual({ necessary: true });
		const records = await transport.loadSubjectRecord('sub_transport');
		expect(records?.exemptionPreferences).toEqual(preferences);
		expect(records?.choice).toBeNull();
		kernel.dispose();
	});
	test('future preference evidence cannot grant processing on hydration', () => {
		const mapped = mapSubjectRecordToHydrationRecords(
			{
				consents: [],
				isValid: true,
				subject: { id: 'sub_transport' },
				subjectExemptionPreferences: {
					categories: {
						measurement: { confirmedAt: NOW + 60_000, value: true },
					},
					version: 1,
				},
			},
			{ now: NOW }
		);
		expect(mapped.exemptionPreferences).toBeNull();
	});
});
