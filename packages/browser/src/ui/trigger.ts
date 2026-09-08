import type { ConsentSnapshot } from '@c15t/core';
import {
	calculateCornerFromDrag,
	getPersistedPosition,
	persistPosition,
} from '@c15t/ui/utils';
import type { CornerPosition } from '@c15t/ui/utils';

import { classes } from '../generated/styles';
import type { ConsentTriggerOptions } from '../types';
import { cx, h, svg } from './dom';
import type { Surface, SurfaceContext } from './surface';

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
	const { noStyle } = ctx;
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

	const element = h(
		'button',
		{
			'aria-label': options.ariaLabel ?? 'Open privacy settings',
			'data-c15t-trigger': 'true',
			'data-size': size,
			'data-testid': 'consent-dialog-trigger',
			hidden: true,
			type: 'button',
		},
		h(
			'span',
			{ 'aria-hidden': 'true', class: noStyle ? '' : styles.icon },
			svg('0 0 140 97', CONSENT_MARK)
		)
	);

	const applyClasses = function applyClasses(snapping = false): void {
		element.setAttribute('data-position', corner);
		if (noStyle) {
			return;
		}
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
	};

	const moveTo = function moveTo(next: CornerPosition): void {
		corner = next;
		if (persist) {
			persistPosition(next);
		}
		applyClasses(true);
		if (snapTimer !== undefined) {
			clearTimeout(snapTimer);
		}
		snapTimer = setTimeout(() => {
			snapTimer = undefined;
			applyClasses(false);
		}, SNAP_MS);
	};

	element.addEventListener('pointerdown', (event) => {
		if (event.button !== 0) {
			return;
		}
		element.setPointerCapture(event.pointerId);
		dragging = true;
		dragged = false;
		startX = event.clientX;
		startY = event.clientY;
		startedAt = Date.now();
		applyClasses();
	});
	element.addEventListener('pointermove', (event) => {
		if (!dragging) {
			return;
		}
		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) {
			dragged = true;
		}
		element.style.transform = `translate(${dx}px, ${dy}px)`;
		element.style.transition = 'none';
	});
	const endDrag = function endDrag(event: PointerEvent, cancelled: boolean) {
		if (element.hasPointerCapture(event.pointerId)) {
			element.releasePointerCapture(event.pointerId);
		}
		if (!dragging) {
			return;
		}
		dragging = false;
		element.style.transform = '';
		element.style.transition = '';
		if (cancelled || !dragged) {
			applyClasses();
			return;
		}
		const dx = event.clientX - startX;
		const dy = event.clientY - startY;
		const elapsed = Math.max(Date.now() - startedAt, 1);
		const next = calculateCornerFromDrag(corner, dx, dy, {
			velocityX: dx / elapsed,
			velocityY: dy / elapsed,
		});
		if (next === corner) {
			applyClasses();
			return;
		}
		moveTo(next);
	};
	element.addEventListener('pointerup', (event) => {
		endDrag(event, false);
	});
	element.addEventListener('pointercancel', (event) => {
		endDrag(event, true);
	});
	element.addEventListener('click', () => {
		// A drag that ended on the button is not a request to open.
		if (dragged) {
			dragged = false;
			return;
		}
		ctx.client.openDialog();
	});
	element.addEventListener('keydown', (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			ctx.client.openDialog();
		}
	});

	applyClasses();
	ctx.root.append(element);

	return {
		destroy() {
			if (snapTimer !== undefined) {
				clearTimeout(snapTimer);
			}
			element.remove();
		},
		sync(snapshot: ConsentSnapshot) {
			const allowed = showWhen === 'always' || snapshot.hasConsented;
			visible = allowed && snapshot.activeUI === 'none';
			element.hidden = !visible;
			applyClasses(snapTimer !== undefined);
		},
	};
};
