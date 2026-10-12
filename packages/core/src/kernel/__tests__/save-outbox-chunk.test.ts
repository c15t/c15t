/**
 * The stored queue loads on demand. A value import of a module the first
 * load also has makes bundlers that split shared code (Rolldown in Nuxt)
 * move that module into a first-load file of its own: importing the
 * validators, subject ids, rejection checks and supersession here cost
 * every Nuxt page three extra first-load requests. Those arrive through
 * `queue-tools.ts` instead.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

const valueImports = function valueImports(file: string): string[] {
	return [
		...readFileSync(file, 'utf8').matchAll(
			/^(?:import|export)\s+(?!type\b)[^;]*?from\s+'(?<from>[^']+)'|import\(\s*'(?<dynamic>[^']+)'\s*\)/gmu
		),
	].map((match) => match.groups?.from ?? match.groups?.dynamic ?? '');
};

test('the stored queue imports values only from modules first load does not have', () => {
	// `libs/experiment-record` is read by the queue alone.
	expect(valueImports(join(here, '../save-outbox/queue.ts'))).toEqual([
		'../../libs/experiment-record',
	]);
	expect(valueImports(join(here, '../../libs/experiment-record.ts'))).toEqual(
		[]
	);
});
