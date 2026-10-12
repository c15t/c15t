<script lang="ts">
	import { Switch, switchVariants } from '@c15t/svelte';

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
		<Switch.Root
			bind:checked={checkedMedium}
			class={mediumClasses.root()}
			aria-label={mediumLabel}
		>
			<Switch.Control class={mediumClasses.track()}>
				<Switch.Thumb class={mediumClasses.thumb()} />
			</Switch.Control>
			<Switch.HiddenInput />
		</Switch.Root>
		<span>{mediumLabel}</span>
	</label>
	<label style="align-items:center;display:inline-flex;gap:0.75rem;">
		<Switch.Root
			bind:checked={checkedSmall}
			class={smallClasses.root()}
			aria-label={smallLabel}
		>
			<Switch.Control class={smallClasses.track()}>
				<Switch.Thumb class={smallClasses.thumb()} />
			</Switch.Control>
			<Switch.HiddenInput />
		</Switch.Root>
		<span>{smallLabel}</span>
	</label>
</div>
