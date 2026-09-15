import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { exampleDocSources, renderExampleSource } from './example-doc-sources';

const root = fileURLToPath(new URL('..', import.meta.url));
test.each(exampleDocSources)(
	'$destination matches the runnable example',
	(entry) => {
		expect(readFileSync(resolve(root, entry.destination), 'utf8')).toBe(
			renderExampleSource(root, entry)
		);
	}
);
