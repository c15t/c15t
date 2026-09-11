import {
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createCliLogger, runCli } from '../../index';

// Load the legacy AST setup graph before timing individual path regressions.
beforeAll(async () => {
	await import('./non-interactive');
}, 30_000);

const directories: string[] = [];
const appSource = 'export default function App() { return <main />; }';
const fixture = async () => {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-setup-paths-'));
	directories.push(directory);
	const app = join(directory, 'app');
	await mkdir(join(app, 'src'), { recursive: true });
	await writeFile(
		join(app, 'package.json'),
		JSON.stringify({ dependencies: { react: '19', vite: '7' } })
	);
	await writeFile(join(app, 'src/App.tsx'), appSource);
	return { app, directory };
};
const run = (cwd: string, flags: string[]) => {
	const diagnostics: string[] = [];
	const result = runCli(['setup', 'offline', '--json', ...flags], {
		cwd,
		logger: createCliLogger('error', {
			write: (line) => diagnostics.push(line),
		}),
	});
	return { diagnostics, result };
};
afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('setup plan path containment', () => {
	it.each([
		{ flags: ['--plan'] },
		{ flags: ['--dry-run'] },
		{ flags: ['--apply', '--skip-install'] },
	])(
		'rejects an external stylesheet without exposing its contents for $flags',
		async ({ flags }) => {
			const { app, directory } = await fixture();
			const external = join(directory, 'external.css');
			const secret = 'PRIVATE_ENV_KEY=fixture-content-must-not-leak';
			await writeFile(external, secret);
			await symlink(external, join(app, 'src/index.css'));
			const { diagnostics, result } = run(app, flags);
			const output = await result;
			expect(output).toMatchObject({ success: false });
			expect(JSON.stringify({ diagnostics, output })).not.toContain(secret);
			expect(await readFile(external, 'utf8')).toBe(secret);
			expect(await readFile(join(app, 'src/App.tsx'), 'utf8')).toBe(appSource);
			expect(await readdir(join(app, 'src'))).toEqual(['App.tsx', 'index.css']);
			expect(await readdir(app)).not.toContain('.c15t-generation.json');
		}
	);

	it('rejects a dangling stylesheet candidate instead of following or silently skipping it', async () => {
		const { app, directory } = await fixture();
		await symlink(join(directory, 'missing.css'), join(app, 'src/index.css'));
		expect(await run(app, ['--plan']).result).toMatchObject({ success: false });
		expect(await readdir(join(app, 'src'))).toEqual(['App.tsx', 'index.css']);
	});

	it('previews and applies an internal stylesheet alias without replacing the link', async () => {
		const { app } = await fixture();
		const target = join(app, 'shared.css');
		const link = join(app, 'src/index.css');
		const css = 'body { color: red; }';
		await writeFile(target, css);
		await symlink('../shared.css', link);
		expect(await run(app, ['--plan']).result).toMatchObject({
			data: {
				edits: expect.arrayContaining([
					expect.objectContaining({ before: css, path: link }),
				]),
			},
			success: true,
		});
		expect(await readFile(target, 'utf8')).toBe(css);
		expect(await run(app, ['--apply', '--skip-install']).result).toMatchObject({
			success: true,
		});
		expect(await readFile(target, 'utf8')).toContain('@import');
		expect((await lstat(link)).isSymbolicLink()).toBe(true);
	});
});
