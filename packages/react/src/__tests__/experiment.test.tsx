import {
	createOfflineTransport,
	custom,
	EXPERIMENT_STORAGE_KEY,
} from '@c15t/core';
import type { ExperimentArmTheme, SavePayload } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { resolvePolicyRules } from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from 'vitest';

import { ConsentBanner } from '../components/prompt';
import { ConsentTheme } from '../consent-theme';
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
	arms: {
		bar: { prompt: { variant: 'bar' } },
		floating: { prompt: { variant: 'floating' } },
	},
	id: 'banner-shape',
};

const Probe = () => {
	const assignment = useExperiment();
	return <output data-testid="experiment">{JSON.stringify(assignment)}</output>;
};

const ThemeProbe = () => {
	const theme = useResolvedTheme();
	return <output data-testid="theme">{JSON.stringify(theme ?? null)}</output>;
};

/** Renders the arm's tokens the way a host does: `ConsentTheme` with the resolved theme. */
const ArmTheme = () => <ConsentTheme theme={useResolvedTheme()} />;

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
				consentCategories: ['marketing', 'measurement'],
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
		{ experiment: { ...experiment, arm: 'bar' } },
		<>
			<Probe />
			<ConsentBanner />
		</>
	);
	try {
		await vi.waitFor(() =>
			expect(mounted.read()).toEqual({
				acknowledgedDiagnostics: false,
				arm: 'bar',
				assignedBy: 'host',
				id: 'banner-shape',
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
			arm: 'bar',
			assignedBy: 'host',
			id: 'banner-shape',
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
		const { arm } = mounted.read() as { arm: string };
		expect(['control', 'bar', 'floating']).toContain(arm);
		expect(
			JSON.parse(localStorage.getItem(EXPERIMENT_STORAGE_KEY) ?? 'null')
		).toEqual({ arm, id: 'banner-shape' });
	} finally {
		mounted.unmount();
	}
});

test('the arm goes out on /init and on the callbacks', async () => {
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
	const init = vi.fn(offline.init);
	const save = vi.fn().mockResolvedValue({ ok: true });
	const shown = vi.fn();
	const recorded = vi.fn();
	const mounted = mount(
		{
			callbacks: { onChoiceRecorded: recorded, onSurfaceShown: shown },
			experiment: { ...experiment, arm: 'bar' },
			mode: Object.assign(() => ({ init, save }), {
				kind: 'custom' as const,
			}),
			prefetch: undefined,
		},
		<ConsentBanner />
	);
	try {
		await vi.waitFor(() => expect(shown).toHaveBeenCalledOnce());
		expect(init.mock.calls[0]?.[0]).toMatchObject({
			experiment: { arm: 'bar', id: 'banner-shape' },
		});
		expect(shown.mock.calls[0]?.[0]).toMatchObject({
			experiment: { arm: 'bar', assignedBy: 'host' },
			surface: 'banner',
		});
		document
			.querySelector<HTMLButtonElement>(
				'[data-testid="consent-banner-accept-button"]'
			)
			?.click();
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(recorded.mock.calls[0]?.[0]).toMatchObject({
			consentAction: 'all',
			experiment: { arm: 'bar' },
		});
	} finally {
		mounted.unmount();
	}
});

test('an arm theme reaches useResolvedTheme() and a ConsentTheme rendered from it', async () => {
	const mounted = mount(
		{
			experiment: {
				arm: 'bold',
				arms: {
					bold: { theme: { colors: { primary: '#123456' } } },
				},
				id: 'button-style',
			},
			theme: { colors: { surface: '#abcdef' } },
		},
		<>
			<ArmTheme />
			<ThemeProbe />
		</>
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
		consentCategories: ['marketing', 'measurement'],
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
					arms: {
						bar: { preferences: { defaults: { marketing: true } } },
					},
					id: 'defaults',
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
				arm: 'bar',
				assignedBy: 'c15t',
				id: 'defaults',
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
	const render = (arms: NonNullable<typeof experiment>['arms']) =>
		view.render(
			<ConsentProvider
				options={{
					enabled: true,
					experiment: { arm: 'bar', arms, id: 'banner-shape' },
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
		render(experiment.arms);
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
					// A disabled provider runs no experiment, whatever its arms.
					experiment: {
						arms: { loud: { prompt: { primaryActions: ['accept'] } } },
						id: 'banner-shape',
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

test('a server render whose policy rejects the arm does not throw', () => {
	const notice = resolvePolicyRules({
		countryCode: null,
		regionCode: null,
		rules: [
			{
				categories: ['marketing'],
				id: 'react-notice',
				match: { isDefault: true },
				model: 'opt-out',
				prompt: 'notice',
				scopeMode: 'strict',
			},
		],
	});
	let html = '';
	expect(() => {
		html = renderToString(
			<ConsentProvider
				options={{
					enabled: true,
					experiment: {
						arm: 'wall',
						arms: { wall: { prompt: { variant: 'wall' } } },
						id: 'banner-shape',
					},
					mode: Object.assign(() => ({ save: vi.fn() }), {
						kind: 'custom' as const,
					}),
					persistence: false,
					prefetch: { initialPolicyResolution: notice },
				}}
			>
				<ConsentBanner />
			</ConsentProvider>
		);
	}).not.toThrow();
	expect(html).toContain('consent-banner-root');
});

test('built-in assignment keeps the banner out of the server render', () => {
	const html = renderToString(
		<ConsentProvider
			options={{
				enabled: true,
				experiment,
				mode: Object.assign(() => ({ save: vi.fn() }), {
					kind: 'custom' as const,
				}),
				persistence: false,
				prefetch: { initialPolicyResolution: resolution },
			}}
		>
			<ConsentBanner />
		</ConsentProvider>
	);
	// The arm is picked in the browser; rendering the base banner here would
	// show the visitor one banner and then swap it for another.
	expect(html).not.toContain('consent-banner-root');
});
