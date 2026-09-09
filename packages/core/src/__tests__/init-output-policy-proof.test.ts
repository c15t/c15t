import {
	normalizePolicyRule,
	createPolicyRuleFingerprints,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type { InitOutput, PolicyResolution } from '@c15t/schema/types';
import { describe, expect, test } from 'vitest';

import {
	initOutputToKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from '../transports/init-output';

const rule = normalizePolicyRule({
	categories: ['marketing'],
	id: 'proof-test',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
});
const matched: PolicyResolution = {
	fingerprints: createPolicyRuleFingerprints(rule),
	matchedBy: 'fallback',
	policy: rule,
	policyId: rule.id,
	status: 'matched',
};
// A legacy response intentionally omits policyResolution and carries stale proof.
const payload = {
	branding: 'c15t',
	cmpId: 123,
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: null },
	policy: { id: rule.id, model: 'opt-in' },
	policySnapshotToken: 'stale-token',
	translations: { language: 'en', translations: {} },
} as unknown as InitOutput;
const expectNoProof = (config: ReturnType<typeof initOutputToKernelConfig>) => {
	expect(config).not.toHaveProperty('initialPolicy');
	expect(config).not.toHaveProperty('initialPolicyDecision');
	expect(config.initialPolicySnapshotToken).toBeUndefined();
	expect(config.initialIab).toBeUndefined();
};

describe('prefetch policy metadata', () => {
	test.each([1, 99, null])(
		'drops legacy proof after failed negotiation %s',
		(producerContract) => {
			const config = initOutputToKernelConfig(
				payload,
				{},
				{ producerContract }
			);
			expect(config.initialPolicyResolution?.status).toBe('failed');
			expectNoProof(config);
		}
	);
	test.each<PolicyResolution>([
		{ policy: null, reason: 'invalid-payload', status: 'failed' },
		{ policy: null, status: 'no-match' },
		{ policy: null, status: 'unconfigured' },
	])('drops old and incoming metadata for $status', (resolution) => {
		const base = initOutputToKernelConfig({
			...payload,
			policyResolution: writePolicyResolutionWire(matched),
		});
		const next = mergeInitResponseIntoKernelConfig(base, {
			cmpId: 999,
			policyResolution: writePolicyResolutionWire(resolution),
			policySnapshotToken: 'another-stale-token',
		});
		expect(next.initialPolicyResolution?.status).toBe(resolution.status);
		expectNoProof(next);
		expect(next.initialTranslations).toEqual(base.initialTranslations);
		expect(base.initialPolicySnapshotToken).toBe('stale-token');
	});
	test('retains matched proof', () => {
		const config = initOutputToKernelConfig({
			...payload,
			policyResolution: writePolicyResolutionWire(matched),
		});
		expect(config.initialPolicySnapshotToken).toBe('stale-token');
		expect(config.initialPolicyResolution).toEqual(matched);
	});
});
