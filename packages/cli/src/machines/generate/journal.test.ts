import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import { recoverGeneration, saveGenerationJournal } from './journal';

const directories: string[] = [];
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

it('recovers a partially applied plan before another setup can run', async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
	directories.push(root);
	const existing = join(root, 'App.tsx');
	const created = join(root, 'provider.tsx');
	await writeFile(existing, 'before');
	await saveGenerationJournal(root, [
		{ after: 'after', before: 'before', path: existing },
		{ after: 'provider', before: null, path: created },
	]);
	await writeFile(existing, 'after');
	await expect(recoverGeneration(root, false)).rejects.toMatchObject({
		code: 'CONFIG_INVALID',
	});
	expect(await recoverGeneration(root, true)).toBe(true);
	expect(await readFile(existing, 'utf8')).toBe('before');
	expect(await recoverGeneration(root, true)).toBe(false);
});
