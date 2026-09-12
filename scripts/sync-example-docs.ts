import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { exampleDocSources, renderExampleSource } from './example-doc-sources';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
for (const entry of exampleDocSources) {
	const destination = resolve(root, entry.destination);
	const content = renderExampleSource(root, entry);
	if (check) {
		if (readFileSync(destination, 'utf8') !== content) {
			throw new Error(
				`Example snippet is stale: ${entry.destination}. Run bun scripts/sync-example-docs.ts.`
			);
		}
	} else {
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, content);
	}
}
