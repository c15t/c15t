<script lang="ts">
	let { children, data } = $props();
</script>

<!-- #region docs:theme-style title="src/routes/+layout.svelte" -->
<svelte:head>
	<!-- generateThemeCSS escapes `<`, so its output is safe in a style element. -->
	{@html `<style id="c15t-theme">${data.themeCSS}</style>`}
</svelte:head>
<!-- #endregion docs:theme-style -->

{@render children()}
