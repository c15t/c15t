import type { ConsentSnapshot } from '@c15t/core';
import {
	calculateCornerFromDrag,
	getPersistedPosition,
	persistPosition,
} from '@c15t/ui/utils';
import type { CornerPosition } from '@c15t/ui/utils';
import {
	claimDevToolsLauncher,
	followDevToolsDock,
	getDevToolsLauncherSnapshot,
	subscribeDevToolsLauncher,
} from '@c15t/ui/utils/devtools-launcher';
import type { DevToolsLauncherTarget } from '@c15t/ui/utils/devtools-launcher';

import { classes } from '../generated/styles';
import { hasDecided } from '../has-decided';
import type { ConsentTriggerOptions } from '../types';
import { cx, h, svg } from './dom';
import type { Surface, SurfaceContext } from './surface';
import { createTriggerToolbar } from './trigger-toolbar';
import type { TriggerToolbar } from './trigger-toolbar';

const CONSENT_MARK = [
	'M53.179 70.787c6.17 0 11.172-5.002 11.172-11.172 0-4.009-2.111-7.524-5.283-9.495a23.87 23.87 0 0 1 8.817-1.677c13.217 0 23.93 10.714 23.93 23.93s-10.713 23.93-23.93 23.93c-13.216 0-23.93-10.714-23.93-23.93 0-1.924.227-3.795.656-5.588a11.148 11.148 0 0 0 8.568 4.002Z',
];

const POSITION_CLASS: Record<CornerPosition, keyof typeof classes.trigger> = {
	'bottom-left': 'bottomLeft',
	'bottom-right': 'bottomRight',
	'top-left': 'topLeft',
	'top-right': 'topRight',
};

/** Movement past which a pointer sequence counts as a drag, not a click. */
const DRAG_SLOP_PX = 5;
const SNAP_MS = 300;

/**
 * The floating button that reopens the preference centre.
 *
 * Hidden while the banner or dialog is up. Drag it to another corner and
 * it snaps there and remembers the choice, the way the framework triggers
 * do.
 *
 * While a DevTools panel is mounted for the same client (`mountDevTools`
 * or `c15t.devtools.js`), the visible trigger becomes a two-item toolbar
 * that carries the DevTools launcher and docks the panel beside itself.
 * Hidden, it hands the launcher back to the panel.
 *
 * @param ctx - The mount context.
 * @param options - Trigger options.
 * @returns The surface.
 */
