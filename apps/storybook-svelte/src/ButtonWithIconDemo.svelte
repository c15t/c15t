<script lang="ts">
	import { buttonVariants } from '@c15t/svelte';

	interface Props {
		label?: string;
		variant?: 'primary' | 'neutral';
		mode?: 'filled' | 'stroke' | 'lighter' | 'ghost';
	}

	const {
		label = 'Open preferences',
		variant = 'primary',
		mode = 'filled',
	}: Props = $props();

	const classes = buttonVariants({ variant, mode });
</script>

<button class={classes.root()} type="button">
	<span class={classes.icon()}>+</span>
	{label}
</button>
