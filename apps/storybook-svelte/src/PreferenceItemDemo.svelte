<script lang="ts">
	import { PreferenceItem, Switch } from '@c15t/svelte';
	import { enTranslations } from '@c15t/translations';

	interface Props {
		checked?: boolean;
		description?: string;
		disabled?: boolean;
		meta?: string;
		open?: boolean;
		title?: string;
		withSwitch?: boolean;
	}

	const { consentTypes } = enTranslations;

	const {
		checked: initialChecked = false,
		description = consentTypes.necessary.description,
		disabled = false,
		meta,
		open: initialOpen = false,
		title = consentTypes.necessary.title,
		withSwitch = false,
	}: Props = $props();

	let open = $state(initialOpen);
	let checked = $state(initialChecked);
</script>

<PreferenceItem.Root
	bind:open
	style="width:32rem;"
>
	<div
		style="border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-md);padding:1rem;"
	>
		<div
			style={withSwitch
				? 'align-items:center;display:flex;gap:0.75rem;justify-content:space-between;'
				: undefined}
		>
			<PreferenceItem.Trigger style={withSwitch ? 'flex:1;' : undefined}>
				<PreferenceItem.Leading>
					<span aria-hidden="true">{open ? '-' : '+'}</span>
				</PreferenceItem.Leading>
				<PreferenceItem.Header>
					<PreferenceItem.Title>{title}</PreferenceItem.Title>
					{#if meta}
						<PreferenceItem.Meta>{meta}</PreferenceItem.Meta>
					{/if}
				</PreferenceItem.Header>
			</PreferenceItem.Trigger>
			{#if withSwitch}
				<PreferenceItem.Control>
					<Switch.Root
						aria-label={title}
						{disabled}
						bind:checked
					/>
				</PreferenceItem.Control>
			{/if}
		</div>
		<PreferenceItem.Content>
			<div style={`margin-top:${open ? '0.75rem' : '0'};`}>
				<p style="margin:0;">{description}</p>
			</div>
		</PreferenceItem.Content>
	</div>
</PreferenceItem.Root>
