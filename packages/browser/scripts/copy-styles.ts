/**
 * Writes the stylesheets the script-tag build inlines into `dist/c15t.css`
 * and `dist/c15t.iab.css`.
 *
 * Bundler users who mount the UI into the light DOM (`shadow: false`)
 * import `@c15t/browser/styles.css`; it is the same sheet the script-tag
 * build inlines: `@c15t/ui/styles.css` plus the dialog rules, since this
 * package renders the dialog eagerly, pruned to the rules these surfaces can
 * match. Runs after `rslib build`, which cleans `dist/` first.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { stylesheet as iabStylesheet } from '../src/generated/iab-styles';
import { stylesheet } from '../src/generated/styles';
import { adapterStyles } from '../src/iab/styles';

const dist = resolve(import.meta.dirname, '../dist');

await mkdir(dist, { recursive: true });
await writeFile(join(dist, 'c15t.css'), stylesheet);
await writeFile(join(dist, 'c15t.iab.css'), iabStylesheet + adapterStyles);
