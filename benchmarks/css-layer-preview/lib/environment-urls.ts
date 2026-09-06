import type { CssLayerEnvironment } from '@c15t/benchmarking';

export const cssLayerEnvironments: CssLayerEnvironment[] = [
	{
		description:
			'Next.js + Tailwind CSS 3 using the dedicated c15t Tailwind 3 stylesheet entrypoint.',
		id: 'tw3',
		label: 'Tailwind 3',
		port: 3121,
	},
	{
		description:
			'Next.js + Tailwind CSS 4 with c15t styles joining the components layer automatically.',
		id: 'tw4',
		label: 'Tailwind 4',
		port: 3122,
	},
	{
		description:
			'Next.js without Tailwind, used as the framework-free control.',
		id: 'no-tw',
		label: 'Plain CSS',
		port: 3123,
	},
];
