/**
 * Framework-agnostic slot that lets a mounted DevTools panel hand its
 * launcher to the consent trigger, so the page shows one floating control
 * instead of two stacked in the same corner.
 *
 * DevTools publishes its instance under the consent kernel it inspects. A
 * visible trigger claims the slot, renders a DevTools button, and docks the
 * panel beside itself. The first claim wins; the floating launcher returns
 * when the last claim is released or DevTools unmounts.
 *
 * The slot holds only the instance handle, so triggers never import the
 * DevTools engine.
 *
 * @internal
 * @packageDocumentation
 */

import type { ConsentKernel } from '@c15t/core';

import type { CornerPosition } from './trigger-utils';

/**
 * Placement handed to DevTools; mirrors `DevToolsDock` from
 * `@c15t/dev-tools`, restated so trigger bundles never reach into the
 * DevTools package. Offsets are CSS pixels from the viewport edges of
 * `position`'s corner to the panel.
 */
export interface DevToolsDock {
	readonly position: CornerPosition;
	readonly inline: number;
	readonly block: number;
}

/** The part of a `DevToolsInstance` the launcher slot drives. */
export interface DevToolsLauncherTarget {
	getState: () => { readonly isOpen: boolean };
	subscribe: (
		listener: (
			state: { readonly isOpen: boolean },
			previous: { readonly isOpen: boolean }
		) => void
	) => () => void;
	toggle: () => void;
	dock: (dock: DevToolsDock | null) => void;
}

/** Immutable view of one kernel's slot; replaced on every change. */
export interface DevToolsLauncherSnapshot {
	/** Mounted DevTools instance for this kernel. */
	readonly instance: DevToolsLauncherTarget | null;
	/** Whether its panel is open. */
	readonly isOpen: boolean;
	/** Claim that renders the launcher; the first mounted trigger wins. */
	readonly owner: unknown;
}

interface LauncherSlot {
	instance: DevToolsLauncherTarget | null;
	claims: unknown[];
	snapshot: DevToolsLauncherSnapshot;
	listeners: Set<() => void>;
}

/** Snapshot for a kernel with no DevTools and no claims. */
export const EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT: DevToolsLauncherSnapshot = {
	instance: null,
	isOpen: false,
	owner: null,
};

/** Space between a trigger and a docked DevTools panel, in CSS pixels. */
const DEVTOOLS_DOCK_GAP = 8;

const slots = new WeakMap<ConsentKernel, LauncherSlot>();

const getSlot = function getSlot(kernel: ConsentKernel): LauncherSlot {
	let slot = slots.get(kernel);
	if (!slot) {
		slot = {
			claims: [],
			instance: null,
			listeners: new Set(),
			snapshot: EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT,
		};
		slots.set(kernel, slot);
	}
	return slot;
};

const refresh = function refresh(slot: LauncherSlot): void {
	const next: DevToolsLauncherSnapshot = {
		instance: slot.instance,
		isOpen: slot.instance?.getState().isOpen ?? false,
		owner: slot.claims[0] ?? null,
	};
	const current = slot.snapshot;
	if (
		current.instance === next.instance &&
		current.isOpen === next.isOpen &&
		current.owner === next.owner
	) {
		return;
	}
	slot.snapshot = next;
	for (const listener of slot.listeners) {
		listener();
	}
};

/**
 * Offer a DevTools instance's launcher to the kernel's consent trigger.
 * @param kernel - Consent kernel the instance inspects; keys the slot.
 * @param instance - Floating (not embedded) DevTools instance.
 * @returns Withdraws the offer and restores the floating launcher.
 * @internal
 */
export const publishDevToolsLauncher = function publishDevToolsLauncher(
	kernel: ConsentKernel,
	instance: DevToolsLauncherTarget
): () => void {
	const slot = getSlot(kernel);
	slot.instance = instance;
	const unsubscribe = instance.subscribe((state, previous) => {
		if (state.isOpen !== previous.isOpen) {
			refresh(slot);
		}
	});
	refresh(slot);
	return () => {
		unsubscribe();
		if (slot.instance === instance) {
			slot.instance = null;
			refresh(slot);
		}
	};
};

/**
 * Claim the launcher for a trigger. The first live claim owns it.
 * @param kernel - Consent kernel the trigger belongs to.
 * @param claim - Unique token for this trigger.
 * @returns Releases the claim; the last release restores the floating launcher.
 * @internal
 */
export const claimDevToolsLauncher = function claimDevToolsLauncher(
	kernel: ConsentKernel,
	claim: unknown
): () => void {
	const slot = getSlot(kernel);
	slot.claims.push(claim);
	refresh(slot);
	return () => {
		slot.claims = slot.claims.filter((entry) => entry !== claim);
		if (slot.claims.length === 0) {
			slot.instance?.dock(null);
		}
		refresh(slot);
	};
};

/**
 * Current snapshot for a kernel's slot. Stable until the slot changes.
 * @param kernel - Consent kernel.
 * @returns The latest snapshot.
 * @internal
 */
export const getDevToolsLauncherSnapshot = function getDevToolsLauncherSnapshot(
	kernel: ConsentKernel
): DevToolsLauncherSnapshot {
	return getSlot(kernel).snapshot;
};

/**
 * Listen for slot changes: DevTools mounting, opening, or the owner changing.
 * @param kernel - Consent kernel.
 * @param listener - Called after each change; read the snapshot inside it.
 * @returns Unsubscribes the listener.
 * @internal
 */
export const subscribeDevToolsLauncher = function subscribeDevToolsLauncher(
	kernel: ConsentKernel,
	listener: () => void
): () => void {
	const { listeners } = getSlot(kernel);
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/**
 * Where a DevTools panel docked to a trigger sits: the trigger's corner,
 * flush with its outer edge and just past it. Layout offsets ignore drag and
 * snap transforms, so a mid-animation read still lands on the final spot.
 * @param element - Fixed-position trigger element.
 * @param corner - Corner the trigger is snapped to.
 * @returns Dock placement for `DevToolsInstance.dock`.
 * @internal
 */
export const measureDevToolsDock = function measureDevToolsDock(
	element: HTMLElement,
	corner: CornerPosition
): DevToolsDock {
	const { clientWidth, clientHeight } = element.ownerDocument.documentElement;
	const left = element.offsetLeft;
	const top = element.offsetTop;
	return {
		block: corner.startsWith('top')
			? top + element.offsetHeight + DEVTOOLS_DOCK_GAP
			: clientHeight - top + DEVTOOLS_DOCK_GAP,
		inline: corner.endsWith('left')
			? left
			: clientWidth - left - element.offsetWidth,
		position: corner,
	};
};

/**
 * Dock DevTools to a trigger now, and again whenever the trigger resizes or
 * the window does. Call again with the new corner after a drag snaps.
 * @param element - Fixed-position trigger element.
 * @param corner - Corner the trigger is snapped to.
 * @param dock - The owning claim's `instance.dock`.
 * @returns Stops following; does not undock.
 * @internal
 */
export const followDevToolsDock = function followDevToolsDock(
	element: HTMLElement,
	corner: CornerPosition,
	dock: (placement: DevToolsDock) => void
): () => void {
	const place = () => dock(measureDevToolsDock(element, corner));
	place();
	const view = element.ownerDocument.defaultView;
	const observer =
		typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
	observer?.observe(element);
	view?.addEventListener('resize', place);
	return () => {
		observer?.disconnect();
		view?.removeEventListener('resize', place);
	};
};
