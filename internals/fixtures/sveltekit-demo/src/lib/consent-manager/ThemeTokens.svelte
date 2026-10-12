<script lang="ts">
	/**
	 * Renders a theme's design tokens as a style element with id `c15t-theme`.
	 *
	 * The provider applies slots and consent actions from `theme`, but not
	 * tokens. A site with one theme renders `generateThemeCSS` on the server
	 * (see `routes/consent-example/+page.server.ts`). This demo switches whole
	 * token sets in the browser, so it generates the CSS here and ships the
	 * generator to the client.
	 */
	import { generateThemeCSS } from '@c15t/ui/theme';
	import type { Theme } from '@c15t/ui/theme';

	let { theme }: { theme: Theme | undefined } = $props();

	const css = $derived(theme ? generateThemeCSS(theme) : '');
</script>

<svelte:head>
	{#if css}
		<!-- generateThemeCSS escapes `<`, so its output is safe in a style element. -->
		{@html `<style id="c15t-theme">${css}</style>`}
	{/if}
</svelte:head>
