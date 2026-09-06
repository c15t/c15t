/**
 * The Astro story catalogue.
 *
 * One entry per rendered variant. The module is imported from both sides
 * of the build: the Vite prerender plugin reads it in Node to render the
 * `.astro` components through Astro's container, and the stories read it
 * in the browser to look the rendered fragment up again. It must therefore
 * stay free of any `.astro`, Node or DOM import.
 */

/** The `.astro` components the Storybook renders. */
export type AstroComponentName =
	| 'consent-banner'
	| 'consent-dialog'
	| 'consent-dialog-trigger'
	| 'iab-consent-banner'
	| 'iab-consent-dialog';

/** Which framework renders the on-demand dialog island. */
export type AstroUIAdapter = 'svelte' | 'react' | 'vue';

/** A single prerendered variant. */
export interface AstroStoryVariant {
	/** Stable key. Also the virtual-module record key. */
	id: string;
	/** Which `.astro` component to render. */
	component: AstroComponentName;
	/** Props handed to the component. */
	props?: Record<string, unknown>;
	/** Slot content, by slot name. */
	slots?: Record<string, string>;
	/**
	 * Integration options, in the shape `c15t()` takes in `astro.config`.
	 * The prerender resolves them with the package's own `resolveOptions`,
	 * so the server context and the browser boot see the same object a real
	 * site would.
	 */
	options?: {
		consentCategories?: string[];
		colorScheme?: 'light' | 'dark' | 'system';
		/**
		 * Turn IAB on. The prerender resolves an IAB policy pack and hands
		 * the integration the conformance vendor list, so the server render
		 * has the GVL the banner needs and the island boots against a
		 * runtime whose model is `iab`.
		 */
		iab?: boolean;
	};
	/**
	 * Which dialog adapter the story boots. Defaults to `svelte`, the
	 * integration's own default.
	 */
	ui?: AstroUIAdapter;
	/** Put `c15t-dark` on `<html>` while the story is mounted. */
	dark?: boolean;
	/**
	 * Open a dialog once the runtime has booted. `<ConsentDialog />` only
	 * renders a host element; the surface is an island mounted on demand,
	 * so a story that wants the dialog visible has to ask for it.
	 */
	openDialog?: 'preferences' | 'iab';
}

const CATEGORIES = [
	'necessary',
	'functionality',
	'measurement',
	'experience',
	'marketing',
];

/**
 * Every Astro variant this Storybook can show.
 *
 * Read twice from opposite sides of the build: the `astro-prerender` Vite
 * plugin walks it at build time to server-render each entry, and
 * `render-astro-story.ts` looks entries up by `id` in the browser. One list
 * is what keeps a story from being prerendered without a renderer, or
 * rendered without markup.
 */
export const astroStoryVariants: readonly AstroStoryVariant[] = [
	{
		component: 'consent-banner',
		id: 'consent-banner--default',
		options: { colorScheme: 'light', consentCategories: CATEGORIES },
		props: { force: true },
	},
	{
		component: 'consent-banner',
		dark: true,
		id: 'consent-banner--dark',
		options: { colorScheme: 'dark', consentCategories: CATEGORIES },
		props: { force: true },
	},
	{
		component: 'consent-dialog',
		id: 'consent-dialog--default',
		options: { colorScheme: 'light', consentCategories: CATEGORIES },
	},
	{
		component: 'consent-dialog',
		id: 'consent-dialog--opened',
		openDialog: 'preferences',
		options: { colorScheme: 'light', consentCategories: CATEGORIES },
	},
	{
		component: 'consent-dialog-trigger',
		id: 'consent-dialog-trigger--default',
		options: { colorScheme: 'light', consentCategories: CATEGORIES },
		slots: { default: 'Cookie preferences' },
	},
	{
		component: 'iab-consent-banner',
		id: 'iab-consent-banner--default',
		options: { colorScheme: 'light', iab: true },
		props: { force: true },
	},
	{
		component: 'iab-consent-dialog',
		id: 'iab-consent-dialog--overview',
		openDialog: 'iab',
		options: { colorScheme: 'light', iab: true },
	},
	{
		component: 'iab-consent-dialog',
		id: 'iab-consent-dialog--overview-react',
		openDialog: 'iab',
		options: { colorScheme: 'light', iab: true },
		ui: 'react',
	},
	{
		component: 'iab-consent-dialog',
		id: 'iab-consent-dialog--overview-vue',
		openDialog: 'iab',
		options: { colorScheme: 'light', iab: true },
		ui: 'vue',
	},
];

/**
 * Look a variant up by id.
 *
 * @param id - The variant id.
 * @returns The variant.
 * @throws {Error} When no variant carries that id.
 */
export const requireStoryVariant = function requireStoryVariant(
	id: string
): AstroStoryVariant {
	const variant = astroStoryVariants.find((entry) => entry.id === id);
	if (!variant) {
		throw new Error(`No Astro story variant registered for id: ${id}`);
	}
	return variant;
};
