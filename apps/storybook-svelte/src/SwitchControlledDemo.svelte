<script lang="ts">
	import { Switch, switchVariants } from '@c15t/svelte';

	interface Props {
		label?: string;
	}

	const {
		label = 'Functionality',
	}: Props = $props();

	let checked = $state(true);
	const classes = switchVariants();
</script>

<div style="display:grid;gap:0.75rem;">
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<Switch.Root
			class={classes.root()}
			bind:checked
			aria-label={label}
		>
			<Switch.Control class={classes.track()}>
				<Switch.Thumb class={classes.thumb()} />
			</Switch.Control>
			<Switch.HiddenInput />
		</Switch.Root>
		<span>{label}</span>
	</label>
	<div aria-live="polite">
		State: {checked ? 'enabled' : 'disabled'}
	</div>
</div>
