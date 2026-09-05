import { Outlet } from '@tanstack/react-router';

import { BenchDocument } from './document';

/**
 * Default root: no consent code. Each scenario route mounts its own
 * provider, the way each Next arm has its own `layout.tsx`, so the root
 * stays free of consent code and the `baseline` arm measures the page
 * floor. `vite.config.ts` aliases `#bench-root-shell` here unless
 * `C15T_BENCH_ROOT_PROVIDER=1` selects `root-shell-provider.tsx`.
 */
export const rootConsentRouteOptions = {};

export const RootComponent = () => (
	<BenchDocument>
		<Outlet />
	</BenchDocument>
);
