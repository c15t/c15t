<script lang="ts">
	import { Dialog, buttonVariants } from '@c15t/svelte';

	const button = buttonVariants();

	let open = $state(true);
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
		Re-open dialog
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
					Controlled dialog
				</Dialog.Title>
				<Dialog.Description style="color:var(--c15t-text-muted);margin:0;">
					This story proves the primitive works in controlled mode.
				</Dialog.Description>
				<div style="display:flex;gap:0.75rem;justify-content:flex-end;">
					<button
						type="button"
						class={button.root({ mode: 'ghost', variant: 'neutral' })}
						onclick={() => {
							open = false;
						}}
					>
						Close
					</button>
				</div>
			</Dialog.Content>
		</Dialog.Positioner>
	</Dialog.Portal>
</Dialog.Root>
