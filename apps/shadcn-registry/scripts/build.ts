/**
 * Writes the registry to `dist/r`, one folder per shadcn style. Deploy by
 * copying `dist/r` to c15t.com so it's served at https://c15t.com/r.
 *
 * Set REGISTRY_BASE_URL to serve it from somewhere else, such as a local
 * server in `scripts/fixtures.ts`.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildRegistry } from '../src/build-registry';

const appDir = path.resolve(import.meta.dirname, '..');
const outDir = path.join(appDir, 'dist/r');
const baseUrl = process.env.REGISTRY_BASE_URL ?? 'https://c15t.com/r';

const output = buildRegistry({ appDir, baseUrl });

rmSync(outDir, { force: true, recursive: true });
for (const [file, json] of output) {
	const target = path.join(outDir, file);
	mkdirSync(path.dirname(target), { recursive: true });
	writeFileSync(target, `${JSON.stringify(json, null, 2)}\n`);
}

console.log(
	`Wrote ${output.size} files to ${path.relative(process.cwd(), outDir)} for ${baseUrl}`
);
