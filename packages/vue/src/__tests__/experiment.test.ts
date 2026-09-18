import { EXPERIMENT_STORAGE_KEY } from '@c15t/core';
import type { ConsentExperiment } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentDraft } from '../runtime/composables/draft';
import { useResolvedPresentation } from '../runtime/composables/experiment';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import type { RuntimeConsentConfig } from '../runtime/kernel';
import { symbolKernelContext } from '../runtime/utils/symbols';

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

test('an untouched draft reseeds from the assigned arm; an edited one is kept', async () => {
	const config: RuntimeConsentConfig = {
		experiment: {
			...experiment,
			variants: {
				bar: { preferences: { defaults: { marketing: true } } },
				floating: { preferences: { defaults: { marketing: true } } },
			},
		},
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, config);
	app.mount(document.createElement('div'));
	let dispose = () => undefined as void;
	try {
		// Seeded before assignment, from the base presentation.
		expect(draft.values.value.marketing).toBe(false);
		draft.values.value.measurement = true;
		dispose = startVueConsentRuntime(context, config, { runInit: false });
		await nextTick();
		// The visitor edited the draft, so the arm's defaults do not replace it.
		expect(draft.values.value.marketing).toBe(false);
		expect(draft.values.value.measurement).toBe(true);
		draft.reset();
		expect(draft.values.value.marketing).toBe(true);
	} finally {
		dispose();
		app.unmount();
		context.dispose();
	}
});

test('an untouched draft picks up the assigned arm defaults', async () => {
	const config: RuntimeConsentConfig = {
		experiment: {
			...experiment,
			variants: {
				bar: { preferences: { defaults: { marketing: true } } },
				floating: { preferences: { defaults: { marketing: true } } },
			},
		},
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	let draft!: ReturnType<typeof useConsentDraft>;
	const app = createApp(
		defineComponent({
			setup() {
				draft = useConsentDraft();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, config);
	app.mount(document.createElement('div'));
	let dispose = () => undefined as void;
	try {
		expect(draft.values.value.marketing).toBe(false);
		dispose = startVueConsentRuntime(context, config, { runInit: false });
		await nextTick();
		expect(draft.values.value.marketing).toBe(true);
	} finally {
		dispose();
		app.unmount();
		context.dispose();
	}
});

test('the presentation resolves against the experiment the kernel was created with', async () => {
	const config = shallowRef<RuntimeConsentConfig>({
		experiment: { ...experiment, variant: 'bar' },
	});
	const context = createVueConsentKernelContext({
		config: config.value,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	let presentation!: ReturnType<typeof useResolvedPresentation>;
	const app = createApp(
		defineComponent({
			setup() {
				presentation = useResolvedPresentation();
				return () => h('div');
			},
		})
	);
	app.provide(symbolKernelContext, context);
	app.provide(consentConfigKey, config);
	app.mount(document.createElement('div'));
	try {
		expect(presentation.value?.prompt?.variant).toBe('bar');
		config.value = {
			experiment: {
				...experiment,
				variant: 'bar',
				variants: { bar: { prompt: { variant: 'wall' } } },
			},
		};
		await nextTick();
		expect(presentation.value?.prompt?.variant).toBe('bar');
	} finally {
		app.unmount();
		context.dispose();
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
