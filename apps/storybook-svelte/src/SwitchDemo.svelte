<script lang="ts">
	import { Switch, switchVariants } from '@c15t/svelte';

	interface Props {
		label?: string;
		checked?: boolean;
		disabled?: boolean;
		size?: 'small' | 'medium';
	}

	const {
		label = 'Analytics',
		checked: initialChecked = false,
		disabled = false,
		size = 'medium',
	}: Props = $props();

	let checked = $state(initialChecked);
	const classes = switchVariants({ size });
</script>

<div style="display:grid;gap:0.75rem;">
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<Switch.Root
			bind:checked
			class={classes.root()}
			aria-label={label}
			{disabled}
		>
			<Switch.Control class={classes.track({ disabled })}>
				<Switch.Thumb class={classes.thumb({ disabled })} />
			</Switch.Control>
			<Switch.HiddenInput />
		</Switch.Root>
		<span>{label}</span>
	</label>
</div>
