/**
 * @vitest-environment jsdom
 */
import { policyRulePresets } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConsentExperiment } from '../../libs/experiment';
import type { ExperimentReportEvent } from '../../libs/experiment-reporting';
import { EXPERIMENT_STORAGE_KEY } from '../../libs/storage-keys';
import { clearStoredConsentRecords } from '../../modules/persistence/record-storage';
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
	arms: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
	id: 'banner-shape',
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
	clearStoredConsentRecords();
	// A save in an earlier test leaves a consent cookie, which would make the
	// next runtime a returning visitor with no banner.
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; max-age=0; path=/`;
		}
	}
});
afterEach(() => {
	vi.restoreAllMocks();
	delete (window as { c15t?: unknown }).c15t;
});

/** Wait for the lazily loaded controller to release the held prompt. */
const settled = async (runtime: ReturnType<typeof createConsentRuntime>) => {
	await vi.waitFor(() =>
		expect(runtime.kernel.getSnapshot().experimentPending).toBe(false)
	);
};

describe('runtime experiments', () => {
	test('built-in assignment holds the banner until the arm is picked, then keeps it', async () => {
		const first = createRuntime();
		const shown: KernelEvent[] = [];
		first.runtime.kernel.events.on('surface:shown', (event) =>
			shown.push(event)
		);
		expect(first.runtime.kernel.getServerSnapshot().activeUI).toBe('none');
		first.runtime.start();
		await vi.waitFor(() => expect(shown).toHaveLength(1));
		const assignment = first.runtime.kernel.getSnapshot().experiment;
		expect(assignment).toMatchObject({
			assignedBy: 'c15t',
			id: 'banner-shape',
		});
		// The first impression already carries the arm.
		expect(shown[0]).toMatchObject({ experiment: assignment });
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) as string)
		).toEqual({ arm: assignment?.arm, id: 'banner-shape' });
		first.runtime.dispose();

		// Force the other arm so stickiness, not luck, is tested.
		const other = assignment?.arm === 'bar' ? 'floating' : 'bar';
		localStorage.setItem(
			EXPERIMENT_STORAGE_KEY,
			JSON.stringify({ arm: other, id: 'banner-shape' })
		);
		const second = createRuntime();
		second.runtime.start();
		await settled(second.runtime);
		expect(second.runtime.kernel.getSnapshot().experiment?.arm).toBe(other);
		second.runtime.dispose();
	});

	test('a prefetched arm the server rendered seeds the snapshot and survives start', async () => {
		// The server assigned and rendered `bar`; the browser must attribute
		// the impression to that arm rather than start unassigned.
		const seeded = {
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'host' as const,
			id: 'banner-shape',
		};
		const runtime = createConsentRuntime({
			experiment,
			mode: custom(createTransport()),
			prefetch: { initialExperiment: seeded },
		});
		expect(runtime.kernel.getServerSnapshot().experiment).toEqual(seeded);
		runtime.start();
		await settled(runtime);
		expect(runtime.kernel.getSnapshot().experiment).toEqual(seeded);
		runtime.dispose();
	});

	test('a prefetched arm wins over a host variant', () => {
		const seeded = {
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'host' as const,
			id: 'banner-shape',
		};
		const runtime = createConsentRuntime({
			experiment: { ...experiment, arm: 'floating' },
			mode: custom(createTransport()),
			prefetch: { initialExperiment: seeded },
		});
		expect(runtime.kernel.getSnapshot().experiment?.arm).toBe('bar');
		runtime.dispose();
	});

	test('a host variant overrides a stored arm and is not stored', async () => {
		localStorage.setItem(
			EXPERIMENT_STORAGE_KEY,
			JSON.stringify({ arm: 'bar', id: 'banner-shape' })
		);
		const { runtime } = createRuntime({ arm: 'floating' });
		// Known before start: the host decided.
		expect(runtime.kernel.getSnapshot().experiment).toEqual({
			acknowledgedDiagnostics: false,
			arm: 'floating',
			assignedBy: 'host',
			id: 'banner-shape',
		});
		runtime.start();
		await settled(runtime);
		await vi.waitFor(() =>
			expect(runtime.kernel.getSnapshot().activeUI).toBe('banner')
		);
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) as string)
		).toEqual({ arm: 'bar', id: 'banner-shape' });
		runtime.dispose();
	});

	test('an undeclared host variant runs no experiment instead of throwing', () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const { runtime } = createRuntime({ arm: 'wall' });
		expect(runtime.kernel.getSnapshot().experiment).toBeNull();
		expect(runtime.kernel.getSnapshot().experimentPending).toBe(false);
		expect(error).toHaveBeenCalledOnce();
		runtime.dispose();
	});

	test('the arm reaches the save body, surface:shown and choice:recorded', async () => {
		const { runtime, transport } = createRuntime({ arm: 'bar' });
		const shown: KernelEvent[] = [];
		const recorded: KernelEvent[] = [];
		runtime.kernel.events.on('surface:shown', (event) => shown.push(event));
		runtime.kernel.events.on('choice:recorded', (event) =>
			recorded.push(event)
		);
		runtime.start();
		await vi.waitFor(() => expect(shown).toHaveLength(1));
		expect(shown[0]).toMatchObject({
			experiment: { arm: 'bar', assignedBy: 'host' },
			surface: 'banner',
		});
		await runtime.kernel.commands.save('all');
		expect(recorded[0]).toMatchObject({
			experiment: { arm: 'bar', id: 'banner-shape' },
		});
		const payload = vi.mocked(transport.save)?.mock.calls[0]?.[0] as
			| SavePayload
			| undefined;
		expect(payload?.experiment).toEqual({
			acknowledgedDiagnostics: false,
			arm: 'bar',
			assignedBy: 'host',
			id: 'banner-shape',
		});
		runtime.dispose();
	});

	test('reportTo receives the impression and the choice, in order', async () => {
		const reports: ExperimentReportEvent[] = [];
		const { runtime } = createRuntime({
			reportTo: (event) => reports.push(event),
			variant: 'bar',
		});
		runtime.start();
		await vi.waitFor(() => expect(reports).toHaveLength(1));
		await runtime.kernel.commands.save('all');
		expect(reports).toHaveLength(2);
		expect(reports.map((report) => report.name)).toEqual([
			'c15t_surface_shown',
			'c15t_choice_recorded',
		]);
		for (const report of reports) {
			expect(report).toMatchObject({
				assignedBy: 'host',
				experimentId: 'banner-shape',
				variant: 'bar',
			});
		}
		expect(reports[1]).toMatchObject({
			consentAction: 'all',
			surface: 'banner',
		});
		expect(reports[1]).toHaveProperty('timeToDecisionMs');
		runtime.dispose();
	});

	test('an opt-out notice arm reports the dismissal, not a choice', async () => {
		const reports: ExperimentReportEvent[] = [];
		const notice: PolicyRule = {
			...policyRulePresets.usPrivacyStatesOptOut(),
			match: { isDefault: true },
			prompt: 'notice',
		};
		const offline = createOfflineTransport({ policyRules: [notice] });
		const transport: KernelTransport = {
			init: (context) => offline.init(context),
			save: vi.fn().mockResolvedValue({ ok: true }),
		};
		const { runtime } = createRuntime(
			{ reportTo: (event) => reports.push(event), variant: 'bar' },
			transport
		);
		runtime.start();
		await vi.waitFor(() => expect(reports).toHaveLength(1));
		const result = await runtime.kernel.commands.dismissNotice();
		expect(result.ok).toBe(true);
		expect(transport.save).not.toHaveBeenCalled();
		expect(reports.map((report) => report.name)).toEqual([
			'c15t_surface_shown',
			'c15t_notice_dismissed',
		]);
		expect(reports[1]).toMatchObject({
			experimentId: 'banner-shape',
			surface: 'banner',
			variant: 'bar',
		});
		expect(reports[1]).toHaveProperty('timeToDecisionMs');
		runtime.dispose();
	});

	test('a throwing reporter is logged and does not stop the others', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const reports: ExperimentReportEvent[] = [];
		const { runtime } = createRuntime({
			reportTo: [
				() => {
					throw new Error('analytics down');
				},
				(event) => reports.push(event),
			],
			variant: 'bar',
		});
		runtime.start();
		await vi.waitFor(() => expect(reports).toHaveLength(1));
		const result = await runtime.kernel.commands.save('all');
		expect(result.ok).toBe(true);
		expect(reports).toHaveLength(2);
		expect(error).toHaveBeenCalledTimes(2);
		runtime.dispose();
	});

	test('reporting stops on dispose', async () => {
		const reports: ExperimentReportEvent[] = [];
		const { runtime } = createRuntime({
			reportTo: (event) => reports.push(event),
			variant: 'bar',
		});
		runtime.start();
		await vi.waitFor(() => expect(reports).toHaveLength(1));
		runtime.dispose();
		runtime.kernel.events.emit({
			shownAt: Date.now(),
			snapshot: runtime.kernel.getSnapshot(),
			surface: 'dialog',
			type: 'surface:shown',
		});
		expect(reports).toHaveLength(1);
	});

	test('an unacknowledged arm with diagnostics is not shown, and nothing throws', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const shown: KernelEvent[] = [];
		const { runtime } = createRuntime({
			arm: 'loud',
			arms: { loud: { prompt: { primaryActions: ['accept'] } } },
		});
		runtime.kernel.events.on('surface:shown', (event) => shown.push(event));
		runtime.start();
		await vi.waitFor(() => expect(shown).toHaveLength(1));
		expect(shown[0]).not.toHaveProperty('experiment');
		expect(runtime.kernel.getSnapshot().experiment).toBeNull();
		expect(String(error.mock.calls[0]?.[0])).toMatch(
			/equivalent-prominence-overridden/u
		);
		runtime.dispose();
	});

	test('an acknowledged arm is recorded and its diagnostics logged once', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { runtime } = createRuntime({
			acknowledgeDiagnostics: true,
			arm: 'loud',
			arms: { loud: { prompt: { primaryActions: ['accept'] } } },
		});
		runtime.start();
		await vi.waitFor(() =>
			expect(runtime.kernel.getSnapshot().activeUI).toBe('banner')
		);
		expect(runtime.kernel.getSnapshot().experiment).toMatchObject({
			acknowledgedDiagnostics: true,
			arm: 'loud',
		});
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[1]).toHaveProperty('loud');
		runtime.dispose();
	});
});
