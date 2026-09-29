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
import { createExperimentController } from '../experiment-assignment';
import {
	readStoredExperimentArm,
	writeStoredExperimentArm,
} from '../experiment-storage';
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
	arms: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
	id: 'banner-shape',
};

/** Host arm that only a choice policy accepts. */
const wallExperiment: ConsentExperiment = {
	arm: 'wall',
	arms: {
		wall: { prompt: { variant: 'wall' } },
	},
	id: 'banner-shape',
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

const hostWall = {
	acknowledgedDiagnostics: false,
	arm: 'wall',
	assignedBy: 'host',
	id: 'banner-shape',
} as const;

/** A kernel that runs `rules`, holding the prompt with `arm` on it. */
const heldKernel = function heldKernel(
	rules: PolicyRule[],
	arm?: typeof hostWall | { arm: string; assignedBy: 'c15t' }
) {
	return createConsentKernel({
		initialExperiment: arm ? { ...hostWall, ...arm } : undefined,
		initialExperimentPending: true,
		initialPolicyPending: true,
		transport: createOfflineTransport({ policyRules: rules }),
	});
};

describe('createExperimentController', () => {
	test('the gate releases the held prompt with the arm', async () => {
		const kernel = heldKernel([choiceRule], hostWall);
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(kernel.getSnapshot().experiment).toEqual(hostWall);
		controller.dispose();
		kernel.dispose();
	});

	test('checks themed arms over the host theme', async () => {
		const error = vi.fn();
		const kernel = heldKernel([choiceRule], {
			...hostWall,
			arm: 'filled',
		});
		// The arm keeps accept and reject in the same fill: `default` supplies
		// the variant and mode for both, and the arm repeats the mode on
		// accept. Without the host theme, reject would fall back to a stroke.
		const controller = createExperimentController({
			experiment: {
				arm: 'filled',
				arms: {
					filled: { theme: { consentActions: { accept: { mode: 'fill' } } } },
				},
				id: 'banner-shape',
			},
			kernel,
			report: { error, warn: () => undefined },
			theme: {
				consentActions: { default: { mode: 'fill', variant: 'primary' } },
			},
		});
		await kernel.commands.init();
		expect(error).not.toHaveBeenCalled();
		expect(kernel.getSnapshot().experiment?.arm).toBe('filled');
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
		const kernel = createConsentKernel({
			initialExperiment: hostWall,
			transport,
		});
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe(choiceRule.id);
		expect(kernel.getSnapshot().experiment).toEqual(hostWall);

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe('notice');
		expect(kernel.getSnapshot().experiment).toBeNull();

		await kernel.commands.init();
		expect(kernel.getSnapshot().policyRule.id).toBe(choiceRule.id);
		expect(kernel.getSnapshot().experiment).toEqual(hostWall);

		controller.dispose();
		kernel.dispose();
	});

	test('no arm on the kernel releases the prompt and runs no experiment', async () => {
		const kernel = heldKernel([choiceRule]);
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('none');
		const controller = createExperimentController({
			experiment,
			kernel,
			report: quietReport,
		});
		expect(controller.assignment).toBeNull();
		expect(kernel.getSnapshot().experimentPending).toBe(false);
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		kernel.dispose();
	});

	test('stores a c15t-picked arm only once the banner has shown it', async () => {
		const kernel = heldKernel([choiceRule], { arm: 'bar', assignedBy: 'c15t' });
		const controller = createExperimentController({
			experiment,
			kernel,
			report: quietReport,
		});
		expect(storedRaw()).toBeNull();
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(JSON.parse(storedRaw() ?? 'null')).toEqual({
			arm: 'bar',
			id: 'banner-shape',
		});
		controller.dispose();
		kernel.dispose();
	});

	test('stores nothing for a visitor who is never prompted', async () => {
		const kernel = heldKernel([{ ...choiceRule, prompt: 'none' }], {
			arm: 'bar',
			assignedBy: 'c15t',
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

	test('never stores a host arm', async () => {
		const kernel = heldKernel([choiceRule], hostWall);
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		await kernel.commands.init();
		expect(kernel.getSnapshot().activeUI).toBe('banner');
		expect(storedRaw()).toBeNull();
		controller.dispose();
		kernel.dispose();
	});

	test('a choice from a dialog opened without the banner carries no arm', async () => {
		const kernel = heldKernel([{ ...choiceRule, prompt: 'none' }], hostWall);
		const controller = createExperimentController({
			experiment: wallExperiment,
			kernel,
			report: quietReport,
		});
		const events: KernelEvent[] = [];
		kernel.events.on('surface:shown', (event) => events.push(event));
		kernel.events.on('choice:recorded', (event) => events.push(event));
		await kernel.commands.init();
		expect(kernel.getSnapshot().experiment?.arm).toBe('wall');
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

describe('stored arm', () => {
	test('writes and reads the cookie when localStorage is unavailable', () => {
		vi.stubGlobal('localStorage', null);
		writeStoredExperimentArm({ arm: 'bar', id: 'banner-shape' });
		expect(document.cookie).toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		expect(readStoredExperimentArm()).toEqual({
			arm: 'bar',
			id: 'banner-shape',
		});
	});

	test('a localStorage write drops a stale fallback cookie', () => {
		const stale = { arm: 'bar', id: 'banner-shape' };
		const store = localStorage;
		vi.stubGlobal('localStorage', null);
		writeStoredExperimentArm(stale);
		vi.stubGlobal('localStorage', store);
		writeStoredExperimentArm({ ...stale, arm: 'floating' });
		expect(document.cookie).not.toContain(`${EXPERIMENT_STORAGE_KEY}=`);
		// localStorage gone again: nothing old comes back through the cookie.
		vi.stubGlobal('localStorage', null);
		expect(readStoredExperimentArm()).toBeNull();
	});

	test('an unreadable cookie reads as no record', () => {
		vi.stubGlobal('localStorage', null);
		document.cookie = `${EXPERIMENT_STORAGE_KEY}=%7B; path=/`;
		expect(readStoredExperimentArm()).toBeNull();
	});
});
