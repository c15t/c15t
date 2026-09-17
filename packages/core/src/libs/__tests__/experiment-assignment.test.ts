/**
 * @vitest-environment jsdom
 */
import { policyRulePresets } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import { createConsentRuntime } from '../../runtime';
import { custom } from '../../transports/mode';
import { createOfflineTransport } from '../../transports/offline';
import type { KernelEvent, KernelTransport } from '../../types';
import { assignExperimentVariant } from '../experiment';
import type { ConsentExperiment } from '../experiment';
import {
	EXPERIMENT_STORAGE_KEY,
	createExperimentController,
	readStoredExperimentAssignment,
	resolveExperimentAssignment,
	writeStoredExperimentAssignment,
} from '../experiment-assignment';

const choiceRule: PolicyRule = {
	...policyRulePresets.europeOptIn(),
	categories: ['marketing', 'measurement'],
	match: { isDefault: true },
	scopeMode: 'strict',
};

/** A notice prompt: a `wall` arm is invalid under it, valid under a choice. */
const noticeRule: PolicyRule = {
	categories: ['marketing'],
	id: 'notice',
	match: { isDefault: true },
	model: 'opt-out',
	prompt: 'notice',
	scopeMode: 'strict',
};

const experiment: ConsentExperiment = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
};

/** Host arm that only a choice policy accepts. */
const wallExperiment: ConsentExperiment = {
	id: 'banner-shape',
	variant: 'wall',
	variants: {
		control: {},
		wall: { prompt: { variant: 'wall' } },
	},
};

const quietReport = { error: () => undefined, warn: () => undefined };

/** A transport whose successive inits answer with the given rules. */
const sequencedTransport = function sequencedTransport(
	rules: PolicyRule[][]
): KernelTransport {
	const offline = rules.map((policyRules) =>
		createOfflineTransport({ policyRules })
	);
	let attempt = 0;
	return {
		init: (context) => {
			const transport = offline[Math.min(attempt, offline.length - 1)];
			attempt += 1;
			return (transport as KernelTransport).init(context);
		},
		save: vi.fn().mockResolvedValue({ ok: true }),
	};
};

beforeEach(() => {
	localStorage.clear();
	document.cookie = `${EXPERIMENT_STORAGE_KEY}=; max-age=0; path=/`;
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('createExperimentController', () => {
	test('validates arm themes over the host theme', () => {
		const kernel = createConsentKernel();
		// The arm keeps accept and reject in the same fill: `default` supplies
		// the variant and mode for both, and the arm repeats the mode on
		// accept. Without the host theme, reject would fall back to a stroke.
		expect(() =>
			createExperimentController({
				experiment: {
					id: 'button-style',
					variants: {
						control: {},
						filled: { theme: { consentActions: { accept: { mode: 'fill' } } } },
					},
				},
				kernel,
				report: quietReport,
				theme: {
					consentActions: { default: { mode: 'fill', variant: 'primary' } },
				},
			})
		).not.toThrow();
		kernel.dispose();
	});

	test('re-validates before the impression is stamped, so surface:shown and choice:recorded agree', async () => {
		// Valid under the construction-time fallback (a choice prompt), rejected
		// by the notice policy the transport resolves.
		const transport = sequencedTransport([[noticeRule]]);
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const runtime = createConsentRuntime({
			experiment: wallExperiment,
			mode: custom(transport),
		});
		const shown: KernelEvent[] = [];
		const recorded: KernelEvent[] = [];
		runtime.kernel.events.on('surface:shown', (event) => shown.push(event));
		runtime.kernel.events.on('choice:recorded', (event) =>
			recorded.push(event)
		);
		runtime.start();
		await vi.waitFor(() => expect(shown).toHaveLength(1));
		expect(error).toHaveBeenCalledOnce();
		expect(shown[0]).not.toHaveProperty('experiment');
		expect(shown[0]).toMatchObject({ surface: 'banner' });
		expect(runtime.kernel.getSnapshot().experiment).toBeNull();
		await runtime.kernel.commands.save('all');
		expect(recorded).toHaveLength(1);
		expect(recorded[0]).not.toHaveProperty('experiment');
		runtime.dispose();
	});

	test('a rejection is per policy: the arm returns with the policy that accepted it', async () => {
		const transport = sequencedTransport([
			[choiceRule],
			[noticeRule],
			[choiceRule],
		]);
		const kernel = createConsentKernel({ transport });
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		const arm = assignExperimentVariant(wallExperiment, '');
		expect(kernel.getSnapshot().experiment).toEqual(arm);

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe(choiceRule.id);
		expect(kernel.getSnapshot().experiment).toEqual(arm);

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe('notice');
		expect(kernel.getSnapshot().experiment).toBeNull();

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe(choiceRule.id);
		expect(kernel.getSnapshot().experiment).toEqual(arm);

		controller.dispose();
		kernel.dispose();
	});
});

describe('resolveExperimentAssignment', () => {
	test('re-hashes with the stored key when the stored arm no longer exists', () => {
		const stored = {
			acknowledgedDiagnostics: false,
			assignedBy: 'c15t' as const,
			id: 'banner-shape',
			key: 'key_1',
			variant: 'wall',
		};
		const { assignment, record } = resolveExperimentAssignment({
			experiment,
			stored,
		});
		expect(assignment).toEqual(assignExperimentVariant(experiment, 'key_1'));
		expect(Object.keys(experiment.variants)).toContain(assignment.variant);
		expect(record).toEqual({ ...assignment, key: 'key_1' });
	});
});

describe('stored assignment cookie fallback', () => {
	test('writes and reads the cookie when localStorage is unavailable', () => {
		vi.stubGlobal('localStorage', null);
		const record = {
			acknowledgedDiagnostics: false,
			assignedBy: 'c15t' as const,
			id: 'banner-shape',
			key: 'key_1',
			variant: 'bar',
		};
		writeStoredExperimentAssignment(record);
		expect(document.cookie).toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		expect(readStoredExperimentAssignment()).toEqual(record);
	});

	test('an unreadable cookie reads as no record', () => {
		vi.stubGlobal('localStorage', null);
		document.cookie = `${EXPERIMENT_STORAGE_KEY}=%7B; path=/`;
		expect(readStoredExperimentAssignment()).toBeNull();
	});
});
