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
import { saveGenerationJournal } from '../../../machines/generate/journal';
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
const interruptedFixture = async (manifest?: string) => {
	const cwd = await fixture();
	const manifestPath = join(cwd, 'package.json');
	const originalManifest = manifest ?? (await readFile(manifestPath, 'utf8'));
	const interruptedManifest = '{"name":"interrupted","private":true}';
	const componentPath = join(cwd, 'src/privacy/consent-manager.tsx');
	await mkdir(join(cwd, 'src/privacy'), { recursive: true });
	await saveGenerationJournal(cwd, [
		{ after: '// complete component', before: null, path: componentPath },
		{
			after: '# integration instructions',
			before: null,
			path: join(cwd, 'src/privacy/README.md'),
		},
		{
			after: interruptedManifest,
			before: originalManifest,
			path: manifestPath,
		},
	]);
	await writeFile(componentPath, '// complete component');
	await writeFile(manifestPath, interruptedManifest);
	return { componentPath, cwd, manifestPath, originalManifest };
};
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((root) => rm(root, { force: true, recursive: true }))
	);
});

describe('boilerplate command', () => {
	it('detects the framework again from the restored package manifest', async () => {
		const { cwd } = await interruptedFixture(
			'{"dependencies":{"astro":"6","vue":"3"}}'
		);
		const result = await runCli(
			['generate', 'offline', '--boilerplate', '--resume', '--apply', '--json'],
			{ cwd }
		);
		// No server adapter, so the static-output quickstart.
		expect(result, JSON.stringify(result)).toMatchObject({
			data: { applied: true, framework: 'astro-static' },
			success: true,
		});
		expect(
			await readFile(join(cwd, 'src/layouts/base.astro'), 'utf8')
		).toContain('c15t/astro/components');
	});
	it('preserves changed content and the journal when recovery fails', async () => {
		const { componentPath, cwd } = await interruptedFixture();
		const journalPath = join(cwd, '.c15t-generation.json');
		const journal = await readFile(journalPath, 'utf8');
		await writeFile(componentPath, '// user changed this after interruption');
		expect(
			await runCli(
				[
					'generate',
					'offline',
					'--framework',
					'react',
					'--resume',
					'--apply',
					'--json',
				],
				{ cwd }
			)
		).toMatchObject({ success: false });
		expect(await readFile(componentPath, 'utf8')).toBe(
			'// user changed this after interruption'
		);
		expect(await readFile(journalPath, 'utf8')).toBe(journal);
		expect(await readdir(join(cwd, 'src'))).toEqual(['privacy']);
	});
	it.each(['--apply', '--yes'])(
		'resumes an interrupted boilerplate transaction with %s and can repeat',
		async (applyFlag) => {
			const { cwd, manifestPath, originalManifest } =
				await interruptedFixture();
			const args = [
				'generate',
				'offline',
				'--framework',
				'react',
				applyFlag,
				'--json',
			];
			const journalPath = join(cwd, '.c15t-generation.json');
			const journal = await readFile(journalPath, 'utf8');
			expect(await runCli(args, { cwd })).toMatchObject({ success: false });
			expect(await readFile(journalPath, 'utf8')).toBe(journal);
			const result = await runCli([...args, '--resume'], { cwd });
			expect(result, JSON.stringify(result)).toMatchObject({
				data: { applied: true, framework: 'react' },
				success: true,
			});
			// Recovery removed the interrupted files before generating again.
			expect(await readdir(join(cwd, 'src/privacy'))).toEqual([]);
			expect(await readFile(join(cwd, 'src/consent.tsx'), 'utf8')).toContain(
				'<ConsentProvider'
			);
			expect(await readFile(manifestPath, 'utf8')).toBe(originalManifest);
			expect(await readdir(cwd)).not.toContain('.c15t-generation.json');
			expect(await runCli([...args, '--resume'], { cwd })).toMatchObject({
				data: { edits: [] },
				success: true,
			});
		}
	);
	it.each(
		[
			[],
			['--plan'],
			['--dry-run'],
			['--yes', '--plan'],
			['--yes', '--dry-run'],
			['--apply', '--plan'],
			['--apply', '--dry-run'],
		].map((flags) => ({ flags }))
	)(
		'rejects recovery without writable mode for %j before changing interrupted files',
		async ({ flags }) => {
			const { componentPath, cwd, manifestPath } = await interruptedFixture();
			const journalPath = join(cwd, '.c15t-generation.json');
			const paths = [componentPath, manifestPath, journalPath];
			const before = await Promise.all(
				paths.map((file) => readFile(file, 'utf8'))
			);
			expect(
				await runCli(
					[
						'generate',
						'offline',
						'--framework',
						'react',
						'--resume',
						'--json',
						...flags,
					],
					{ cwd }
				)
			).toMatchObject({ error: { code: 'FLAG_INVALID' }, success: false });
			expect(
				await Promise.all(paths.map((file) => readFile(file, 'utf8')))
			).toEqual(before);
		}
	);
	it.each(['svelte', 'vue'])(
		'detects Astro when %s is installed for islands',
		async (renderer) => {
			const cwd = await fixture();
			await writeFile(
				join(cwd, 'package.json'),
				JSON.stringify({ dependencies: { astro: '6', [renderer]: '5' } })
			);
			const result = await runCli(
				['generate', 'offline', '--boilerplate', '--plan', '--json'],
				{ cwd }
			);
			expect(result, JSON.stringify(result)).toMatchObject({
				data: {
					edits: expect.arrayContaining([
						expect.objectContaining({
							path: join(cwd, 'src/layouts/base.astro'),
						}),
					]),
					framework: 'astro-static',
				},
				success: true,
			});
			expect(await readdir(cwd)).toEqual(['package.json']);
		}
	);
	it.each(boilerplateFrameworks)(
		'previews %s without writing files or package.json',
		async (framework) => {
			const cwd = await fixture();
			// The script tag loads c15t.js from a backend, so it is hosted only.
			const mode =
				framework === 'html'
					? ['hosted', '--backend-url', 'https://your-project.inth.app']
					: ['offline'];
			const result = await runCli(
				['generate', ...mode, '--framework', framework, '--plan', '--json'],
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
			'--apply',
			'--json',
		];
		const original = await readFile(join(cwd, 'package.json'), 'utf8');
		expect(await runCli(args, { cwd })).toMatchObject({ success: true });
		const component = join(cwd, 'src/consent.tsx');
		expect(await readFile(component, 'utf8')).toContain('<ConsentProvider');
		expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe(original);
		expect(await runCli(args, { cwd })).toMatchObject({
			data: { edits: [] },
			success: true,
		});
		await writeFile(component, '// customized');
		expect(await runCli(args, { cwd })).toMatchObject({
			error: { message: expect.stringContaining('--overwrite') },
			success: false,
		});
		expect(await readFile(component, 'utf8')).toBe('// customized');
		expect(await readdir(cwd)).not.toContain('.c15t-generation.json');
		expect(await runCli([...args, '--overwrite'], { cwd })).toMatchObject({
			success: true,
		});
		expect(await readFile(component, 'utf8')).toContain('<ConsentProvider');
	});
	it('writes exactly the quickstart files, without a README or .gitignore', async () => {
		const cwd = await fixture();
		const result = await runCli(
			[
				'generate',
				'hosted',
				'--framework',
				'react',
				'--backend-url',
				'https://your-project.inth.app',
				'--apply',
				'--json',
			],
			{ cwd }
		);
		expect(result, JSON.stringify(result)).toMatchObject({ success: true });
		expect((await readdir(cwd)).toSorted()).toEqual([
			'.env',
			'package.json',
			'src',
			'vite.config.ts',
		]);
		expect((await readdir(join(cwd, 'src'))).toSorted()).toEqual([
			'consent.tsx',
			'main.tsx',
		]);
		expect(await readFile(join(cwd, '.env'), 'utf8')).toBe(
			'VITE_C15T_BACKEND_URL=https://your-project.inth.app\n'
		);
	});
	it('adds the backend URL to an existing .env without touching other keys', async () => {
		const cwd = await fixture();
		await writeFile(
			join(cwd, '.env'),
			'# Local settings\nDATABASE_URL=postgres://localhost/app\nNEXT_PUBLIC_C15T_BACKEND_URL=https://old.inth.app'
		);
		const args = [
			'generate',
			'hosted',
			'--framework',
			'next-app',
			'--backend-url',
			'https://your-project.inth.app',
			'--apply',
			'--json',
		];
		expect(await runCli(args, { cwd })).toMatchObject({ success: true });
		expect(await readFile(join(cwd, '.env'), 'utf8')).toBe(
			'# Local settings\nDATABASE_URL=postgres://localhost/app\nNEXT_PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app'
		);
		await writeFile(join(cwd, '.env'), 'SECRET=1\n');
		const result = await runCli([...args, '--overwrite'], { cwd });
		expect(result).toMatchObject({
			data: {
				edits: expect.arrayContaining([
					{ operation: 'update', path: join(cwd, '.env'), redacted: true },
				]),
			},
			success: true,
		});
		// The result describes .env edits without their contents.
		expect(JSON.stringify(result)).not.toContain('SECRET');
		expect(await readFile(join(cwd, '.env'), 'utf8')).toBe(
			'SECRET=1\nNEXT_PUBLIC_C15T_BACKEND_URL=https://your-project.inth.app\n'
		);
		expect(await readdir(cwd)).not.toContain('.gitignore');
	});
	it('lists every existing file it would replace before writing any', async () => {
		const cwd = await fixture();
		await writeFile(join(cwd, 'vite.config.ts'), 'export default {};\n');
		await mkdir(join(cwd, 'src'));
		await writeFile(join(cwd, 'src/main.tsx'), '// app entry\n');
		const result = await runCli(
			['generate', 'offline', '--framework', 'react', '--apply', '--json'],
			{ cwd }
		);
		expect(result).toMatchObject({
			error: {
				message: expect.stringMatching(
					/src\/main\.tsx, vite\.config\.ts[\s\S]*--overwrite/u
				),
			},
			success: false,
		});
		expect((await readdir(join(cwd, 'src'))).toSorted()).toEqual(['main.tsx']);
	});
	it('places Next.js routes under src/ when the app uses a src directory', async () => {
		const cwd = await fixture();
		await mkdir(join(cwd, 'src/app'), { recursive: true });
		await writeFile(join(cwd, 'src/app/layout.tsx'), '// layout\n');
		const result = await runCli(
			[
				'generate',
				'hosted',
				'--framework',
				'next-app',
				'--backend-url',
				'https://your-project.inth.app',
				'--overwrite',
				'--apply',
				'--json',
			],
			{ cwd }
		);
		expect(result, JSON.stringify(result)).toMatchObject({ success: true });
		expect(await readFile(join(cwd, 'src/app/layout.tsx'), 'utf8')).toContain(
			'<ConsentRoot state={resolveConsent()}>'
		);
		expect(await readdir(cwd)).not.toContain('app');
		expect(await readdir(cwd)).toContain('c15t.config.ts');
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
	it('rejects a symlinked directory before writing outside the project', async () => {
		const cwd = await fixture();
		const outside = await fixture();
		await symlink(outside, join(cwd, 'src'));
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
