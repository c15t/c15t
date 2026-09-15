/**
 * @vitest-environment jsdom
 */
import { policyRulePresets } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConsentExperiment } from '../../libs/experiment';
import { EXPERIMENT_STORAGE_KEY } from '../../libs/experiment-assignment';
import { custom } from '../../transports/mode';
import { createOfflineTransport } from '../../transports/offline';
import type { KernelEvent, KernelTransport, SavePayload } from '../../types';
import { createConsentRuntime } from '../index';

const policyRules: PolicyRule[] = [
	{
		...policyRulePresets.europeOptIn(),
		categories: ['marketing', 'measurement'],
		match: { isDefault: true },
		scopeMode: 'strict',
	},
];

const experiment: ConsentExperiment = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
};

const createTransport = function createTransport(): KernelTransport {
	const offline = createOfflineTransport({ policyRules });
	return {
		init: vi.fn((context) => offline.init(context)),
		save: vi.fn().mockResolvedValue({ ok: true }),
	};
};

const createRuntime = function createRuntime(
	overrides: Partial<ConsentExperiment> = {},
	transport = createTransport()
) {
	const runtime = createConsentRuntime({
		experiment: { ...experiment, ...overrides },
		mode: custom(transport),
	});
	return { runtime, transport };
};

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	vi.restoreAllMocks();
	delete (window as { c15t?: unknown }).c15t;
});

describe('runtime experiments', () => {
	test('assignment is sticky across runtimes sharing storage', () => {
		const first = createRuntime();
		first.runtime.start();
		const assignment = first.runtime.kernel.getSnapshot().experiment;
		expect(assignment).toMatchObject({
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
		expect(localStorage.getItem(EXPERIMENT_STORAGE_KEY)).toContain(
			assignment?.variant
		);
		first.runtime.dispose();

		// Force the other arm on a fresh hash so stickiness, not luck, is tested.
		const stored = JSON.parse(
			localStorage.getItem(EXPERIMENT_STORAGE_KEY) as string
		) as { variant: string };
		const other = stored.variant === 'bar' ? 'floating' : 'bar';
		localStorage.setItem(
			EXPERIMENT_STORAGE_KEY,
			JSON.stringify({ ...stored, variant: other })
		);
		const second = createRuntime();
		second.runtime.start();
		expect(second.runtime.kernel.getSnapshot().experiment?.variant).toBe(other);
		second.runtime.dispose();
	});

	test('a host variant overrides a stored one', () => {
		localStorage.setItem(
			EXPERIMENT_STORAGE_KEY,
			JSON.stringify({
				acknowledgedDiagnostics: false,
				assignedBy: 'c15t',
				id: 'banner-shape',
				variant: 'bar',
			})
		);
		const { runtime } = createRuntime({ variant: 'floating' });
		// Known before start: the host decided.
		expect(runtime.kernel.getSnapshot().experiment).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'floating',
		});
		runtime.start();
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) as string)
		).toMatchObject({ assignedBy: 'host', variant: 'floating' });
		runtime.dispose();
	});

	test('the arm reaches the save body, surface:shown and choice:recorded', async () => {
		const { runtime, transport } = createRuntime({ variant: 'bar' });
		const shown: KernelEvent[] = [];
		const recorded: KernelEvent[] = [];
		runtime.kernel.events.on('surface:shown', (event) => shown.push(event));
		runtime.kernel.events.on('choice:recorded', (event) =>
			recorded.push(event)
		);
		runtime.start();
		await vi.waitFor(() => expect(shown).toHaveLength(1));
		expect(shown[0]).toMatchObject({
			experiment: { assignedBy: 'host', variant: 'bar' },
			surface: 'banner',
		});
		await runtime.kernel.commands.save('all');
		expect(recorded[0]).toMatchObject({
			experiment: { id: 'banner-shape', variant: 'bar' },
		});
		const payload = vi.mocked(transport.save).mock.calls[0]?.[0] as SavePayload;
		expect(payload.experiment).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'bar',
		});
		runtime.dispose();
	});

	test('an unacknowledged arm with diagnostics fails at construction', () => {
		expect(() =>
			createRuntime({
				variants: { loud: { prompt: { primaryActions: ['accept'] } } },
			})
		).toThrow(/equivalent-prominence-overridden/u);
	});

	test('an acknowledged arm is recorded and its diagnostics logged once', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { runtime } = createRuntime({
			acknowledgeDiagnostics: true,
			variant: 'loud',
			variants: { loud: { prompt: { primaryActions: ['accept'] } } },
		});
		runtime.start();
		expect(runtime.kernel.getSnapshot().experiment).toMatchObject({
			acknowledgedDiagnostics: true,
			variant: 'loud',
		});
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[1]).toHaveProperty('loud');
		runtime.dispose();
	});
});
