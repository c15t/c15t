import type { KernelOverrides } from '@c15t/core';

import type { VueConsentKernelContext } from './kernel';

/** The `ConsentRoot` props that map onto kernel overrides. */
export type RootOverrideProps = Pick<
	KernelOverrides,
	'country' | 'language' | 'region'
>;

const ROOT_OVERRIDE_KEYS = ['country', 'language', 'region'] as const;

/**
 * Apply `ConsentRoot`'s `country`, `language` and `region` props to the
 * runtime's overrides, and ask for the policy again only when that changes
 * what the kernel would ask for.
 *
 * A prop equal to the current override, such as a language the server
 * prefetched, changes nothing. A changed prop is stored straight away; the
 * browser asks for it once the runtime runs, and a runtime that has not
 * started yet asks in its first init instead of adopting a prefetch made
 * for other inputs. A prop removed since the last call clears its override.
 *
 * @param context - The app's consent context.
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
	if (changed) {
		context.setOverrides(changes);
	}
};
