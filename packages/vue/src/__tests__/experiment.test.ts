import { EXPERIMENT_STORAGE_KEY } from '@c15t/core';
import type { ConsentExperiment } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test } from 'vitest';

import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import type { RuntimeConsentConfig } from '../runtime/kernel';

const policy = normalizePolicyRule({
	categories: ['measurement', 'marketing'],
	id: 'vue-experiment',
	match: { fallback: true },
	model: 'opt-in',
	prompt: 'choice',
	scopeMode: 'permissive',
});
const resolution: PolicyResolution = {
	fingerprints: createPolicyRuleFingerprints(policy),
	matchedBy: 'fallback',
	policy,
	policyId: policy.id,
	status: 'matched',
};

const experiment: ConsentExperiment = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
};

const start = function start(overrides: Partial<ConsentExperiment> = {}) {
	const config: RuntimeConsentConfig = {
		experiment: { ...experiment, ...overrides },
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	const dispose = startVueConsentRuntime(context, config, { runInit: false });
	return { context, dispose };
};

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	localStorage.clear();
});

test('built-in assignment lands in the snapshot on start and is stored', () => {
	const { context, dispose } = start();
	try {
		const assignment = context.snapshot.value.experiment;
		expect(assignment).toMatchObject({
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
		expect(['bar', 'floating']).toContain(assignment?.variant);
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) ?? 'null')
		).toMatchObject({ id: 'banner-shape', variant: assignment?.variant });
	} finally {
		dispose();
	}
});

test('a host variant is on the server snapshot and survives start', () => {
	const { context, dispose } = start({ variant: 'bar' });
	try {
		const expected = {
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'bar',
		};
		expect(context.kernel.getServerSnapshot().experiment).toEqual(expected);
		expect(context.snapshot.value.experiment).toEqual(expected);
	} finally {
		dispose();
	}
});
