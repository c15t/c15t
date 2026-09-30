/**
 * The framework fixtures each Tailwind workspace (`v3/`, `v4/`) builds.
 *
 * `build-fixtures.ts` builds them and `scripts/verify-tailwind-matrix.ts`
 * serves each `outDir` as static files and checks the page in Chromium.
 */
export interface TailwindMatrixFixture {
	/** Directory under `v3/` and `v4/`. */
	id: string;
	label: string;
	/**
	 * Binary and its arguments. The binary comes from the fixture's own
	 * `node_modules/.bin` when it has one (a fixture that pins a different
	 * framework version is its own package), else from the workspace's.
	 */
	build: readonly [string, ...string[]];
	/** Static output, relative to the fixture directory. */
	outDir: string;
	/** Pages to check. */
	pages: readonly TailwindMatrixPage[];
}

export interface TailwindMatrixPage {
	path: string;
	label: string;
	/** The page passes utilities, with a `dark:` variant, to a c15t part. */
	slots: boolean;
	/**
	 * c15t switches to its dark tokens when `<html>` gets a `dark` class.
	 * The script tag's shadow root follows its `colorScheme` option instead
	 * of the page.
	 */
	darkTokens: boolean;
}

const page: TailwindMatrixPage = {
	darkTokens: true,
	label: '',
	path: '/',
	slots: true,
};

export const TAILWIND_MATRIX_FIXTURES: readonly TailwindMatrixFixture[] = [
	{
		build: ['next', 'build'],
		id: 'next-16-turbopack',
		label: 'Next.js 16 (Turbopack)',
		outDir: 'out',
		pages: [page],
	},
	{
		build: ['next', 'build', '--webpack'],
		id: 'next-16-webpack',
		label: 'Next.js 16 (webpack)',
		outDir: 'out',
		pages: [page],
	},
	{
		build: ['next', 'build'],
		id: 'next-15',
		label: 'Next.js 15 (webpack)',
		outDir: 'out',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'react',
		label: 'React (Vite)',
		outDir: 'dist',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'tanstack-start',
		label: 'TanStack Start',
		outDir: 'dist/client',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'vue',
		label: 'Vue',
		outDir: 'dist',
		pages: [page],
	},
	{
		build: ['nuxt', 'generate'],
		id: 'nuxt',
		label: 'Nuxt',
		outDir: '.output/public',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'svelte',
		label: 'Svelte',
		outDir: 'dist',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'sveltekit',
		label: 'SvelteKit',
		outDir: 'build',
		pages: [page],
	},
	{
		build: ['astro', 'build'],
		id: 'astro',
		label: 'Astro',
		outDir: 'dist',
		pages: [page],
	},
	{
		build: ['vite', 'build'],
		id: 'html',
		label: 'HTML',
		outDir: 'dist',
		pages: [
			{
				darkTokens: false,
				label: 'shadow root',
				path: '/',
				slots: false,
			},
			{
				darkTokens: true,
				label: 'light DOM',
				path: '/light-dom.html',
				slots: false,
			},
		],
	},
];
