'use client';

/**
 * React bindings for the DevTools launcher slot in `@c15t/ui`, which lets a
 * mounted `<ConsentDevTools>` hand its launcher to the consent trigger.
 *
 * @internal
 * @packageDocumentation
 */

import type { ConsentKernel } from '@c15t/core';
import {
	claimDevToolsLauncher,
	EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT,
	getDevToolsLauncherSnapshot,
	subscribeDevToolsLauncher,
} from '@c15t/ui/utils/devtools-launcher';
import type {
	DevToolsDock,
	DevToolsLauncherSnapshot,
} from '@c15t/ui/utils/devtools-launcher';
import {
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useSyncExternalStore,
} from 'react';

import { KernelContext } from './context';

export { publishDevToolsLauncher } from '@c15t/ui/utils/devtools-launcher';
export type { DevToolsDock } from '@c15t/ui/utils/devtools-launcher';

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
const getEmptySnapshot = () => EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT;

const useLauncherSnapshot = (
	kernel: ConsentKernel | null
): DevToolsLauncherSnapshot => {
	const subscribe = useCallback(
		(listener: () => void) =>
			kernel ? subscribeDevToolsLauncher(kernel, listener) : subscribeNoop(),
		[kernel]
	);
	const getSnapshot = useCallback(
		() =>
			kernel
				? getDevToolsLauncherSnapshot(kernel)
				: EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT,
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
		return claimDevToolsLauncher(kernel, claim);
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
