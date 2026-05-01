<script lang="ts">
	import { getSwitchState, switchVariants, toggleSwitchValue } from '@c15t/svelte';

	interface Props {
		label?: string;
		defaultChecked?: boolean;
		disabled?: boolean;
		size?: 'small' | 'medium';
	}

	const {
		label = 'Analytics',
		defaultChecked = false,
		disabled = false,
		size = 'medium',
	}: Props = $props();

	let checked = $state(defaultChecked);
	const classes = switchVariants({ size });
</script>

<div style="display:grid;gap:0.75rem;">
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<button
			class={classes.root()}
			role="switch"
			aria-checked={String(checked)}
			aria-label={label}
			data-state={getSwitchState(checked)}
			type="button"
			{disabled}
			onclick={() => { if (!disabled) checked = toggleSwitchValue(checked); }}
		>
			<span class={classes.track({ disabled })}><span class={classes.thumb({ disabled })} /></span>
		</button>
		<span>{label}</span>
	</label>
</div>
