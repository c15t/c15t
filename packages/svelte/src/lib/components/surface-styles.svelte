<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { untrack } from 'svelte';

	import { getThemeContext } from '../context.svelte';
	import {
		ensureSurfaceStyles,
		STYLES_MARKER,
		stylesMarker,
	} from '../surface-styles';
	import type { SurfaceStyleSheet } from '../surface-styles';

	/**
	 * Gives a stock surface its stylesheets: inserts them in the browser
	 * before the surface's elements render, and leaves a marker in the
	 * server-rendered `<head>` that `c15tHandle` turns into `<style>`
	 * elements. Renders nothing with the provider's `styles: false` or
	 * `noStyle`.
	 */
	let {
		sheets,
		noStyle = false,
	}: {
		sheets: readonly SurfaceStyleSheet[];
		noStyle?: boolean;
	} = $props();

	const theme = getThemeContext();
	const enabled = $derived(
		theme.styles !== false && !noStyle && !theme.noStyle
	);

	// The script runs before the surface's elements are created, so they
	// are styled on their first frame. Once: the inserted sheets stay.
	if (BROWSER) {
		untrack(() => {
			if (enabled) {
				ensureSurfaceStyles(sheets, theme.nonce);
			}
		});
	}
</script>

<svelte:head>
	{#if enabled}
		<meta
			name={STYLES_MARKER}
			content={stylesMarker(sheets, theme.nonce)}
		/>
	{/if}
</svelte:head>
