<script lang="ts">
	import {
		Dialog,
		buttonVariants,
		getSwitchState,
		switchVariants,
		toggleSwitchValue,
	} from '@c15t/svelte';
	import { enTranslations } from '@c15t/translations';

	const { common, consentManagerDialog, consentTypes } = enTranslations;

	const button = buttonVariants();
	const switchClasses = switchVariants();

	let open = $state(false);
	let checked = $state(true);
</script>

<div
	style="align-items:center;display:grid;inset:0;place-items:center;position:fixed;"
>
	<button
		type="button"
		class={button.root({ variant: 'primary' })}
		onclick={() => {
			open = true;
		}}
	>
		{common.customize}
	</button>
</div>

<Dialog.Root
	{open}
	onOpenChange={(details) => {
		open = details.open;
	}}
	closeOnInteractOutside={true}
	closeOnEscape={true}
	trapFocus={true}
	preventScroll={true}
	lazyMount
	unmountOnExit
>
	<Dialog.Portal>
		<Dialog.Backdrop
			style="background:var(--c15t-overlay);border:0;cursor:default;inset:0;position:fixed;"
		/>
		<Dialog.Positioner>
			<Dialog.Content
				style="background:var(--c15t-surface);border:1px solid var(--c15t-border);border-radius:var(--c15t-radius-lg);box-shadow:var(--c15t-shadow-lg);color:var(--c15t-text);display:grid;gap:1rem;left:50%;max-width:32rem;padding:1.5rem;position:fixed;top:50%;transform:translate(-50%, -50%);width:calc(100vw - 2rem);z-index:1;"
			>
				<Dialog.Title style="font-size:1.5rem;margin:0;">
					{consentManagerDialog.title}
				</Dialog.Title>
				<Dialog.Description style="color:var(--c15t-text-muted);margin:0;">
					{consentManagerDialog.description}
				</Dialog.Description>
				<div
					style="align-items:center;display:flex;justify-content:space-between;gap:1rem;"
				>
					<div>
						<div style="font-weight:600;">{consentTypes.measurement.title}</div>
						<div style="color:var(--c15t-text-muted);font-size:0.925rem;">
							{consentTypes.measurement.description}
						</div>
					</div>
					<button
						type="button"
						class={switchClasses.root()}
						role="switch"
						aria-label="Enable analytics cookies"
						aria-checked={checked}
						data-state={getSwitchState(checked)}
						onclick={() => {
							checked = toggleSwitchValue(checked);
						}}
					>
						<span class={switchClasses.track()}>
							<span class={switchClasses.thumb()}></span>
						</span>
					</button>
				</div>
				<div style="display:flex;gap:0.75rem;justify-content:flex-end;">
					<Dialog.CloseTrigger
						class={button.root({ mode: 'ghost', variant: 'neutral' })}
					>
						{common.rejectAll}
					</Dialog.CloseTrigger>
					<Dialog.CloseTrigger class={button.root({ variant: 'primary' })}>
						{common.save}
					</Dialog.CloseTrigger>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Dialog.Portal>
</Dialog.Root>