// oxlint-disable-next-line max-lines-per-function -- Drag, snap and visibility are one gesture.
export const createTrigger = function createTrigger(
	ctx: SurfaceContext,
	options: ConsentTriggerOptions
): Surface {
	const styles = classes.trigger;
	const { noStyle, slot } = ctx;
	const size = options.size ?? 'md';
	const showWhen = options.showWhen ?? 'always';
	const persist = options.persistPosition ?? true;
	let corner: CornerPosition =
		(persist ? getPersistedPosition() : null) ??
		options.position ??
		'bottom-right';

	let dragging = false;
	let dragged = false;
	let visible = false;
	let startX = 0;
	let startY = 0;
	let startedAt = 0;
	let snapTimer: ReturnType<typeof setTimeout> | undefined;
	// The arm the slots were applied for.
	let renderedExperiment = ctx.client.getSnapshot().experiment;
	// The element holding the pointer, for release on drop.
	let captured: Element | null = null;

	// DevTools launcher: claimed while visible, rendered while owned.
	const { kernel } = ctx.client;
	const claim = {};
	let releaseClaim: (() => void) | null = null;
	let launcher: DevToolsLauncherTarget | null = null;
	let toolbar: TriggerToolbar | null = null;
	let stopDocking: (() => void) | null = null;

	const createIcon = function createIcon(): HTMLSpanElement {
		return slot(
			h(
				'span',
				{ 'aria-hidden': 'true', class: noStyle ? '' : styles.icon },
				svg('0 0 140 97', CONSENT_MARK)
			),
			'consentDialogTriggerIcon'
		);
	};
	let icon = createIcon();

	const element = h(
		'button',
		{
			'aria-label': options.ariaLabel ?? 'Open privacy settings',
			'data-c15t-trigger': 'true',
			// Stops the hover and snap transitions, as on the other surfaces.
			'data-disable-animation': ctx.disableAnimation,
			'data-size': size,
			'data-testid': 'consent-dialog-trigger',
			hidden: true,
			type: 'button',
		},
		icon
	);

	const applyClasses = function applyClasses(snapping = false): void {
		element.setAttribute('data-position', corner);
		if (toolbar) {
			toolbar.element.setAttribute('data-position', corner);
			if (!noStyle) {
				toolbar.element.setAttribute(
					'class',
					cx(
						styles.toolbar,
						styles[POSITION_CLASS[corner]],
						dragging && styles.dragging,
						snapping && styles.snapping
					)
				);
			}
		}
		if (!noStyle) {
			element.setAttribute(
				'class',
				cx(
					styles.trigger,
					styles[size],
					styles[POSITION_CLASS[corner]],
					dragging && styles.dragging,
					snapping && styles.snapping,
					!visible && styles.hidden
				)
			);
		}
		// Rewriting the state classes drops the slot's; put them back.
		slot(element, 'consentDialogTrigger');
	};

	/**
	 * Drop the previous arm's slot classes, inline styles and `noStyle`
	 * result, then apply the current arm's. The banner and dialogs rebuild
	 * for a new arm; the button stays, so a drag in progress keeps going.
	 */
	const reapplySlots = function reapplySlots(): void {
		const next = createIcon();
		icon.replaceWith(next);
		icon = next;
		const { transform, transition } = element.style;
		element.removeAttribute('style');
		element.style.transform = transform;
		element.style.transition = transition;
		// `applyClasses` rewrites the class unless `noStyle` is set.
		element.removeAttribute('class');
		applyClasses(snapTimer !== undefined);
	};

	/** The element on screen: the toolbar while it hosts DevTools. */
	const current = function current(): HTMLElement {
		return toolbar?.element ?? element;
	};

	/** Keep a docked panel beside the toolbar; paused mid-drag. */
	const dock = function dock(): void {
		stopDocking?.();
		stopDocking = null;
		if (launcher && toolbar && !dragging) {
			stopDocking = followDevToolsDock(toolbar.element, corner, launcher.dock);
		}
	};

	const moveTo = function moveTo(next: CornerPosition): void {
		corner = next;
		if (persist) {
			persistPosition(next);
		}
		toolbar?.setCorner(next);
		applyClasses(true);
		if (snapTimer !== undefined) {
			clearTimeout(snapTimer);
		}
		snapTimer = setTimeout(() => {
			snapTimer = undefined;
			applyClasses(false);
		}, SNAP_MS);
	};

	const onPointerDown = function onPointerDown(event: PointerEvent): void {
		if (event.button !== 0) {
			return;
		}
		// Capture on the item pressed, so the click still lands on it.
		captured =
			(event.target instanceof Element && event.target.closest('button')) ||
			current();
		captured.setPointerCapture(event.pointerId);
		dragging = true;
		dragged = false;
		startX = event.clientX;
		startY = event.clientY;
		startedAt = Date.now();
		applyClasses();
		dock();
	};
	const onPointerMove = function onPointerMove(event: PointerEvent): void {
		if (!dragging) {
			return;
		}
		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) {
			dragged = true;
		}
		const root = current();
		root.style.transform = `translate(${dx}px, ${dy}px)`;
		root.style.transition = 'none';
	};
	const endDrag = function endDrag(event: PointerEvent, cancelled: boolean) {
		if (captured?.hasPointerCapture(event.pointerId)) {
			captured.releasePointerCapture(event.pointerId);
		}
		captured = null;
		if (!dragging) {
			return;
		}
		dragging = false;
		const root = current();
		root.style.transform = '';
		root.style.transition = '';
		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		const elapsed = Math.max(Date.now() - startedAt, 1);
		const next =
			cancelled || !dragged
				? corner
				: calculateCornerFromDrag(corner, dx, dy, {
						velocityX: dx / elapsed,
						velocityY: dy / elapsed,
					});
		if (next === corner) {
			applyClasses();
		} else {
			moveTo(next);
		}
		dock();
	};
	const listen = function listen(target: HTMLElement): void {
		target.addEventListener('pointerdown', onPointerDown);
		target.addEventListener('pointermove', onPointerMove);
		target.addEventListener('pointerup', (event) => {
			endDrag(event, false);
		});
		target.addEventListener('pointercancel', (event) => {
			endDrag(event, true);
		});
	};
	listen(element);

	/** Whether a click is a request, not the end of a drag. */
	const shouldActivate = function shouldActivate(): boolean {
		if (dragged) {
			dragged = false;
			return false;
		}
		return true;
	};
	element.addEventListener('click', () => {
		// A drag that ended on the button is not a request to open.
		if (shouldActivate()) {
			ctx.client.openDialog();
		}
	});
	element.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			ctx.client.openDialog();
		}
	});

	const createToolbar = function createToolbar(): TriggerToolbar {
		const created = createTriggerToolbar({
			ariaLabel: options.ariaLabel ?? 'Open privacy settings',
			icon: svg('0 0 140 97', CONSENT_MARK),
			noStyle,
			onDevTools: () => launcher?.toggle(),
			onPreferences: () => ctx.client.openDialog(),
			shouldActivate,
			size,
		});
		if (ctx.disableAnimation) {
			created.element.setAttribute('data-disable-animation', '');
		}
		created.setCorner(corner);
		listen(created.element);
		return created;
	};

	/**
	 * Show the toolbar while this trigger owns a mounted panel's launcher,
	 * the plain button otherwise.
	 */
	const renderLauncher = function renderLauncher(): void {
		const slotState = getDevToolsLauncherSnapshot(kernel);
		const next = slotState.owner === claim ? slotState.instance : null;
		if (next !== launcher) {
			launcher = next;
			// Swapping elements mid-drag would strand the drag state.
			dragging = false;
			current().style.transform = '';
			current().style.transition = '';
			if (next && !toolbar) {
				toolbar = createToolbar();
				element.replaceWith(toolbar.element);
			} else if (!next && toolbar) {
				toolbar.element.replaceWith(element);
				toolbar = null;
			}
			applyClasses(snapTimer !== undefined);
			dock();
		}
		toolbar?.setOpen(slotState.isOpen);
	};
	const unsubscribeLauncher = subscribeDevToolsLauncher(kernel, renderLauncher);

	/** Claim the launcher while visible; hidden, DevTools shows its own. */
	const claimWhileVisible = function claimWhileVisible(): void {
		if (visible && !releaseClaim) {
			releaseClaim = claimDevToolsLauncher(kernel, claim);
		} else if (!visible && releaseClaim) {
			const release = releaseClaim;
			releaseClaim = null;
			stopDocking?.();
			stopDocking = null;
			release();
		}
		renderLauncher();
	};

	applyClasses();
	ctx.root.append(element);

	return {
		destroy() {
			if (snapTimer !== undefined) {
				clearTimeout(snapTimer);
			}
			unsubscribeLauncher();
			stopDocking?.();
			releaseClaim?.();
			releaseClaim = null;
			toolbar?.element.remove();
			element.remove();
		},
		sync(snapshot: ConsentSnapshot) {
			const allowed = showWhen === 'always' || hasDecided(snapshot);
			visible = allowed && snapshot.activeUI === 'none';
			element.hidden = !visible;
			claimWhileVisible();
			if (renderedExperiment === snapshot.experiment) {
				applyClasses(snapTimer !== undefined);
				return;
			}
			renderedExperiment = snapshot.experiment;
			reapplySlots();
		},
	};
};
