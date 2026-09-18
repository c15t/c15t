import {
	createOfflineTransport,
	custom,
	EXPERIMENT_STORAGE_KEY,
} from '@c15t/core';
import type {
	ExperimentArmTheme,
	ExperimentReportEvent,
	SavePayload,
} from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { resolvePolicyRules } from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from 'vitest';

import { ConsentBanner } from '../components/prompt';
import { useConsentDraft } from '../draft';
import {
	useExperiment,
	useResolvedPresentation,
	useResolvedTheme,
} from '../hooks';
import { ConsentProvider } from '../provider';
import type { ConsentProviderOptions } from '../provider';

const resolution = resolvePolicyRules({
	countryCode: null,
	regionCode: null,
	rules: [
		{
			categories: ['marketing', 'measurement'],
			id: 'react-experiment',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
			scopeMode: 'permissive',
		},
	],
});

const experiment: NonNullable<ConsentProviderOptions['experiment']> = {
	id: 'banner-shape',
	variants: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
};

const Probe = () => {
	const assignment = useExperiment();
	return <output data-testid="experiment">{JSON.stringify(assignment)}</output>;
};

const ThemeProbe = () => {
	const theme = useResolvedTheme();
	return <output data-testid="theme">{JSON.stringify(theme ?? null)}</output>;
};

const PresentationProbe = () => {
	const presentation = useResolvedPresentation();
	return (
		<output data-testid="presentation">
			{presentation?.prompt?.variant ?? 'none'}
		</output>
	);
};

const DraftProbe = () => {
	const draft = useConsentDraft();
	return (
		<>
			<output data-testid="draft">{String(draft.values.marketing)}</output>
			<button
				data-testid="edit"
				onClick={() => draft.set('measurement', true)}
				type="button"
			>
				edit
			</button>
		</>
	);
};

const readText = (testId: string) =>
	document.querySelector(`[data-testid="${testId}"]`)?.textContent;

const mount = function mount(
	options: Partial<ConsentProviderOptions>,
	children: React.ReactNode
) {
	const save = vi.fn().mockResolvedValue({ ok: true });
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				enabled: true,
				mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
				persistence: false,
				prefetch: { initialPolicyResolution: resolution },
				...options,
			}}
		>
			{children}
		</ConsentProvider>
	);
	return {
		payload: () => save.mock.calls[0]?.[0] as SavePayload | undefined,
		read: () =>
			JSON.parse(
				document.querySelector('[data-testid="experiment"]')?.textContent ??
					'null'
			) as unknown,
		save,
		unmount() {
			view.unmount();
			container.remove();
		},
	};
};

beforeEach(() => {
	localStorage.clear();
});
afterEach(() => {
	localStorage.clear();
});

test('useExperiment() reports the host arm and the banner renders it', async () => {
	const mounted = mount(
		{ experiment: { ...experiment, variant: 'bar' } },
		<>
			<Probe />
			<ConsentBanner />
		</>
	);
	try {
		await vi.waitFor(() =>
			expect(mounted.read()).toEqual({
				acknowledgedDiagnostics: false,
				assignedBy: 'host',
				id: 'banner-shape',
				variant: 'bar',
			})
		);
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-variant="bar"]'),
				'the banner root carries the arm variant'
			).not.toBeNull()
		);
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
		await vi.waitFor(() => expect(mounted.save).toHaveBeenCalledOnce());
		expect(mounted.payload()?.experiment).toEqual({
			acknowledgedDiagnostics: false,
			assignedBy: 'host',
			id: 'banner-shape',
			variant: 'bar',
		});
	} finally {
		mounted.unmount();
	}
});

test('built-in assignment lands after mount and is stored for the next visit', async () => {
	const mounted = mount({ experiment }, <Probe />);
	try {
		await vi.waitFor(() =>
			expect(mounted.read()).toMatchObject({
				assignedBy: 'c15t',
				id: 'banner-shape',
			})
		);
		const { variant } = mounted.read() as { variant: string };
		expect(['bar', 'floating']).toContain(variant);
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) ?? 'null')
		).toMatchObject({ id: 'banner-shape', variant });
	} finally {
		mounted.unmount();
	}
});

