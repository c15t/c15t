/**
 * Vue bindings for the DevTools launcher slot in `@c15t/ui`, which lets a
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
import type { DevToolsLauncherTarget } from '@c15t/ui/utils/devtools-launcher';
import {
	computed,
	getCurrentScope,
	onScopeDispose,
	shallowRef,
	watch,
} from 'vue';
import type { ComputedRef, Ref } from 'vue';

/** Reactive view of the DevTools launcher for one trigger. */
export interface UseDevToolsLauncherReturn {
	/** Whether a `<ConsentDevTools>` is mounted for the kernel. */
	available: ComputedRef<boolean>;
	/** The DevTools instance while this trigger owns the launcher. */
	instance: ComputedRef<DevToolsLauncherTarget | null>;
	/** Whether the DevTools panel is open. */
	isOpen: ComputedRef<boolean>;
}

/**
 * Track the kernel's DevTools launcher and claim it while `visible` is true
 * and DevTools is mounted.
 *
 * Only one trigger owns the launcher at a time; `instance` stays `null` for
 * the others. Hiding or unmounting the trigger releases the claim, and the
 * last release brings the floating launcher back.
 *
 * SSR-safe: on the server nothing subscribes and nothing is claimed.
 *
 * @param kernel - Consent kernel shared with `<ConsentDevTools>`.
 * @param visible - Whether the trigger is on screen.
 * @returns The launcher state for this trigger.
 * @internal
 */
export const useDevToolsLauncher = function useDevToolsLauncher(
	kernel: ConsentKernel,
	visible: Ref<boolean>
): UseDevToolsLauncherReturn {
	const isBrowser = typeof window !== 'undefined';
	const snapshot = shallowRef(
		isBrowser
			? getDevToolsLauncherSnapshot(kernel)
			: EMPTY_DEVTOOLS_LAUNCHER_SNAPSHOT
	);
	const claim = Symbol('c15t:devtools-launcher-claim');
	const available = computed(() => snapshot.value.instance !== null);

	if (isBrowser) {
		const unsubscribe = subscribeDevToolsLauncher(kernel, () => {
			snapshot.value = getDevToolsLauncherSnapshot(kernel);
		});
		const stopClaiming = watch(
			() => visible.value && available.value,
			(claiming, _previous, onCleanup) => {
				if (claiming) {
					onCleanup(claimDevToolsLauncher(kernel, claim));
				}
			},
			{ immediate: true }
		);
		if (getCurrentScope()) {
			onScopeDispose(() => {
				stopClaiming();
				unsubscribe();
			});
		}
	}

	return {
		available,
		instance: computed(() =>
			snapshot.value.owner === claim ? snapshot.value.instance : null
		),
		isOpen: computed(() => snapshot.value.isOpen),
	};
};
