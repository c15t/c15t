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
import type { ConsentExperiment } from '../experiment';
import {
	createExperimentController,
	readStoredExperimentAssignment,
	resolveExperimentAssignment,
	writeStoredExperimentAssignment,
} from '../experiment-assignment';
import { assignExperimentVariant } from '../experiment-engine';
import { EXPERIMENT_STORAGE_KEY } from '../storage-keys';

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
			if (!transport) {
				throw new Error('sequencedTransport requires at least one rule set');
			}
			return transport.init(context);
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

const storedRaw = () => localStorage.getItem(EXPERIMENT_STORAGE_KEY);

describe('createExperimentController', () => {
	test('checks themed arms over the host theme', async () => {
		const error = vi.fn();
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			transport: createOfflineTransport({ policyRules: [choiceRule] }),
		});
		// The arm keeps accept and reject in the same fill: `default` supplies
		// the variant and mode for both, and the arm repeats the mode on
		// accept. Without the host theme, reject would fall back to a stroke.
		const controller = createExperimentController({
			experiment: {
				id: 'button-style',
				variant: 'filled',
				variants: {
					control: {},
					filled: { theme: { consentActions: { accept: { mode: 'fill' } } } },
				},
			},
			kernel,
			report: { error, warn: () => undefined },
			theme: {
				consentActions: { default: { mode: 'fill', variant: 'primary' } },
			},
		});
		await kernel.commands.init();
		expect(error).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().experiment?.variant).toBe('filled');
		controller.dispose();
		kernel.dispose();
	});

	test('an impression under a policy that rejects the arm carries no arm, and neither does the choice', async () => {
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

	test('an invalid definition runs no experiment and releases the held prompt', async () => {
		const error = vi.fn();
		const kernel = createConsentKernel({
			initialExperimentPending: true,
			initialPolicyPending: true,
			transport: createOfflineTransport({ policyRules: [choiceRule] }),
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		createExperimentController({
			experiment: { ...experiment, weights: { bar: 1, floatng: 1 } },
			kernel,
			report: { error, warn: () => undefined },
		});
		expect(error).toHaveBeenCalledOnce();
		expect(String(error.mock.calls[0]?.[0])).toContain('"floatng"');
		expect(kernel.getSnapshot().experiment).toBeNull();
		expect(kernel.getSnapshot().experimentPending).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		kernel.dispose();
	});

	test('stores a built-in arm only once the banner has shown it, without a key', async () => {
		const kernel = createConsentKernel({
			initialExperimentPending: true,
			initialPolicyPending: true,
			transport: createOfflineTransport({ policyRules: [choiceRule] }),
		});
		const controller = createExperimentController({
			createKey: () => 'random-key',
			experiment,
			kernel,
			report: quietReport,
		});
		expect(storedRaw()).toBeNull();
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		const { variant } = assignExperimentVariant(experiment, 'random-key');
		expect(JSON.parse(storedRaw() ?? 'null')).toEqual({
			id: 'banner-shape',
			variant,
		});
		controller.dispose();
		kernel.dispose();
	});

	test('stores nothing for a visitor who is never prompted', async () => {
		const kernel = createConsentKernel({
			initialExperimentPending: true,
			initialPolicyPending: true,
			transport: createOfflineTransport({
				policyRules: [{ ...choiceRule, prompt: 'none' }],
			}),
		});
		const controller = createExperimentController({
			experiment,
			kernel,
			report: quietReport,
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		expect(storedRaw()).toBeNull();
		expect(document.cookie).not.toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		controller.dispose();
		kernel.dispose();
	});

	test('never stores a host-resolved arm', async () => {
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			transport: createOfflineTransport({ policyRules: [choiceRule] }),
		});
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(kernel.getSnapshot().experiment?.variant).toBe('wall');
		expect(storedRaw()).toBeNull();
		controller.dispose();
		kernel.dispose();
	});

	test('a choice from a dialog opened without the banner carries no arm', async () => {
		const kernel = createConsentKernel({
			initialPolicyPending: true,
			transport: createOfflineTransport({
				policyRules: [{ ...choiceRule, prompt: 'none' }],
			}),
		});
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		const events: KernelEvent[] = [];
		kernel.events.on('surface:shown', (event) => events.push(event));
		kernel.events.on('choice:recorded', (event) => events.push(event));
		await kernel.commands.init();
		expect(kernel.getSnapshot().experiment?.variant).toBe('wall');
		kernel.set.activeUI('dialog');
		await kernel.commands.save('all');
		expect(events.map((event) => event.type)).toEqual([
			'surface:shown',
			'choice:recorded',
		]);
		for (const event of events) {
			expect(event).not.toHaveProperty('experiment');
		}
		controller.dispose();
		kernel.dispose();
	});
});

describe('resolveExperimentAssignment', () => {
	test('hashes the subject id', () => {
		const assignment = resolveExperimentAssignment({
			experiment,
			stored: null,
			subjectId: 'sub_1',
		});
		expect(assignment).toEqual(assignExperimentVariant(experiment, 'sub_1'));
	});

	test('keeps a seeded arm over the stored one', () => {
		const seeded = assignExperimentVariant(experiment, 'server');
		const stored = {
			id: 'banner-shape',
			variant: seeded.variant === 'bar' ? 'floating' : 'bar',
		};
		expect(resolveExperimentAssignment({ experiment, seeded, stored })).toEqual(
			seeded
		);
	});

	test('reuses a stored arm of the same experiment', () => {
		const assignment = resolveExperimentAssignment({
			createKey: () => 'unused',
			experiment,
			stored: { id: 'banner-shape', variant: 'floating' },
		});
		expect(assignment).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'c15t',
			id: 'banner-shape',
			variant: 'floating',
		});
	});

	test('a stored arm named after a prototype property is not reused', () => {
		const assignment = resolveExperimentAssignment({
			experiment,
			stored: { id: 'banner-shape', variant: 'constructor' },
		});
		expect(Object.keys(experiment.variants)).toContain(assignment.variant);
	});

	test('re-assigns when the stored arm no longer exists', () => {
		const assignment = resolveExperimentAssignment({
			createKey: () => 'key_1',
			experiment,
			stored: { id: 'banner-shape', variant: 'wall' },
		});
		expect(assignment).toEqual(assignExperimentVariant(experiment, 'key_1'));
	});
});

