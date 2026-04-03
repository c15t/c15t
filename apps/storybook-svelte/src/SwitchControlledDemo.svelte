<script lang="ts">
	import { switchVariants, getSwitchState, toggleSwitchValue } from '@c15t/svelte';

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
		<button
			class={classes.root()}
			role="switch"
			aria-checked={String(checked)}
			aria-label={label}
			data-state={getSwitchState(checked)}
			type="button"
			onclick={() => { checked = toggleSwitchValue(checked); }}
		>
			<span class={classes.track()}><span class={classes.thumb()} /></span>
		</button>
		<span>{label}</span>
	</label>
	<div aria-live="polite">
		State: {checked ? 'enabled' : 'disabled'}
	</div>
</div>
