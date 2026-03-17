<script lang="ts">
	import styles from '@c15t/ui/styles/components/consent-dialog-trigger.module.js';
	import {
		type CornerPosition,
		calculateCornerFromDrag,
		createInitialDragState,
		type DragState,
		getPersistedPosition,
		persistPosition as persistToStorage,
	} from '@c15t/ui/utils';
	import { onMount, untrack } from 'svelte';
	import { getConsentContext } from '../context.svelte';
	import { portal } from '../actions/portal';
	import C15TIconOnly from './icons/C15TIconOnly.svelte';
	import ConsentIconOnly from './icons/ConsentIconOnly.svelte';

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
		onPositionChange,
	}: {
		defaultPosition?: CornerPosition;
		persistPosition?: boolean;
		showWhen?: TriggerVisibility;
		size?: 'sm' | 'md' | 'lg';
		ariaLabel?: string;
		noStyle?: boolean;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		onPositionChange?: (position: CornerPosition) => void;
	} = $props();

	const consent = getConsentContext();

	let isMounted = $state(false);
	let corner: CornerPosition = $state(untrack(() => defaultPosition));

	// Drag state
	let dragState: DragState = $state(createInitialDragState());
	let isSnapping = $state(false);
	let hasDragged = $state(false);
	let dragStartTime = $state(0);
	let capturedElement: HTMLElement | null = null;

	onMount(() => {
		isMounted = true;
		if (persistPosition) {
			const persisted = getPersistedPosition();
			if (persisted) {
				corner = persisted;
			}
		}
	});

	const branding = $derived(consent.state.branding);
	const hasConsented = $derived(consent.state.consentInfo != null);
	const activeUI = $derived(consent.state.activeUI);

	const shouldShow = $derived.by(() => {
		if (showWhen === 'never') return false;
		if (showWhen === 'after-consent') return hasConsented;
		return true;
	});

	const visible = $derived(shouldShow && activeUI === 'none');

	// Position class mapping
	const cornerClassMap: Record<CornerPosition, string> = {
		'bottom-right': styles.bottomRight || '',
		'bottom-left': styles.bottomLeft || '',
		'top-right': styles.topRight || '',
		'top-left': styles.topLeft || '',
	};

	const sizeClassMap: Record<string, string> = {
		sm: styles.sm || '',
		md: styles.md || '',
		lg: styles.lg || '',
	};

	const positionClass = $derived(cornerClassMap[corner] || '');

	// Drag style
	const dragStyle = $derived(
		dragState.isDragging
			? `transform: translate(${dragState.currentX - dragState.startX}px, ${dragState.currentY - dragState.startY}px); transition: none;`
			: '',
	);

	function updateCorner(newCorner: CornerPosition) {
		corner = newCorner;
		if (persistPosition) {
			persistToStorage(newCorner);
		}
		onPositionChange?.(newCorner);
	}

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		capturedElement = e.target as HTMLElement;
		hasDragged = false;
		dragStartTime = Date.now();

		dragState = {
			isDragging: true,
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
		};

		isSnapping = false;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragState.isDragging) return;

		const dx = Math.abs(e.clientX - dragState.startX);
		const dy = Math.abs(e.clientY - dragState.startY);
		if (dx > 5 || dy > 5) {
			hasDragged = true;
		}

		dragState = {
			...dragState,
			currentX: e.clientX,
			currentY: e.clientY,
		};
	}

	function handlePointerUp(e: PointerEvent) {
		if (capturedElement) {
			capturedElement.releasePointerCapture(e.pointerId);
			capturedElement = null;
		}

		if (!dragState.isDragging) return;

		if (hasDragged) {
			const dragX = e.clientX - dragState.startX;
			const dragY = e.clientY - dragState.startY;
			const dragDuration = Date.now() - dragStartTime;

			const velocityX = dragDuration > 0 ? dragX / dragDuration : 0;
			const velocityY = dragDuration > 0 ? dragY / dragDuration : 0;

			const newCorner = calculateCornerFromDrag(corner, dragX, dragY, {
				velocityX,
				velocityY,
			});

			if (newCorner !== corner) {
				isSnapping = true;
				setTimeout(() => {
					isSnapping = false;
				}, 300);
				updateCorner(newCorner);
			}
		}

		dragState = createInitialDragState();
	}

	function handlePointerCancel(e: PointerEvent) {
		if (capturedElement) {
			capturedElement.releasePointerCapture(e.pointerId);
			capturedElement = null;
		}
		dragState = createInitialDragState();
	}

	function handleClick(e: MouseEvent) {
		// Don't open dialog if this was a drag interaction
		if (hasDragged) return;
		consent.state.setActiveUI('dialog');
		onclick?.(e);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			consent.state.setActiveUI('dialog');
		}
	}

	const buttonClasses = $derived(
		noStyle
			? className
			: [
					styles.trigger,
					positionClass,
					sizeClassMap[size],
					dragState.isDragging && styles.dragging,
					isSnapping && styles.snapping,
					className,
				]
					.filter(Boolean)
					.join(' '),
	);
</script>

{#if isMounted && visible}
	<div use:portal>
		<button
			type="button"
			class={buttonClasses}
			style={dragStyle}
			data-c15t-trigger="true"
			aria-label={ariaLabel}
			onclick={handleClick}
			onkeydown={handleKeyDown}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
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
