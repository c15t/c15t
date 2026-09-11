import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
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

it.each(['directory', 'file'] as const)(
	'rejects a recovery path through a %s symlink before restoring any files',
	async (kind) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
		const outside = await mkdtemp(join(tmpdir(), 'c15t-journal-outside-'));
		directories.push(root, outside);
		const external = join(outside, 'target.ts');
		const internal = join(root, 'App.tsx');
		await writeFile(external, 'after');
		await writeFile(internal, 'after');
		const link = join(root, 'link');
		await symlink(kind === 'directory' ? outside : external, link);
		const target = kind === 'directory' ? join(link, 'target.ts') : link;
		await saveGenerationJournal(root, [
			{ after: 'after', before: 'external overwrite', path: target },
			{ after: 'after', before: 'before', path: internal },
		]);
		await expect(recoverGeneration(root, true)).rejects.toMatchObject({
			code: 'CONFIG_INVALID',
		});
		expect(await readFile(external, 'utf8')).toBe('after');
		expect(await readFile(internal, 'utf8')).toBe('after');
		expect(
			await readFile(join(root, '.c15t-generation.json'), 'utf8')
		).toContain('external overwrite');
	}
);

it('recovers when a planned file and its parent directories were never created', async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
	directories.push(root);
	const existing = join(root, 'App.tsx');
	await writeFile(existing, 'after');
	await saveGenerationJournal(root, [
		{ after: 'after', before: 'before', path: existing },
		{ after: 'provider', before: null, path: join(root, 'src/consent/new.ts') },
	]);
	expect(await recoverGeneration(root, true)).toBe(true);
	expect(await readFile(existing, 'utf8')).toBe('before');
	expect(await recoverGeneration(root, true)).toBe(false);
});
