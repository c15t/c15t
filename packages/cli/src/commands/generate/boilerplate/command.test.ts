import {
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
	mkdir,
	symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runCli } from '../../../index';
import { boilerplateFrameworks } from './index';

const directories: string[] = [];
const fixture = async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-boilerplate-'));
	directories.push(root);
	await writeFile(
		join(root, 'package.json'),
		'{"name":"fixture","private":true}'
	);
	return root;
};
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((root) => rm(root, { force: true, recursive: true }))
	);
});

describe('boilerplate command', () => {
	it.each(boilerplateFrameworks)(
		'previews %s without writing files or package.json',
		async (framework) => {
			const cwd = await fixture();
			const result = await runCli(
				['generate', 'offline', '--framework', framework, '--plan', '--json'],
				{ cwd }
			);
			expect(result, JSON.stringify(result)).toMatchObject({
				data: { applied: false, framework, installSkipped: true },
				success: true,
			});
			expect(await readdir(cwd)).toEqual(['package.json']);
		}
	);
	it('applies boilerplate, preserves the manifest, supports a repeat, and refuses customized output', async () => {
		const cwd = await fixture();
		const args = [
			'generate',
			'offline',
			'--framework',
			'react',
			'--output',
			'src/privacy',
			'--apply',
			'--json',
		];
		const original = await readFile(join(cwd, 'package.json'), 'utf8');
		expect(await runCli(args, { cwd })).toMatchObject({ success: true });
		const component = join(cwd, 'src/privacy/consent-manager.tsx');
		expect(await readFile(component, 'utf8')).toContain('<ConsentProvider');
		expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe(original);
		expect(await runCli(args, { cwd })).toMatchObject({
			data: { edits: [] },
			success: true,
		});
		await writeFile(component, '// customized');
		expect(await runCli(args, { cwd })).toMatchObject({ success: false });
		expect(await readFile(component, 'utf8')).toBe('// customized');
		expect(await readdir(cwd)).not.toContain('.c15t-generation.json');
	});
	it.each([
		['offline', '--framework', 'unknown'],
		['hosted', '--framework', 'react'],
		['offline', '--framework', 'react', '--plan', '--apply'],
		['offline', '--framework', 'react', '--ssr'],
		['offline', '--framework', 'react', '--output', '../outside'],
		['offline', '--framework', 'react', '--scripts', '__proto__'],
	])('rejects invalid input %j before writing', async (args) => {
		const cwd = await fixture();
		expect(
			await runCli(['generate', ...args, '--json'], { cwd })
		).toMatchObject({ success: false });
		expect(await readdir(cwd)).toEqual(['package.json']);
	});
	it('rejects an output symlink before writing outside the project', async () => {
		const cwd = await fixture();
		const outside = await fixture();
		await mkdir(join(cwd, 'src'));
		await symlink(outside, join(cwd, 'src/consent'));
		expect(
			await runCli(
				['generate', 'offline', '--framework', 'react', '--apply', '--json'],
				{ cwd }
			)
		).toMatchObject({ success: false });
		expect(await readdir(outside)).toEqual(['package.json']);
	});
	it('detects Vue for explicit boilerplate and returns escaped hosted configuration', async () => {
		const cwd = await fixture();
		await writeFile(
			join(cwd, 'package.json'),
			'{"dependencies":{"vue":"3.5.0"}}'
		);
		const result = await runCli(
			[
				'setup',
				'hosted',
				'--boilerplate',
				'--backend-url',
				"https://example.com/a'b",
				'--plan',
				'--json',
			],
			{ cwd }
		);
		expect(result, JSON.stringify(result)).toMatchObject({
			data: { framework: 'vue' },
			success: true,
		});
	});
});
