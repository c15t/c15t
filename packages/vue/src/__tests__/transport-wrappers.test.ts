import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import { translations } from '@c15t/translations/en';
import { afterEach, expect, test, vi } from 'vitest';

import { createVueConsentKernelContext } from '../runtime/kernel';
import type { RuntimeConsentConfig } from '../runtime/kernel';

type FetchRequest = (
	...args: Parameters<typeof fetch>
) => ReturnType<typeof fetch>;

const now = 1_800_000_000_000;
const subjectId = 'backend+literal';
const subjectURL = '/api/review/subjects/backend%2Bliteral';
const policy = normalizePolicyRule({
	categories: ['marketing', 'measurement'],
	id: 'vue-transport',
	match: { fallback: true },
	model: 'opt-out',
	privacySignals: { gpc: { denyCategories: ['marketing'] } },
	prompt: 'notice',
	scopeMode: 'permissive',
});
const fingerprints = createPolicyRuleFingerprints(policy);
const prefetch = {
	branding: 'c15t' as const,
	location: { countryCode: 'DE', regionCode: null },
	policyResolution: writePolicyResolutionWire({
		fingerprints,
		matchedBy: 'fallback',
		policy,
		policyId: policy.id,
		status: 'matched',
	}),
	subjectId,
	translations: { language: 'en', translations },
};
const modes: RuntimeConsentConfig['manifest'][] = [
	undefined,
	'client',
	'server',
];
const disposers: (() => void)[] = [];
afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	vi.restoreAllMocks();
});

const receipt = {
	basis: { fingerprint: fingerprints.choice, kind: 'choice-v1' },
	confirmedAt: now - 1000,
	value: true,
};

// Use the public Vue context and real transports: injected kernel transports
// cannot detect methods lost by a framework wrapper.
test.each(modes)(
	'%s transport identifies and hydrates server records without writes',
	async (manifest) => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
		const fetchMock = vi.fn<FetchRequest>((url, init) =>
			Promise.resolve(
				Response.json(
					String(url) === subjectURL && init?.method === 'GET'
						? {
								consents: [],
								subject: { externalId: 'person', id: subjectId },
								subjectChoice: {
									categories: { marketing: receipt },
									version: 3,
								},
							}
						: {}
				)
			)
		);
		const onChoiceRecorded = vi.fn();
		const context = createVueConsentKernelContext({
			config: {
				backendURL: '/api/review',
				callbacks: { onChoiceRecorded },
				customFetch: Object.assign(fetchMock, { preconnect: vi.fn() }),
				manifest,
			},
			now,
			prefetch,
			producerContract: 1,
		});
		disposers.push(context.dispose);
		context.kernel.hydrate({});
		expect(
			fetchMock.mock.calls.filter(
				([url]) => String(url) !== '/api/c15t/manifest'
			)
		).toEqual([]);
		await context.kernel.commands.identify({ externalId: 'person' });
		expect(
			fetchMock.mock.calls
				.filter(([url]) => String(url) === subjectURL)
				.map(([, init]) => init?.method)
		).toEqual(['PATCH', 'GET']);
		expect(context.snapshot.value.subject).toEqual({
			externalId: 'person',
			subjectId,
		});
		expect(context.snapshot.value.explicitChoice?.categories.marketing).toEqual(
			receipt
		);
		expect(onChoiceRecorded).not.toHaveBeenCalled();
		expect(
			fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
		).toEqual([]);
	}
);

test.each(modes)(
	'%s transport keeps detected GPC in the browser',
	async (manifest) => {
		vi.spyOn(Date, 'now').mockReturnValue(now);
		const fetchMock = vi.fn<FetchRequest>((url, init) =>
			Promise.resolve(
				Response.json(
					String(url) === subjectURL && init?.method === 'GET'
						? { consents: [], subject: { externalId: 'person', id: subjectId } }
						: {}
				)
			)
		);
		const onChoiceRecorded = vi.fn();
		const context = createVueConsentKernelContext({
			config: {
				backendURL: '/api/review',
				callbacks: { onChoiceRecorded },
				customFetch: Object.assign(fetchMock, { preconnect: vi.fn() }),
				manifest,
			},
			now,
			prefetch,
			producerContract: 1,
		});
		disposers.push(context.dispose);
		context.kernel.hydrate({});
		await context.kernel.commands.identify({ externalId: 'person' });
		const requests = fetchMock.mock.calls.length;
		context.kernel.set.privacySignals({ gpc: true });
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(context.snapshot.value.privacySignals.gpc.active).toBe(true);
		expect(context.snapshot.value.effectivePermissions.marketing).toBe(false);
		expect(fetchMock.mock.calls).toHaveLength(requests);
		expect(context.snapshot.value.subject?.subjectId).toBe(subjectId);
		expect(onChoiceRecorded).not.toHaveBeenCalled();
	}
);
