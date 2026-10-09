import { EXPERIMENT_STORAGE_KEY } from '@c15t/core';
import type { ConsentExperiment } from '@c15t/core';
import {
	createPolicyRuleFingerprints,
	normalizePolicyRule,
} from '@c15t/schema/types';
import type { PolicyResolution } from '@c15t/schema/types';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue';

import { consentConfigKey } from '../runtime/composables/config';
import { useConsentDraft } from '../runtime/composables/draft';
import { useResolvedPresentation } from '../runtime/composables/experiment';
import { symbolKernelContext } from '../runtime/utils/symbols';
import { createVueConsentKernelContext } from './test-kernel';
import type { RuntimeConsentConfig } from './test-kernel';

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
	arms: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
	id: 'banner-shape',
};

const start = function start(overrides: Partial<ConsentExperiment> = {}) {
	const config: RuntimeConsentConfig = {
		consentCategories: ['measurement', 'marketing'],
		experiment: { ...experiment, ...overrides },
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	context.start();
	const { dispose } = context;
	return { context, dispose };
};

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	localStorage.clear();
});

test('built-in assignment holds the banner until the arm is picked, then stores it', async () => {
	const { context, dispose } = start();
	try {
		// The server render and the first client render show no banner, so
		// the visitor never sees the base banner swap for their arm.
		expect(context.kernel.getServerSnapshot().activeUI).toBe('none');
		await vi.waitFor(() =>
			expect(context.snapshot.value.experimentPending).toBe(false)
		);
		const assignment = context.snapshot.value.experiment;
		expect(assignment).toMatchObject({
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
		expect(['control', 'bar', 'floating']).toContain(assignment?.arm);
		expect(context.snapshot.value.activeUI).toBe('banner');
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) ?? 'null')
		).toEqual({ arm: assignment?.arm, id: 'banner-shape' });
	} finally {
		dispose();
	}
});

test('an untouched draft reseeds from the assigned arm; an edited one is kept', async () => {
	const config: RuntimeConsentConfig = {
		consentCategories: ['measurement', 'marketing'],
		experiment: {
			...experiment,
			arms: {
				bar: { preferences: { defaults: { marketing: true } } },
				floating: { preferences: { defaults: { marketing: true } } },
			},
			// Both arms change the defaults; leave `control` out of the split.
			split: { bar: 1, floating: 1 },
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
	let dispose: () => void = () => undefined;
	try {
		// Seeded before assignment, from the base presentation.
		expect(draft.values.value.marketing).toBe(false);
		draft.values.value.measurement = true;
		context.start();
		({ dispose } = context);
		await vi.waitFor(() =>
			expect(context.snapshot.value.experimentPending).toBe(false)
		);
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
		consentCategories: ['measurement', 'marketing'],
		experiment: {
			...experiment,
			arms: {
				bar: { preferences: { defaults: { marketing: true } } },
				floating: { preferences: { defaults: { marketing: true } } },
			},
			// Both arms change the defaults; leave `control` out of the split.
			split: { bar: 1, floating: 1 },
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
	let dispose: () => void = () => undefined;
	try {
		expect(draft.values.value.marketing).toBe(false);
		context.start();
		({ dispose } = context);
		await vi.waitFor(() =>
			expect(context.snapshot.value.experimentPending).toBe(false)
		);
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
		experiment: { ...experiment, arm: 'bar' },
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
				arm: 'bar',
				arms: { bar: { prompt: { variant: 'wall' } } },
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
	const { context, dispose } = start({ arm: 'bar' });
	try {
		const expected = {
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'host',
			id: 'banner-shape',
		};
		expect(context.kernel.getServerSnapshot().experiment).toEqual(expected);
		expect(context.snapshot.value.experiment).toEqual(expected);
	} finally {
		dispose();
	}
});

test('arms are validated against the theme the app renders with', async () => {
	const error = vi.spyOn(console, 'error').mockImplementation(() => {
		// A rejected experiment is reported here.
	});
	// The arm makes reject as prominent as accept, which the configured
	// theme already does; without the theme the arm looks lopsided.
	const config: RuntimeConsentConfig = {
		consentCategories: ['measurement', 'marketing'],
		experiment: {
			arms: {
				quiet: {
					theme: {
						consentActions: { reject: { mode: 'filled', variant: 'primary' } },
					},
				},
			},
			id: 'button-style',
		},
		theme: {
			consentActions: {
				accept: { mode: 'filled', variant: 'primary' },
				reject: { mode: 'stroke', variant: 'neutral' },
			},
		},
	};
	const context = createVueConsentKernelContext({
		config,
		kernelConfig: { initialPolicyResolution: resolution },
	});
	context.start();
	try {
		// The experiment controller loads as its own chunk.
		await vi.waitFor(
			() => expect(context.snapshot.value.experimentPending).toBe(false),
			{ timeout: 5000 }
		);
		// Accepted: an arm (control or quiet) is assigned and nothing is
		// reported. A rejected experiment assigns none.
		expect(context.snapshot.value.experiment).toMatchObject({
			id: 'button-style',
		});
		expect(error).not.toHaveBeenCalled();
	} finally {
		context.dispose();
	}
});
