/**
 * Replaces this fixture's workspace links with the packed `c15t` closure.
 *
 * The fixture depends on `c15t` through the workspace so Turbo builds the
 * packages first, but it must not read them through those links: a link
 * resolves into `packages/<name>`, where source files and unpublished
 * helpers sit next to `dist`. The next-compat pack step runs `bun pm pack`
 * on every workspace package in the closure and extracts the tarballs under
 * `node_modules`, so the tests can only import what `files` and `exports`
 * publish. `bun install` restores the links; the next run replaces them.
 *
 * The devDependency on `@c15t/next-compat-shared` exists for the workspace
 * graph: a change to the pack step selects this fixture in CI.
 */

import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { installPackedPackages } from '../../next-compat/shared/scripts/pack';

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const closure = installPackedPackages({
	roots: ['c15t'],
	targetDir: fixtureDir,
});

console.log(
	`[consent-observers] installed ${closure.length} packed packages into ${relative(
		resolve(fixtureDir, '../..'),
		resolve(fixtureDir, 'node_modules')
	)}`
);
