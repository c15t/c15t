'use client';

/**
 * Lets a mounted `<ConsentDevTools>` hand its launcher to the consent
 * trigger, so the page shows one floating control instead of two stacked in
 * the same corner.
 *
 * The slot is keyed by kernel and holds only the instance handle, so the
 * trigger never imports the DevTools engine.
 *
 * @internal
 * @packageDocumentation
 */

import type { ConsentKernel } from '@c15t/core';
import {
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useSyncExternalStore,
} from 'react';

import { KernelContext } from './context';

/**
 * Placement handed to DevTools; mirrors `DevToolsDock` from
 * `@c15t/dev-tools`, restated so the trigger bundle never reaches into the
 * DevTools package.
 */
export interface DevToolsDock {
	readonly position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
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

interface LauncherSnapshot {
	/** Mounted DevTools instance for this kernel. */
	readonly instance: DevToolsLauncherTarget | null;
	/** Whether its panel is open. */
	readonly isOpen: boolean;
	/** Claim that renders the launcher; the first mounted trigger wins. */
	readonly owner: string | null;
}

interface LauncherSlot {
	instance: DevToolsLauncherTarget | null;
	claims: string[];
	snapshot: LauncherSnapshot;
	listeners: Set<() => void>;
}

const EMPTY_SNAPSHOT: LauncherSnapshot = {
	instance: null,
	isOpen: false,
	owner: null,
};

const slots = new WeakMap<ConsentKernel, LauncherSlot>();

const getSlot = (kernel: ConsentKernel): LauncherSlot => {
	let slot = slots.get(kernel);
	if (!slot) {
		slot = {
			claims: [],
			instance: null,
			listeners: new Set(),
			snapshot: EMPTY_SNAPSHOT,
		};
		slots.set(kernel, slot);
	}
	return slot;
};

const refresh = (slot: LauncherSlot): void => {
	const next: LauncherSnapshot = {
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
 * @param kernel - Kernel the instance inspects.
 * @param instance - Floating (not embedded) DevTools instance.
 * @returns Withdraws the offer and restores the floating launcher.
 * @internal
 */
export const publishDevToolsLauncher = (
	kernel: ConsentKernel,
	instance: DevToolsLauncherTarget
): (() => void) => {
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

/** Controls for the DevTools button a consent trigger renders. */
export interface DevToolsLauncherControls {
	/** Whether the DevTools panel is open. */
	isOpen: boolean;
	/** Open or close the panel. */
	toggle: () => void;
	/** Anchor the panel to the trigger, or release it with `null`. */
	dock: (dock: DevToolsDock | null) => void;
}

const subscribeNoop = () => () => undefined;
const getEmptySnapshot = () => EMPTY_SNAPSHOT;

const useLauncherSnapshot = (
	kernel: ConsentKernel | null
): LauncherSnapshot => {
	const subscribe = useCallback(
		(listener: () => void) => {
			if (!kernel) {
				return subscribeNoop();
			}
			const { listeners } = getSlot(kernel);
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		[kernel]
	);
	const getSnapshot = useCallback(
		() => (kernel ? getSlot(kernel).snapshot : EMPTY_SNAPSHOT),
		[kernel]
	);
	return useSyncExternalStore(subscribe, getSnapshot, getEmptySnapshot);
};

/**
 * Whether a `<ConsentDevTools>` is mounted for the nearest provider.
 * @returns `true` while DevTools can hand its launcher to a trigger.
 * @internal
 */
export const useDevToolsLauncherAvailable = (): boolean => {
	const kernel = useContext(KernelContext);
	return useLauncherSnapshot(kernel).instance !== null;
};

/**
 * Claim the DevTools launcher for this trigger.
 *
 * Only one trigger renders the launcher at a time; others get `null` until
 * the owner unmounts. Releasing the claim, or DevTools unmounting, brings
 * the floating launcher back.
 *
 * @returns Launcher controls while this trigger owns the launcher.
 * @internal
 */
export const useDevToolsLauncher = (): DevToolsLauncherControls | null => {
	const kernel = useContext(KernelContext);
	const claim = useId();
	const snapshot = useLauncherSnapshot(kernel);

	useLayoutEffect(() => {
		if (!kernel) {
			return;
		}
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
	}, [kernel, claim]);

	const instance = snapshot.owner === claim ? snapshot.instance : null;
	const { isOpen } = snapshot;
	// `dock` and `toggle` stay stable per instance so placement effects do
	// not re-run on every open and close.
	const dock = useCallback(
		(placement: DevToolsDock | null) => instance?.dock(placement),
		[instance]
	);
	const toggle = useCallback(() => instance?.toggle(), [instance]);
	return useMemo(
		() => (instance ? { dock, isOpen, toggle } : null),
		[instance, dock, isOpen, toggle]
	);
};
