import { EXPERIMENT_STORAGE_KEY } from '@c15t/core';
import type { ExperimentArmTheme, SavePayload } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import type { Theme } from '@c15t/ui/theme';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, expectTypeOf, test, vi } from 'vitest';

import { ConsentBanner } from '../components/prompt';
import { useExperiment, useResolvedTheme } from '../hooks';
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

test('a @c15t/ui Theme is a valid experiment arm theme', () => {
	expectTypeOf<Theme>().toMatchTypeOf<ExperimentArmTheme>();
});
