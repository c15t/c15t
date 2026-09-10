import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { lintDocs } from 'leadtype/lint';
import { expect, test } from 'vitest';

const docsRoot = fileURLToPath(new URL('../docs', import.meta.url));

test('documentation links, includes and metadata are valid', async () => {
	const result = await lintDocs({ srcDir: docsRoot });
	const errors = result.violations.filter((violation) => {
		if (violation.severity !== 'error') {
			return false;
		}
		// leadtype 0.2.1 mistakes frameworks/index.mdx for an adapter named
		// "index.mdx". The framework picker must link across adapters, but its
		// destinations still have to exist. Keep every other lint error.
		if (
			violation.file === 'frameworks/index.mdx' &&
			violation.rule === 'cross-framework-link'
		) {
			const target = violation.message.match(
				/`\/docs\/(?<route>frameworks\/[a-z-]+\/quickstart)`/u
			)?.groups?.route;
			if (target && existsSync(resolve(docsRoot, `${target}.mdx`))) {
				return false;
			}
		}
		return true;
	});
	expect(errors).toEqual([]);
});
