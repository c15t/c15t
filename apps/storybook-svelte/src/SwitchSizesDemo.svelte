<script lang="ts">
	import { switchVariants, getSwitchState, toggleSwitchValue } from '@c15t/framework-svelte';

	interface Props {
		mediumLabel?: string;
		smallLabel?: string;
	}

	const {
		mediumLabel = 'Strictly Necessary',
		smallLabel = 'Functionality',
	}: Props = $props();

	let checkedMedium = $state(true);
	let checkedSmall = $state(true);
	const mediumClasses = switchVariants({ size: 'medium' });
	const smallClasses = switchVariants({ size: 'small' });
</script>

<div style="display:grid;gap:1rem;">
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<button
			class={mediumClasses.root()}
			role="switch"
			aria-checked={String(checkedMedium)}
			aria-label={mediumLabel}
			data-state={getSwitchState(checkedMedium)}
			type="button"
			onclick={() => { checkedMedium = toggleSwitchValue(checkedMedium); }}
		>
			<span class={mediumClasses.track()}><span class={mediumClasses.thumb()} /></span>
		</button>
		<span>{mediumLabel}</span>
	</label>
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<button
			class={smallClasses.root()}
			role="switch"
			aria-checked={String(checkedSmall)}
			aria-label={smallLabel}
			data-state={getSwitchState(checkedSmall)}
			type="button"
			onclick={() => { checkedSmall = toggleSwitchValue(checkedSmall); }}
		>
			<span class={smallClasses.track()}><span class={smallClasses.thumb()} /></span>
		</button>
		<span>{smallLabel}</span>
	</label>
</div>
