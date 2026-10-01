import type { KernelOverrides } from '@c15t/core';

import type { VueConsentKernelContext } from './kernel';

/** Contexts whose browser runtime `startVueConsentRuntime` started. */
const startedRuntimes = new WeakSet<VueConsentKernelContext>();

/**
 * Contexts whose overrides changed before their runtime started. The
 * runtime's first init loads them; a prefetched start runs one for them.
 */
const deferredInits = new WeakSet<VueConsentKernelContext>();

/** The `ConsentRoot` props that map onto kernel overrides. */
export type RootOverrideProps = Pick<
	KernelOverrides,
	'country' | 'language' | 'region'
>;

const ROOT_OVERRIDE_KEYS = ['country', 'language', 'region'] as const;

/**
 * Apply `ConsentRoot`'s `country`, `language` and `region` props to the
 * kernel, and run `init` only when that changes what the kernel would ask
 * for.
 *
 * A prop equal to the current override, such as a language the server
 * prefetched, changes nothing. A changed prop is stored straight away; the
 * init for it runs in the browser only, and waits for the runtime's startup
 * init when that has not run yet. A prop removed since the last call clears
 * its override.
 *
 * @param context - The context from `createVueConsentKernelContext`.
 * @param next - The current prop values.
 * @param previous - The prop values of the previous call, if any.
 * @internal
 */
export const applyRootOverrides = function applyRootOverrides(
	context: VueConsentKernelContext,
	next: RootOverrideProps,
	previous?: RootOverrideProps
): void {
	const current = context.kernel.getSnapshot().overrides;
	const changes: RootOverrideProps = {};
	let changed = false;
	for (const key of ROOT_OVERRIDE_KEYS) {
		const value = next[key];
		if (value === undefined && previous?.[key] === undefined) {
			continue;
		}
		if (current[key] !== value) {
			changes[key] = value;
			changed = true;
		}
	}
	if (!changed) {
		return;
	}
	context.kernel.set.overrides(changes);
	if (typeof window === 'undefined') {
		return;
	}
	if (!startedRuntimes.has(context)) {
		deferredInits.add(context);
		return;
	}
	void context.kernel.commands.init();
};

/**
 * Record that a context's browser runtime has started.
 *
 * @param context - The context being started.
 * @returns `true` when a `ConsentRoot` prop changed the overrides before
 * this, so the runtime must load them even when it skips its startup init.
 * @internal
 */
export const markRuntimeStarted = function markRuntimeStarted(
	context: VueConsentKernelContext
): boolean {
	startedRuntimes.add(context);
	return deferredInits.delete(context);
};
