import { createRootRoute } from '@tanstack/react-router';

// Resolved by `vite.config.ts`: `src/bench/root-shell.tsx` by default, or
// `src/bench/root-shell-provider.tsx` when `C15T_BENCH_ROOT_PROVIDER=1`.
import { RootComponent, rootConsentRouteOptions } from '#bench-root-shell';

export const Route = createRootRoute({
	...rootConsentRouteOptions,
	component: RootComponent,
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
			{ title: 'c15t TanStack Start Browser Bench' },
		],
	}),
});
