/**
 * The stub covers the whole module graph, not just what a measurement reads.
 *
 * `useConsentSafeArea` imports `StatusBar` at module scope and no benchmark reads
 * it, so the stub left it out, and `bun run bench:mobile` died before its first
 * measurement with "the requested module 'react-native' does not provide an export
 * named 'StatusBar'": the alias points at this file, so a name the package imports
 * has to exist here. Vitest cannot police that. It links the same graph through
 * `vitest.config.ts` and reports nothing, which is why 47 tests stayed green while
 * the bench was dead. This spawns the runner the scripts actually use.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PACKAGE_DIR = resolve(import.meta.dirname, '..', '..');

/** Whether Bun is on `PATH`, which is what makes this assertion meaningful. */
const hasBun = function hasBun(): boolean {
	return spawnSync('bun', ['--version'], { encoding: 'utf8' }).status === 0;
};

describe('stub graph coverage', () => {
	// Skip rather than fail without Bun. The scripts need it too, so a machine
	// without it cannot run the bench at all.
	it.skipIf(!hasBun())(
		'links the built package through the bench runner',
		() => {
			const child = spawnSync(
				'bun',
				['x', 'tsx', 'src/support/link-check.ts'],
				{
					cwd: PACKAGE_DIR,
					encoding: 'utf8',
					timeout: 120000,
				}
			);

			expect(child.status, (child.stderr ?? '').slice(0, 400)).toBe(0);
			expect(JSON.parse(child.stdout)).toEqual({
				consentClient: 'function',
				safeArea: 'function',
			});
		}
	);
});