test('a prepared prefetch reports the impression without an init call', async () => {
	const reports: ExperimentReportEvent[] = [];
	const mounted = mount(
		{
			experiment: {
				...experiment,
				reportTo: (event) => reports.push(event),
				variant: 'bar',
			},
		},
		<ConsentBanner />
	);
	try {
		await vi.waitFor(() =>
			expect(reports.map((report) => report.name)).toEqual([
				'c15t_surface_shown',
			])
		);
		expect(reports[0]).toMatchObject({
			assignedBy: 'host',
			surface: 'banner',
			variant: 'bar',
		});
	} finally {
		mounted.unmount();
	}
});

test('reportTo receives the banner impression and the choice', async () => {
	const reports: ExperimentReportEvent[] = [];
	// Impressions are stamped once init marks the kernel live, so this
	// transport answers init instead of relying on a prepared prefetch.
	const offline = createOfflineTransport({
		policyRules: [
			{
				categories: ['marketing', 'measurement'],
				id: 'react-experiment',
				match: { isDefault: true },
				model: 'opt-in',
				prompt: 'choice',
				scopeMode: 'permissive',
			},
		],
	});
	const save = vi.fn().mockResolvedValue({ ok: true });
	const mounted = mount(
		{
			experiment: {
				...experiment,
				reportTo: (event) => reports.push(event),
				variant: 'bar',
			},
			mode: Object.assign(() => ({ init: offline.init, save }), {
				kind: 'custom' as const,
			}),
			prefetch: undefined,
		},
		<ConsentBanner />
	);
	try {
		await vi.waitFor(() =>
			expect(reports.map((report) => report.name)).toEqual([
				'c15t_surface_shown',
			])
		);
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(reports.map((report) => report.name)).toEqual([
			'c15t_surface_shown',
			'c15t_choice_recorded',
		]);
		expect(reports[1]).toMatchObject({
			consentAction: 'all',
			experimentId: 'banner-shape',
			surface: 'banner',
			variant: 'bar',
		});
	} finally {
		mounted.unmount();
	}
});

test('an arm theme reaches the injected tokens and useResolvedTheme()', async () => {
	const mounted = mount(
		{
			experiment: {
				id: 'button-style',
				variant: 'bold',
				variants: {
					bold: { theme: { colors: { primary: '#123456' } } },
					control: {},
				},
			},
			theme: { colors: { surface: '#abcdef' } },
		},
		<ThemeProbe />
	);
	try {
		await vi.waitFor(() =>
			expect(
				JSON.parse(
					document.querySelector('[data-testid="theme"]')?.textContent ?? 'null'
				)
			).toEqual({ colors: { primary: '#123456', surface: '#abcdef' } })
		);
		const css = document.getElementById('c15t-theme')?.textContent ?? '';
		expect(css).toContain('#123456');
		expect(css).toContain('#abcdef');
	} finally {
		mounted.unmount();
	}
});

/**
 * A borrowed runtime lets the test decide when the arm lands: the provider
 * resolves presentation from `snapshot.experiment` either way.
 */
const mountDraftWithLateArm = function mountDraftWithLateArm() {
	const runtime = createConsentRuntime({
		mode: custom({ save: vi.fn().mockResolvedValue({ ok: true }) }),
		prefetch: { initialPolicyResolution: resolution },
	});
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	view.render(
		<ConsentProvider
			options={{
				experiment: {
					id: 'defaults',
					variants: {
						bar: { preferences: { defaults: { marketing: true } } },
						floating: {},
					},
				},
			}}
			runtime={runtime}
		>
			<DraftProbe />
		</ConsentProvider>
	);
	return {
		assign() {
			runtime.kernel.set.experiment({
				acknowledgedDiagnostics: false,
				assignedBy: 'c15t',
				id: 'defaults',
				variant: 'bar',
			});
		},
		unmount() {
			view.unmount();
			container.remove();
			runtime.dispose();
		},
	};
};

