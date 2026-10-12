<script lang="ts">
	let { children, data } = $props();
</script>

<svelte:head>
	<!-- generateThemeCSS escapes `<`, so its output is safe in a style element. -->
	{@html `<style id="c15t-theme">${data.themeCSS}</style>`}
</svelte:head>

{@render children()}
