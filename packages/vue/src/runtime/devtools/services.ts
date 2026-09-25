import type { ConsentKernel, ConsentState } from '@c15t/core';

/**
 * Categories DevTools shows: `necessary`, then the policy scope narrowed to
 * the configured categories when any are configured.
 *
 * @param kernel - Kernel whose policy scope is read.
 * @param configured - Categories from props or provider config.
 * @returns The categories to display, in policy order.
 */
export const readDisplayedCategories = (
	kernel: ConsentKernel,
	configured: readonly (keyof ConsentState)[] | undefined
): (keyof ConsentState)[] => [
	'necessary',
	...kernel
		.getSnapshot()
		.policyRule.scope.filter(
			(name) => !configured?.length || configured.includes(name)
		),
];
