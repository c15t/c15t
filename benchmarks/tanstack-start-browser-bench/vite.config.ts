import { fileURLToPath } from 'node:url';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * `C15T_BENCH_ROOT_PROVIDER=1` selects the root-mounted provider variant at
 * build time (`bun run build:root`, output `dist-root/`). Two things switch
 * on it:
 *
 * - `#bench-root-shell` resolves to `src/bench/root-shell-provider.tsx`
 *   instead of `src/bench/root-shell.tsx`, so `__root.tsx` mounts the
 *   provider and runs the manifest prefetch loader. An alias rather than a
 *   folded branch because even a tree-shaken static import from the root
 *   changes Rolldown's chunk assignment (the provider chunk stops sharing a
 *   chunk with `page-shell`), which would alter the default build.
 * - `import.meta.env.C15T_BENCH_ROOT_PROVIDER`, inlined through
 *   `envPrefix`, folds the per-route provider out of `/manifest-ssr`.
 */
const rootProvider = process.env.C15T_BENCH_ROOT_PROVIDER === '1';

export default defineConfig({
	envPrefix: ['VITE_', 'C15T_'],
	plugins: [tanstackStart(), viteReact()],
	resolve: {
		alias: {
			'#bench-root-shell': fileURLToPath(
				new URL(
					rootProvider
						? './src/bench/root-shell-provider.tsx'
						: './src/bench/root-shell.tsx',
					import.meta.url
				)
			),
		},
	},
});
