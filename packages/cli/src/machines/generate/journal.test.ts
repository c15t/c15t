import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	realpath,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it } from 'vitest';

import { applyFileEdits } from '../../commands/generate/templates/shared/file-plan';
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
		// A recovery file may have been written by an older CLI or edited by hand.
		await writeFile(
			join(root, '.c15t-generation.json'),
			JSON.stringify({
				edits: [
					{ after: 'after', before: 'external overwrite', path: target },
					{ after: 'after', before: 'before', path: internal },
				],
				version: 1,
			})
		);
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

it.each(['directory', 'file'] as const)(
	'recovers generation through an internal %s symlink without replacing the link',
	async (kind) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
		directories.push(root);
		await mkdir(join(root, 'shared'));
		const target = join(root, 'shared/App.tsx');
		await writeFile(target, 'before');
		const link = join(root, 'linked');
		await symlink(kind === 'directory' ? 'shared' : 'shared/App.tsx', link);
		const file = kind === 'directory' ? join(link, 'App.tsx') : link;
		const edits = [{ after: 'after', before: 'before', path: file }];
		await saveGenerationJournal(root, edits);
		const saved = JSON.parse(
			await readFile(join(root, '.c15t-generation.json'), 'utf8')
		);
		expect(saved.edits[0].path).toBe(await realpath(target));
		// Older CLI journals kept the symlink path rather than its target.
		saved.edits[0].path = file;
		await writeFile(join(root, '.c15t-generation.json'), JSON.stringify(saved));
		await applyFileEdits(edits);
		expect(await readFile(target, 'utf8')).toBe('after');
		expect(await recoverGeneration(root, true)).toBe(true);
		expect(await readFile(target, 'utf8')).toBe('before');
		expect((await lstat(link)).isSymbolicLink()).toBe(true);
		expect(await readdir(root)).not.toContain('.c15t-generation.json');
	}
);

it('removes a newly generated file through an internal link while retaining the link', async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
	directories.push(root);
	await mkdir(join(root, 'shared'));
	const link = join(root, 'linked');
	await symlink('shared', link);
	const edits = [
		{ after: 'new provider', before: null, path: join(link, 'nested/new.ts') },
	];
	await saveGenerationJournal(root, edits);
	await applyFileEdits(edits);
	expect(await readFile(join(root, 'shared/nested/new.ts'), 'utf8')).toBe(
		'new provider'
	);
	expect(await recoverGeneration(root, true)).toBe(true);
	expect(await readdir(join(root, 'shared/nested'))).toEqual([]);
	expect((await lstat(link)).isSymbolicLink()).toBe(true);
});

it.each(['directory', 'file', 'dangling'] as const)(
	'rejects an external %s link before saving a journal or applying edits',
	async (kind) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-journal-'));
		const outside = await mkdtemp(join(tmpdir(), 'c15t-journal-outside-'));
		directories.push(root, outside);
		const external = join(outside, 'target.ts');
		await writeFile(external, 'before');
		const link = join(root, 'linked');
		const targets = {
			dangling: join(outside, 'missing.ts'),
			directory: outside,
			file: external,
		};
		await symlink(targets[kind], link);
		const file = kind === 'directory' ? join(link, 'target.ts') : link;
		const edits = [{ after: 'after', before: 'before', path: file }];
		const apply = async () => {
			await saveGenerationJournal(root, edits);
			await applyFileEdits(edits);
		};
		await expect(apply()).rejects.toMatchObject({ code: 'CONFIG_INVALID' });
		expect(await readFile(external, 'utf8')).toBe('before');
		expect(await readdir(outside)).toEqual(['target.ts']);
		expect(await readdir(root)).toEqual(['linked']);
	}
);

it('uses canonical targets when the project root itself is reached through a symlink', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-journal-root-'));
	directories.push(directory);
	const actualRoot = join(directory, 'actual');
	await mkdir(actualRoot);
	const root = join(directory, 'project');
	await symlink(actualRoot, root);
	const target = join(root, 'App.tsx');
	await writeFile(target, 'before');
	await saveGenerationJournal(root, [
		{ after: 'after', before: 'before', path: target },
	]);
	const journal = JSON.parse(
		await readFile(join(root, '.c15t-generation.json'), 'utf8')
	);
	expect(journal.edits[0].path).toBe(await realpath(target));
	await writeFile(target, 'after');
	expect(await recoverGeneration(root, true)).toBe(true);
	expect(await readFile(target, 'utf8')).toBe('before');
});

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
