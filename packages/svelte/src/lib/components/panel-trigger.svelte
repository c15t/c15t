<script lang="ts">
	import styles from '@c15t/ui/styles/components/consent-dialog-trigger';
	import {
		calculateCornerFromDrag,
		createInitialDragState,
		getPersistedPosition,
		persistPosition as persistToStorage,
	} from '@c15t/ui/utils';
	import type { CornerPosition, DragState } from '@c15t/ui/utils';
	import {
		claimDevToolsLauncher,
		EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT,
		followDevToolsDock,
		getDevToolsLauncherSnapshot,
		subscribeDevToolsLauncher,
	} from '@c15t/ui/utils/devtools-launcher';
	import type {
		DevToolsLauncherSnapshot,
		DevToolsLauncherTarget,
	} from '@c15t/ui/utils/devtools-launcher';
	import { onMount, untrack } from 'svelte';

	import { portal } from '../actions/portal';
	import { getConsentContext, getThemeContext } from '../context.svelte';
	import { holdIdleDialogWarming, warmDialog } from '../dialog-warming';
	import { resolveComponentStyles, toStyleAttribute } from '../utils';
	import C15TIconOnly from './icons/c15-t-icon-only.svelte';
	import ConsentIconOnly from './icons/consent-icon-only.svelte';
	import DevToolsIcon from './icons/dev-tools-icon.svelte';

	type TriggerVisibility = 'always' | 'never';
	type ToolbarItem = 'devtools' | 'preferences';

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
	const theme = getThemeContext();

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
	// Nothing to manage without a resolved policy.
	const visible = $derived(
		consent.state.hasConsentPreferences &&
			showWhen !== 'never' &&
			consent.snapshot.activeUI !== 'dialog'
	);

	// Load the deferred dialog before the first click, but only while the
	// button is shown: a hidden trigger can't open the dialog.
	$effect(() => {
		if (visible) {
			return holdIdleDialogWarming(theme.preloadDialog);
		}
	});

	// With ConsentDevTools mounted for this kernel, the trigger becomes a
	// two-item toolbar that carries the DevTools launcher, so one control
	// occupies the corner.
	const launcherClaim = Symbol('ConsentDialogTrigger');
	let launcher: DevToolsLauncherSnapshot = $state.raw(
		EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT
	);

	$effect(() => {
		const { kernel } = consent;
		const read = () => {
			launcher = getDevToolsLauncherSnapshot(kernel);
		};
		read();
		return subscribeDevToolsLauncher(kernel, read);
	});

	const showToolbar = $derived(visible && launcher.instance !== null);

	// Claim the launcher only while the toolbar is on screen. Releasing it,
	// for example when the trigger hides, gives DevTools its launcher back.
	$effect(() => {
		if (showToolbar) {
			return claimDevToolsLauncher(consent.kernel, launcherClaim);
		}
	});

	// The first visible trigger owns the launcher; others render without it.
	const devTools: DevToolsLauncherTarget | null = $derived(
		launcher.owner === launcherClaim ? launcher.instance : null
	);
	const isDragging = $derived(dragState.isDragging);
	let toolbarElement: HTMLDivElement | undefined = $state();

	// Keep the docked panel beside the toolbar as it changes corner or size.
	// Skip mid-drag; the drop re-runs this.
	$effect(() => {
		const target = devTools;
		const element = toolbarElement;
		if (!target || !element || isDragging) {
			return;
		}
		return followDevToolsDock(element, corner, (placement) =>
			target.dock(placement)
		);
	});

	// Preferences sits in the corner; DevTools, a development aid, sits
	// farthest from it.
	const toolbarItems: ToolbarItem[] = $derived.by(() => {
		if (!devTools) {
			return ['preferences'];
		}
		return corner.endsWith('left')
			? ['preferences', 'devtools']
			: ['devtools', 'preferences'];
	});
	let focusedItem: ToolbarItem | undefined = $state();
	const tabStopItem = $derived(
		focusedItem && toolbarItems.includes(focusedItem)
			? focusedItem
			: toolbarItems[0]
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

	const handleDevToolsClick = function handleDevToolsClick() {
		if (hasDragged) {
			return;
		}
		devTools?.toggle();
	};

	const handleToolbarKeyDown = function handleToolbarKeyDown(e: KeyboardEvent) {
		const index = tabStopItem ? toolbarItems.indexOf(tabStopItem) : 0;
		let next: ToolbarItem | undefined;
		switch (e.key) {
			case 'ArrowRight':
				next = toolbarItems[(index + 1) % toolbarItems.length];
				break;
			case 'ArrowLeft':
				next =
					toolbarItems[(index - 1 + toolbarItems.length) % toolbarItems.length];
				break;
			case 'Home':
				[next] = toolbarItems;
				break;
			case 'End':
				next = toolbarItems.at(-1);
				break;
			default:
				return;
		}
		e.preventDefault();
		if (next) {
			focusedItem = next;
			toolbarElement
				?.querySelector<HTMLElement>(`[data-c15t-trigger-item="${next}"]`)
				?.focus();
		}
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

	const triggerStyle = $derived(
		resolveComponentStyles(
			'consentDialogTrigger',
			theme.theme,
			{
				baseClassName: [
					styles.trigger,
					positionClass,
					sizeClassMap[size],
					dragState.isDragging && styles.dragging,
					isSnapping && styles.snapping,
				],
				className,
				noStyle,
			},
			noStyle
		)
	);
	const iconStyle = $derived(
		resolveComponentStyles(
			'consentDialogTriggerIcon',
			theme.theme,
			{ baseClassName: styles.icon, noStyle },
			noStyle
		)
	);
	const toolbarStyle = $derived(
		resolveComponentStyles(
			'consentDialogTriggerToolbar',
			theme.theme,
			{
				baseClassName: [
					styles.toolbar,
					positionClass,
					dragState.isDragging && styles.dragging,
					isSnapping && styles.snapping,
				],
				noStyle,
			},
			noStyle
		)
	);
	const preferencesItemStyle = $derived(
		resolveComponentStyles(
			'consentDialogTriggerToolbarItem',
			theme.theme,
			{
				baseClassName: [styles.toolbarItem, sizeClassMap[size]],
				className,
				noStyle,
			},
			noStyle
		)
	);
	const devToolsItemStyle = $derived(
		resolveComponentStyles(
			'consentDialogTriggerToolbarItem',
			theme.theme,
			{ baseClassName: [styles.toolbarItem, sizeClassMap[size]], noStyle },
			noStyle
		)
	);
	const toolbarIconStyle = $derived(
		resolveComponentStyles(
			'consentDialogTriggerToolbarIcon',
			theme.theme,
			{ baseClassName: styles.toolbarIcon, noStyle },
			noStyle
		)
	);
	const toolbarAttributeStyle = $derived(
		[toStyleAttribute(toolbarStyle.style), dragStyle]
			.filter(Boolean)
			.join(';') || undefined
	);
	const buttonStyle = $derived(
		[toStyleAttribute(triggerStyle.style), dragStyle]
			.filter(Boolean)
			.join(';') || undefined
	);
</script>

{#snippet brandingIcon()}
	{#if branding === 'consent'}
		<ConsentIconOnly />
	{:else}
		<C15TIconOnly />
	{/if}
{/snippet}

{#if visible}
	<div use:portal>
		{#if showToolbar}
			<div
				bind:this={toolbarElement}
				class={toolbarStyle.className || ''}
				style={toolbarAttributeStyle}
				role="toolbar"
				tabindex="-1"
				dir="ltr"
				aria-label="Privacy controls"
				aria-orientation="horizontal"
				data-corner={corner}
				data-c15t-trigger-toolbar="true"
				data-c15t-trigger="true"
				data-disable-animation={theme.disableAnimation ? '' : undefined}
				data-dragging={isDragging || undefined}
				data-snapping={isSnapping || undefined}
				onkeydown={handleToolbarKeyDown}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerCancel}
			>
				{#each toolbarItems as item (item)}
					{#if item === 'devtools'}
						<button
							type="button"
							class={devToolsItemStyle.className || ''}
							style={toStyleAttribute(devToolsItemStyle.style)}
							tabindex={tabStopItem === item ? 0 : -1}
							aria-label="c15t DevTools"
							aria-expanded={launcher.isOpen}
							data-c15t-trigger-action="devtools"
							data-c15t-trigger-item="devtools"
							onclick={handleDevToolsClick}
							onfocus={() => (focusedItem = item)}
						>
							<span
								class={toolbarIconStyle.className || ''}
								style={toStyleAttribute(toolbarIconStyle.style)}
								aria-hidden="true"
							>
								<span
									class={iconStyle.className || ''}
									style={toStyleAttribute(iconStyle.style)}
								>
									<DevToolsIcon />
								</span>
							</span>
						</button>
					{:else}
						<button
							type="button"
							class={preferencesItemStyle.className || ''}
							style={toStyleAttribute(preferencesItemStyle.style)}
							tabindex={tabStopItem === item ? 0 : -1}
							aria-label={ariaLabel}
							data-c15t-rights={consent.snapshot.policyRule.rights.join(' ')}
							data-c15t-trigger-action="preferences"
							data-c15t-trigger-item="preferences"
							onclick={handleClick}
							onpointerenter={warmDialog}
							onfocus={() => {
								focusedItem = item;
								warmDialog();
							}}
							data-testid="consent-dialog-trigger"
						>
							<span
								class={toolbarIconStyle.className || ''}
								style={toStyleAttribute(toolbarIconStyle.style)}
								aria-hidden="true"
							>
								<span
									class={iconStyle.className || ''}
									style={toStyleAttribute(iconStyle.style)}
								>
									{@render brandingIcon()}
								</span>
							</span>
						</button>
					{/if}
				{/each}
			</div>
		{:else}
			<button
				type="button"
				class={triggerStyle.className || ''}
				style={buttonStyle}
				data-c15t-trigger="true"
				data-c15t-rights={consent.snapshot.policyRule.rights.join(' ')}
				data-disable-animation={theme.disableAnimation ? '' : undefined}
				aria-label={ariaLabel}
				onclick={handleClick}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerCancel}
				onpointerenter={warmDialog}
				onfocus={warmDialog}
				data-testid="consent-dialog-trigger"
			>
				<span
					class={iconStyle.className || ''}
					style={toStyleAttribute(iconStyle.style)}
					aria-hidden="true"
				>
					{@render brandingIcon()}
				</span>
			</button>
		{/if}
	</div>
{/if}