describe('stored assignment', () => {
	test('ignores a host arm an earlier build stored', () => {
		localStorage.setItem(
			EXPERIMENT_STORAGE_KEY,
			JSON.stringify({
				acknowledgedDiagnostics: false,
				assignedBy: 'host',
				id: 'banner-shape',
				variant: 'bar',
			})
		);
		expect(readStoredExperimentAssignment()).toBeNull();
	});

	test('writes and reads the cookie when localStorage is unavailable', () => {
		vi.stubGlobal('localStorage', null);
		writeStoredExperimentAssignment({ id: 'banner-shape', variant: 'bar' });
		expect(document.cookie).toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		expect(readStoredExperimentAssignment()).toEqual({
			id: 'banner-shape',
			variant: 'bar',
		});
	});

	test('a localStorage write drops a stale fallback cookie', () => {
		const stale = { id: 'banner-shape', variant: 'bar' };
		const store = localStorage;
		vi.stubGlobal('localStorage', null);
		writeStoredExperimentAssignment(stale);
		vi.stubGlobal('localStorage', store);
		writeStoredExperimentAssignment({ ...stale, variant: 'floating' });
		expect(document.cookie).not.toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		// localStorage gone again: nothing old comes back through the cookie.
		vi.stubGlobal('localStorage', null);
		expect(readStoredExperimentAssignment()).toBeNull();
	});

	test('an unreadable cookie reads as no record', () => {
		vi.stubGlobal('localStorage', null);
		document.cookie = `${EXPERIMENT_STORAGE_KEY}=%7B; path=/`;
		expect(readStoredExperimentAssignment()).toBeNull();
	});
});
