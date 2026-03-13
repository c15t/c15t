<script lang="ts">
	import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
	import { onMount, untrack } from 'svelte';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { portal } from '../actions/portal';
	import C15TIconOnly from './icons/C15TIconOnly.svelte';
	import ConsentIconOnly from './icons/ConsentIconOnly.svelte';

	type CornerPosition =
		| 'bottom-right'
		| 'bottom-left'
		| 'top-right'
		| 'top-left';
	type TriggerVisibility = 'always' | 'after-consent' | 'never';

	let {
		defaultPosition = 'bottom-right' as CornerPosition,
		persistPosition = true,
		showWhen = 'always' as TriggerVisibility,
		size = 'md' as 'sm' | 'md' | 'lg',
		ariaLabel = 'Open privacy settings',
		noStyle = false,
		class: className,
		onclick,
	}: {
		defaultPosition?: CornerPosition;
		persistPosition?: boolean;
		showWhen?: TriggerVisibility;
		size?: 'sm' | 'md' | 'lg';
		ariaLabel?: string;
		noStyle?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const consent = getConsentContext();
	const theme = getThemeContext();

	let isMounted = $state(false);
	let position: CornerPosition = $state(untrack(() => defaultPosition));

	onMount(() => {
		isMounted = true;
		// Restore persisted position from localStorage if enabled
		if (persistPosition) {
			const saved = localStorage.getItem('c15t-trigger-position');
			if (saved) {
				position = saved as CornerPosition;
			}
		}
	});

	const branding = $derived(consent.state.branding);
	const hasConsented = $derived(consent.state.consentInfo != null);
	const activeUI = $derived(consent.state.activeUI);

	const shouldShow = $derived.by(() => {
		if (showWhen === 'never') return false;
		if (showWhen === 'after-consent') return hasConsented;
		return true; // 'always'
	});

	const visible = $derived(shouldShow && activeUI === 'none');

	function handleClick(e: MouseEvent) {
		consent.state.setActiveUI('dialog');
		onclick?.(e);
	}

	// Position class mapping
	const positionClassMap: Record<CornerPosition, string> = {
		'bottom-right': 'bottomRight',
		'bottom-left': 'bottomLeft',
		'top-right': 'topRight',
		'top-left': 'topLeft',
	};

	const positionClass = $derived(styles[positionClassMap[position]] || '');
</script>

{#if isMounted && visible}
	<div use:portal>
		<button
			type="button"
			class={noStyle
				? className
				: `${styles.trigger || ''} ${styles[size] || ''} ${positionClass} ${className || ''}`}
			aria-label={ariaLabel}
			onclick={handleClick}
			data-testid="consent-dialog-trigger"
		>
			<span class={noStyle ? '' : styles.icon || ''}>
				{#if branding === 'consent'}
					<ConsentIconOnly />
				{:else}
					<C15TIconOnly />
				{/if}
			</span>
		</button>
	</div>
{/if}
