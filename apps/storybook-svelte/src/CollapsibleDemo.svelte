<script lang="ts">
	import { Collapsible, collapsibleVariants, getOpenState } from '@c15t/svelte';

	interface Props {
		title?: string;
		description?: string;
		open?: boolean;
	}

	const {
		title = 'Analytics',
		description = 'These cookies help us understand how visitors interact with the website.',
		open: initialOpen = true,
	}: Props = $props();

	let open = $state(initialOpen);
	const classes = collapsibleVariants();
</script>

<Collapsible.Root
	bind:open
	class={classes.root()}
	style="--collapsible-gap:0.75rem;border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);padding:1rem;width:32rem;"
>
	<Collapsible.Trigger
		class={classes.trigger()}
		style="align-items:center;display:flex;font-weight:600;justify-content:space-between;width:100%;"
	>
		<span>{title}</span>
		<span aria-hidden="true">+</span>
	</Collapsible.Trigger>
	<div class={classes.content()} data-state={getOpenState(open)}>
		<div class={classes.contentViewport()}>
			<div class={classes.contentInner()}>
				<p style="margin:0;">{description}</p>
			</div>
		</div>
	</div>
</Collapsible.Root>
