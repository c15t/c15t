declare module 'virtual:c15t-astro-prerendered' {
	// The producer's own type, so the two cannot drift: the plugin builds
	// this module and exports the shape it returns.
	import type { PrerenderedVariant } from './.storybook/astro-prerender';

	const prerendered: Record<string, PrerenderedVariant>;
	export default prerendered;
}

declare module '*.astro' {
	const component: unknown;
	export default component;
}
