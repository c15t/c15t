<script lang="ts">
	import { buttonVariants, switchVariants } from '@c15t/framework-svelte';

	const buttonClass = buttonVariants({ variant: 'primary' }).root();
	const switchClasses = switchVariants();
</script>

<div style="display:grid;gap:1rem;min-width:20rem;">
	<button class={buttonClass}>Button</button>
	<button
		class={switchClasses.root()}
		role="switch"
		aria-label="Enable analytics"
		aria-checked="false"
		type="button"
	>
		<span class={switchClasses.track()}><span class={switchClasses.thumb()}></span></span>
	</button>
	<details open>
		<summary>Accordion</summary>
		<div>Content</div>
	</details>
	<dialog open>
		<h2>Privacy settings</h2>
		<p>Svelte workbench scaffold for primitives.</p>
	</dialog>
</div>
