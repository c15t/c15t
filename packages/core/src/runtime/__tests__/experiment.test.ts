/**
 * @vitest-environment jsdom
 */
import { policyRulePresets } from '@c15t/schema/types';
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConsentExperiment } from '../../libs/experiment';
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

const createTransport = function createTransport(): Required<
	Pick<KernelTransport, 'init' | 'save'>
> {
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

	test('/init carries the arm while the visitor has no stored choice', async () => {
		const first = createRuntime({ arm: 'bar' });
		first.runtime.start();
		await vi.waitFor(() => expect(first.transport.init).toHaveBeenCalled());
		expect(vi.mocked(first.transport.init).mock.calls[0]?.[0]).toMatchObject({
			experiment: { arm: 'bar', id: 'banner-shape' },
		});
		await vi.waitFor(() =>
			expect(first.runtime.kernel.getSnapshot().activeUI).toBe('banner')
		);
		await first.runtime.kernel.commands.save('all');
		first.runtime.dispose();

		// The choice is stored: this visitor is not shown the banner, so the
		// next page's `/init` does not count them toward the arm.
		const second = createRuntime({ arm: 'bar' });
		second.runtime.start();
		await vi.waitFor(() => expect(second.transport.init).toHaveBeenCalled());
		expect(
			vi.mocked(second.transport.init).mock.calls[0]?.[0]
		).not.toHaveProperty('experiment');
		second.runtime.dispose();
	});

	test('a c15t-picked arm is on /init too', async () => {
		const { runtime, transport } = createRuntime({
			split: { bar: 1, control: 0, floating: 0 },
		});
		runtime.start();
		await vi.waitFor(() => expect(transport.init).toHaveBeenCalled());
		expect(vi.mocked(transport.init).mock.calls[0]?.[0]).toMatchObject({
			experiment: { arm: 'bar', id: 'banner-shape' },
		});
		runtime.dispose();
	});

	test('callbacks carry the arm for any analytics tool', async () => {
		const shown = vi.fn();
		const recorded = vi.fn();
		const runtime = createConsentRuntime({
			callbacks: { onChoiceRecorded: recorded, onSurfaceShown: shown },
			experiment: { ...experiment, arm: 'bar' },
			mode: custom(createTransport()),
		});
		runtime.start();
		await vi.waitFor(() => expect(shown).toHaveBeenCalledOnce());
		expect(shown.mock.calls[0]?.[0]).toMatchObject({
			experiment: { arm: 'bar', id: 'banner-shape' },
			surface: 'banner',
		});
		await runtime.kernel.commands.save('all');
		expect(recorded.mock.calls[0]?.[0]).toMatchObject({
			consentAction: 'all',
			experiment: { arm: 'bar' },
		});
		runtime.dispose();
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
