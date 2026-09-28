/**
 * Writes the built `@c15t/ui` stylesheets into `dist/c15t.css`.
 *
 * Bundler users who mount the UI into the light DOM (`shadow: false`)
 * import `@c15t/browser/styles.css`; it is the same sheet the script-tag
 * build inlines: `@c15t/ui/styles.css` plus the dialog rules, since this
 * package renders the dialog eagerly. Runs after `rslib build`, which cleans
 * `dist/` first.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { adapterStyles } from '../src/iab/styles';

const readUiCss = (specifier: string) =>
	readFile(fileURLToPath(import.meta.resolve(specifier)), 'utf8');
const dist = resolve(import.meta.dirname, '../dist');

await mkdir(dist, { recursive: true });
await writeFile(
	join(dist, 'c15t.css'),
	[
		await readUiCss('@c15t/ui/styles.css'),
		await readUiCss('@c15t/ui/styles/dialog.css'),
	].join('\n')
);
await writeFile(
	join(dist, 'c15t.iab.css'),
	(await readUiCss('@c15t/ui/iab/styles.css')) + adapterStyles
);
