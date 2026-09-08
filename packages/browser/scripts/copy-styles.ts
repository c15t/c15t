/**
 * Copies the built `@c15t/ui` stylesheet into `dist/c15t.css`.
 *
 * Bundler users who mount the UI into the light DOM (`shadow: false`)
 * import `@c15t/browser/styles.css`; it is the same sheet the script-tag
 * build inlines. Runs after `rslib build`, which cleans `dist/` first.
 */

import { copyFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(import.meta.resolve('@c15t/ui/styles.css'));
const dist = resolve(import.meta.dirname, '../dist');

await mkdir(dist, { recursive: true });
await copyFile(source, join(dist, 'c15t.css'));