test('a clean draft reseeds from the arm assigned after mount', async () => {
	const mounted = mountDraftWithLateArm();
	try {
		await vi.waitFor(() => expect(readText('draft')).toBe('false'));
		mounted.assign();
		await vi.waitFor(() => expect(readText('draft')).toBe('true'));
	} finally {
		mounted.unmount();
	}
});

test('an edited draft keeps its values when the arm lands', async () => {
	const mounted = mountDraftWithLateArm();
	try {
		await vi.waitFor(() => expect(readText('draft')).toBe('false'));
		document.querySelector<HTMLButtonElement>('[data-testid="edit"]')?.click();
		mounted.assign();
		// Give a reseed every chance to happen, then check it did not.
		await new Promise<void>((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(readText('draft')).toBe('false');
	} finally {
		mounted.unmount();
	}
});

test('the experiment is read once: a changed option keeps the mounted arm', async () => {
	const save = vi.fn().mockResolvedValue({ ok: true });
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	const render = (variants: NonNullable<typeof experiment>['variants']) =>
		view.render(
			<ConsentProvider
				options={{
					enabled: true,
					experiment: { id: 'banner-shape', variant: 'bar', variants },
					mode: Object.assign(() => ({ save }), { kind: 'custom' as const }),
					persistence: false,
					prefetch: { initialPolicyResolution: resolution },
				}}
			>
				<PresentationProbe />
			</ConsentProvider>
		);
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	try {
		render(experiment.variants);
		await vi.waitFor(() => expect(readText('presentation')).toBe('bar'));
		render({ bar: { prompt: { variant: 'wall' } } });
		await vi.waitFor(() => expect(warn).toHaveBeenCalled());
		expect(readText('presentation')).toBe('bar');
	} finally {
		warn.mockRestore();
		view.unmount();
		container.remove();
	}
});

test('a provider enabled after mount builds its controller then', async () => {
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container);
	const render = (enabled: boolean) =>
		view.render(
			<ConsentProvider
				options={{
					enabled,
					experiment,
					mode: Object.assign(
						() => ({ save: vi.fn().mockResolvedValue({ ok: true }) }),
						{ kind: 'custom' as const }
					),
					persistence: false,
					prefetch: { initialPolicyResolution: resolution },
				}}
			>
				<Probe />
			</ConsentProvider>
		);
	try {
		render(false);
		await vi.waitFor(() => expect(readText('experiment')).toBe('null'));
		expect(localStorage.getItem(EXPERIMENT_STORAGE_KEY)).toBeNull();
		render(true);
		await vi.waitFor(() =>
			expect(JSON.parse(readText('experiment') ?? 'null')).toMatchObject({
				assignedBy: 'c15t',
				id: 'banner-shape',
			})
		);
		expect(localStorage.getItem(EXPERIMENT_STORAGE_KEY)).not.toBeNull();
	} finally {
		view.unmount();
		container.remove();
	}
});

test('a disabled provider builds no experiment controller', async () => {
	const onUncaughtError = vi.fn();
	const container = document.createElement('div');
	document.body.append(container);
	const view = createRoot(container, { onUncaughtError });
	try {
		view.render(
			<ConsentProvider
				options={{
					enabled: false,
					// Unacknowledged diagnostics: an enabled provider throws here.
					experiment: {
						id: 'banner-shape',
						variants: { loud: { prompt: { primaryActions: ['accept'] } } },
					},
					mode: Object.assign(
						() => ({ save: vi.fn().mockResolvedValue({ ok: true }) }),
						{ kind: 'custom' as const }
					),
					persistence: false,
					prefetch: { initialPolicyResolution: resolution },
				}}
			>
				<Probe />
			</ConsentProvider>
		);
		await vi.waitFor(() =>
			expect(
				document.querySelector('[data-testid="experiment"]')?.textContent
			).toBe('null')
		);
		expect(onUncaughtError).not.toHaveBeenCalled();
		expect(localStorage.getItem(EXPERIMENT_STORAGE_KEY)).toBeNull();
	} finally {
		view.unmount();
		container.remove();
	}
});

test('a @c15t/ui Theme is a valid experiment arm theme', () => {
	expectTypeOf<Theme>().toMatchTypeOf<ExperimentArmTheme>();
});
