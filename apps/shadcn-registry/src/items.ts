/**
 * Registry item definitions. The build derives each item's dependencies
 * from the imports in its files, so this list only holds what imports
 * can't say: names, copy, file targets and post-install notes.
 */

/**
 * The c15t range every item installs. Raise it when an item starts using a
 * hook or prop that older releases don't have.
 */
export const c15tRange = '^3.1.0';

export const frameworks = ['next', 'react', 'tanstack-start'] as const;
export type Framework = (typeof frameworks)[number];

/**
 * The c15t entry point each framework's UI items import. The Next.js and
 * TanStack Start entries re-export the React one, so the build only
 * rewrites import paths.
 */
export const c15tEntryByFramework = {
	next: 'c15t/next',
	react: 'c15t/react',
	'tanstack-start': 'c15t/tanstack-start',
} as const satisfies Record<Framework, string>;

export const bases = ['radix', 'base', 'aria'] as const;
export type Base = (typeof bases)[number];

/** Radix and Base UI share one source folder. React Aria has its own. */
export const sourceFolderByBase = {
	aria: 'aria',
	base: 'shared',
	radix: 'shared',
} as const satisfies Record<Base, string>;

const styleNames = [
	'nova',
	'vega',
	'maia',
	'lyra',
	'mira',
	'luma',
	'sera',
	'rhea',
] as const;

/**
 * Every `style` value a shadcn project can have in `components.json`.
 * shadcn puts the raw value in `{style}`, so each one needs its own folder.
 * `new-york` and `default` are the pre-base styles, which use Radix.
 */
export const styles: readonly { name: string; base: Base }[] = [
	...bases.flatMap((base) =>
		styleNames.map((style) => ({ base, name: `${base}-${style}` }))
	),
	{ base: 'radix', name: 'new-york' },
	{ base: 'radix', name: 'default' },
];

export interface RegistryFile {
	/** Path under the item's source folder. */
	source: string;
	type: 'registry:component' | 'registry:file';
	/** Install target for files outside the components folder. */
	target?: string;
}

export interface UiItem {
	/** Item name without the framework prefix, such as `consent-banner`. */
	name: string;
	title: string;
	description: string;
	files: RegistryFile[];
	docs?: string;
}

export interface SetupItem extends UiItem {
	framework: Framework;
	envVars?: Record<string, string>;
}

const component = (source: string): RegistryFile => ({
	source,
	type: 'registry:component',
});

export const uiItems: UiItem[] = [
	{
		description:
			'Toggles for each consent category and its vendors, used by the dialog, sheet and widget.',
		files: [component('consent-preferences.tsx')],
		name: 'consent-preferences',
		title: 'Consent preferences',
	},
	{
		description:
			'The "Secured by c15t" tag on the banner, dialog and sheet, and the mark on the dialog trigger.',
		files: [component('consent-branding.tsx')],
		name: 'consent-branding',
		title: 'Consent branding',
	},
	{
		description:
			"Cookie banner that shows the actions the visitor's consent policy allows.",
		files: [component('consent-banner.tsx')],
		name: 'consent-banner',
		title: 'Consent banner',
	},
	{
		description: 'Preference dialog with a switch for each consent category.',
		files: [component('consent-dialog.tsx')],
		name: 'consent-dialog',
		title: 'Consent dialog',
	},
	{
		description:
			'Floating button that reopens the consent dialog after the banner closes.',
		files: [component('consent-dialog-trigger.tsx')],
		name: 'consent-dialog-trigger',
		title: 'Consent dialog trigger',
	},
	{
		description: 'Inline consent preferences for a privacy or settings page.',
		files: [component('consent-widget.tsx')],
		name: 'consent-widget',
		title: 'Consent widget',
	},
	{
		description: 'Consent preferences in a side sheet instead of a dialog.',
		files: [component('consent-sheet.tsx')],
		name: 'consent-sheet',
		title: 'Consent sheet',
	},
	{
		description:
			'Placeholder that holds back embeds until the visitor allows their category.',
		files: [component('consent-gate.tsx')],
		name: 'consent-gate',
		title: 'Consent gate',
	},
];

export const setupItems: SetupItem[] = [
	{
		description:
			'Adds c15t.config.ts and a ConsentManager that renders the banner and dialog in the root layout.',
		docs: [
			'Wrap next.config.ts with withConsentManifest from c15t/next/build, then render <ConsentManager> around {children} in app/layout.tsx.',
			'NEXT_PUBLIC_C15T_BACKEND_URL points at a demo project. Replace it with your Inth or self-hosted backend URL.',
			'Guide: https://c15t.com/docs/frameworks/next/shadcn',
		].join('\n'),
		envVars: {
			NEXT_PUBLIC_C15T_BACKEND_URL: 'https://example-inth.inth.app',
		},
		files: [
			{
				source: 'c15t.config.ts',
				target: '~/c15t.config.ts',
				type: 'registry:file',
			},
			component('consent-manager.tsx'),
		],
		framework: 'next',
		name: 'consent-manager',
		title: 'Consent manager',
	},
	{
		description:
			'Adds a ConsentManager that sets up ConsentProvider and renders the banner and dialog.',
		docs: [
			'Add consentManifest() from c15t/build to vite.config.ts, then wrap your app in <ConsentManager>.',
			'VITE_C15T_BACKEND_URL points at a demo project. Replace it with your Inth or self-hosted backend URL.',
			'Guide: https://c15t.com/docs/frameworks/react/shadcn',
		].join('\n'),
		envVars: {
			VITE_C15T_BACKEND_URL: 'https://example-inth.inth.app',
		},
		files: [component('consent-manager.tsx')],
		framework: 'react',
		name: 'consent-manager',
		title: 'Consent manager',
	},
	{
		description:
			'Adds a getConsentState server function for the root loader and a ConsentManager that renders the banner and dialog.',
		docs: [
			'Add consentManifest() from c15t/tanstack-start/build to vite.config.ts, before tanstackStart().',
			'In src/routes/__root.tsx, spread consentLoaderOptions from c15t/tanstack-start/server into createRootRoute, load { consent: await getConsentState() }, and render <ConsentManager state={consent}><Outlet /></ConsentManager> from the root component.',
			'VITE_C15T_BACKEND_URL points at a demo project. Replace it with your Inth or self-hosted backend URL.',
			'Guide: https://c15t.com/docs/frameworks/tanstack-start/shadcn',
		].join('\n'),
		envVars: {
			VITE_C15T_BACKEND_URL: 'https://example-inth.inth.app',
		},
		files: [component('consent-manager.tsx')],
		framework: 'tanstack-start',
		name: 'consent-manager',
		title: 'Consent manager',
	},
];

/** The published name, such as `next-consent-banner`. */
export const itemName = (framework: Framework, name: string): string =>
	`${framework}-${name}`;
