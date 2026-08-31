/**
 * Build step for the `c15t` umbrella package.
 *
 * An exports target cannot point into another package, so the umbrella's CSS
 * subpaths (`c15t/react/styles.css`, `c15t/next/v3/iab/styles.css`, …) must
 * be real files. This copies them from the scoped packages' built `dist/`
 * into `packages/c15t/dist/`, mirroring the copy list the generator derives
 * from the scoped exports maps — so the copied set always matches the
 * committed exports map (the drift test in
 * scripts/generate-umbrella-exports.test.ts keeps both in sync).
 *
 * The scoped packages must be built first; Turborepo's `^build` dependency
 * guarantees that ordering, so a missing source here means the build graph
 * was bypassed.
 *
 * The copied stylesheets are thin proxies that `@import "@c15t/ui/…"` — the
 * scoped packages resolve those through their own `@c15t/ui` dependency, so
 * the umbrella declares `@c15t/ui` too; strict CSS resolvers (e.g.
 * Tailwind's enhanced-resolve) resolve bare imports from the importing
 * file's package and accept no hoisting fallback.
 */

import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
	createSourcePackages,
	deriveUmbrellaArtifacts,
} from '../../../scripts/generate-umbrella-exports';

const packageRoot = join(import.meta.dirname, '..');
const packagesRoot = join(packageRoot, '..');

const { cssCopies } = deriveUmbrellaArtifacts(
	createSourcePackages(packagesRoot)
);

for (const { target, sourceDirectory, sourcePath } of cssCopies) {
	const source = join(packagesRoot, sourceDirectory, sourcePath);
	if (!existsSync(source)) {
		throw new Error(
			`Missing CSS asset ${source}. Build packages/${sourceDirectory} first (turbo runs it via ^build).`
		);
	}

	const targetPath = join(packageRoot, target);
	mkdirSync(dirname(targetPath), { recursive: true });
	copyFileSync(source, targetPath);
}

console.log(
	`Copied ${cssCopies.length} CSS entrypoints from scoped package dist/ into packages/c15t/dist/.`
);
