<script
	lang="ts"
	module
>
	import type PanelComponent from './panel.svelte';

	let pending: Promise<typeof PanelComponent> | null = null;

	/**
	 * One import shared by every `ConsentDialog` on the page. A failed import
	 * is forgotten, so the next hover, focus or open retries it.
	 */
	const loadPanel = function loadPanel(): Promise<typeof PanelComponent> {
		pending ??= (async () => {
			try {
				return (await import('./panel.svelte')).default;
			} catch (error) {
				pending = null;
				throw error;
			}
		})();
		return pending;
	};
</script>

<script lang="ts">
	/**
	 * `ConsentDialog`: the preference dialog, loaded on first use.
	 *
	 * The dialog and the preference widget inside it stay out of the first
	 * load. They load when the dialog opens, or earlier: in idle time after
	 * the page loads while a button that opens it is mounted, and on hover or
	 * focus of that button (see `preloadDialog`). Props are the dialog's own.
	 */
	import { onMount } from 'svelte';

	import { getConsentContext } from '../context.svelte';
	import { registerDialogWarmer } from '../dialog-warming';
	import type { ConsentDialogProps } from './panel-props';

	const props: ConsentDialogProps = $props();

	const consent = getConsentContext();
	let Panel = $state<typeof PanelComponent | null>(null);

	const load = async function load() {
		if (Panel) {
			return;
		}
		try {
			Panel = await loadPanel();
		} catch {
			// Retried on the next warm or open.
		}
	};

	onMount(() =>
		registerDialogWarmer(() => {
			void load();
		})
	);

	// The dialog is needed as soon as it opens, and at once when it renders
	// its own trigger.
	const needed = $derived(
		Boolean(props.showTrigger) ||
			(props.open ?? consent.state.activeUI === 'dialog')
	);

	$effect(() => {
		if (needed) {
			void load();
		}
	});
</script>

{#if Panel}
	<Panel {...props} />
{/if}
