import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The umbrella facade must publish with exact pins on its scoped packages:
 * its committed exports map and shims are generated from specific scoped
 * manifests, so a range would let installs drift onto scoped versions the
 * umbrella was not generated against. `workspace:*` is what resolves to an
 * exact pin when Bun packs the tarball. tegami.test.ts checks the packed manifest.
 */
describe('c15t umbrella dependencies', () => {
	const manifest = JSON.parse(
		readFileSync(join(REPO_ROOT, 'packages', 'c15t', 'package.json'), 'utf8')
	) as { dependencies?: Record<string, string>; peerDependencies?: unknown };

	it.each([
		'@c15t/core',
		'@c15t/react',
		'@c15t/nextjs',
		'@c15t/vue',
		'@c15t/ui',
	])(
		'depends on %s via workspace:* so publish pins the exact version',
		(dependency) => {
			expect(manifest.dependencies?.[dependency]).toBe('workspace:*');
		}
	);

	it('declares no peer dependencies of its own', () => {
		expect(manifest.peerDependencies).toBeUndefined();
	});
});
