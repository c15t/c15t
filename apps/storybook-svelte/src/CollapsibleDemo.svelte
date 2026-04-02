<script lang="ts">
	import { collapsibleVariants, getOpenState } from '@c15t/framework-svelte';

	interface Props {
		defaultOpen?: boolean;
		title?: string;
		description?: string;
	}

	const {
		defaultOpen = true,
		title = 'Analytics',
		description = 'These cookies help us understand how visitors interact with the website.',
	}: Props = $props();

	let open = $state(defaultOpen);
	const classes = collapsibleVariants();
</script>

<div class={classes.root()}>
	<div style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);display:grid;gap:0.75rem;padding:1rem;width:32rem;">
		<button
			class={classes.trigger()}
			type="button"
			style="align-items:center;display:flex;font-weight:600;justify-content:space-between;width:100%;"
			onclick={() => { open = !open; }}
		>
			<span>{title}</span>
			<span aria-hidden="true">+</span>
		</button>
		<div class={classes.content()} data-state={getOpenState(open)}>
			{#if open}
				<p style="margin:0;">{description}</p>
			{/if}
		</div>
	</div>
</div>
