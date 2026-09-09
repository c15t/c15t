<script lang="ts">
	import styles from '@c15t/ui/styles/components/consent-dialog-trigger';
	import {
		calculateCornerFromDrag,
		createInitialDragState,
		getPersistedPosition,
		persistPosition as persistToStorage,
	} from '@c15t/ui/utils';
	import type { CornerPosition, DragState } from '@c15t/ui/utils';
	import { onMount, untrack } from 'svelte';

	import { portal } from '../actions/portal';
	import { getConsentContext } from '../context.svelte';
	import C15TIconOnly from './icons/c15-t-icon-only.svelte';
	import ConsentIconOnly from './icons/consent-icon-only.svelte';

	type TriggerVisibility = 'always' | 'never';

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

	let corner: CornerPosition = $state(untrack(() => defaultPosition));

	// Drag state
	let dragState: DragState = $state(createInitialDragState());
	let isSnapping = $state(false);
	let hasDragged = $state(false);
	let dragStartTime = $state(0);
	let capturedElement: HTMLElement | null = null;

	onMount(() => {
		if (persistPosition) {
			const persisted = getPersistedPosition();
			if (persisted) {
				corner = persisted;
			}
		}
	});

	const branding = $derived(consent.state.branding);
	const visible = $derived(
		showWhen !== 'never' && consent.snapshot.activeUI !== 'dialog'
	);

	// Position class mapping
	const cornerClassMap: Record<CornerPosition, string> = {
		'bottom-left': styles.bottomLeft || '',
		'bottom-right': styles.bottomRight || '',
		'top-left': styles.topLeft || '',
		'top-right': styles.topRight || '',
	};

	const sizeClassMap: Record<string, string> = {
		lg: styles.lg || '',
		md: styles.md || '',
		sm: styles.sm || '',
	};

	const positionClass = $derived(cornerClassMap[corner] || '');

	// Drag style
	const dragStyle = $derived(
		dragState.isDragging
			? `transform: translate(${dragState.currentX - dragState.startX}px, ${dragState.currentY - dragState.startY}px); transition: none;`
			: 'transform: none;'
	);

	const updateCorner = function updateCorner(newCorner: CornerPosition) {
		corner = newCorner;
		if (persistPosition) {
			persistToStorage(newCorner);
		}
		onPositionChange?.(newCorner);
	};

	const handlePointerDown = function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) {
			return;
		}

		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		capturedElement = e.target as HTMLElement;
		hasDragged = false;
		dragStartTime = Date.now();

		dragState = {
			currentX: e.clientX,
			currentY: e.clientY,
			isDragging: true,
			startX: e.clientX,
			startY: e.clientY,
		};

		isSnapping = false;
	};

	const handlePointerMove = function handlePointerMove(e: PointerEvent) {
		if (!dragState.isDragging) {
			return;
		}

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
	};

	const handlePointerUp = function handlePointerUp(e: PointerEvent) {
		if (capturedElement) {
			capturedElement.releasePointerCapture(e.pointerId);
			capturedElement = null;
		}

		if (!dragState.isDragging) {
			return;
		}

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
	};

	const handlePointerCancel = function handlePointerCancel(e: PointerEvent) {
		if (capturedElement) {
			capturedElement.releasePointerCapture(e.pointerId);
			capturedElement = null;
		}
		dragState = createInitialDragState();
	};

	const handleClick = function handleClick(e: MouseEvent) {
		// Don't open dialog if this was a drag interaction
		if (hasDragged) {
			return;
		}
		onclick?.(e);
		if (!e.defaultPrevented) {
			consent.state.setActiveUI('dialog');
		}
	};

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
					.join(' ')
	);
</script>

{#if visible}
	<div use:portal>
		<button
			type="button"
			class={buttonClasses}
			style={dragStyle}
			data-c15t-trigger="true"
			data-c15t-rights={consent.snapshot.policyRule.rights.join(' ')}
			aria-label={ariaLabel}
			onclick={handleClick}
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
			data-testid="consent-dialog-trigger"
		>
			<span
				class={noStyle ? '' : styles.icon || ''}
				aria-hidden="true"
			>
				{#if branding === 'consent'}
					<ConsentIconOnly />
				{:else}
					<C15TIconOnly />
				{/if}
			</span>
		</button>
	</div>
{/if}
