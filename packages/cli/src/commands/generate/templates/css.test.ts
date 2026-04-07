import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { updateTailwindCss } from './css';

const tempDirs: string[] = [];

async function createProject(
	files: Record<string, string>
): Promise<{ root: string }> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-tailwind-css-'));
	tempDirs.push(root);

	for (const [relativePath, content] of Object.entries(files)) {
		const filePath = join(root, relativePath);
		await mkdir(dirname(filePath), { recursive: true });
		await writeFile(filePath, content, 'utf-8');
	}

	return { root };
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
	);
});

describe('updateTailwindCss', () => {
	it('leaves plain Tailwind v3 directives unchanged', async () => {
		const initial = [
			'@tailwind base;',
			'@tailwind components;',
			'@tailwind utilities;',
		].join('\n');
		const { root } = await createProject({
			'app/globals.css': initial,
		});

		const result = await updateTailwindCss(root, '3.4.17');
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result).toEqual({
			updated: false,
			filePath: join(root, 'app/globals.css'),
		});
		expect(content).toBe(initial);
	});

	it('leaves the layer-prelude variant unchanged', async () => {
		const initial = [
			'@layer base, components, utilities;',
			'',
			'@layer base {',
			'  @tailwind base;',
			'}',
			'',
			'@tailwind components;',
			'@tailwind utilities;',
		].join('\n');
		const { root } = await createProject({
			'app/globals.css': initial,
		});

		const result = await updateTailwindCss(root, '3.4.17');
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result).toEqual({
			updated: false,
			filePath: join(root, 'app/globals.css'),
		});
		expect(content).toBe(initial);
	});

	it('leaves the old c15t layer prelude unchanged', async () => {
		const initial = [
			'@layer base, components, c15t;',
			'',
			'@layer base {',
			'  @tailwind base;',
			'}',
			'',
			'@tailwind components;',
			'@tailwind utilities;',
		].join('\n');
		const { root } = await createProject({
			'app/globals.css': initial,
		});

		const result = await updateTailwindCss(root, '3.4.17');
		const content = await readFile(join(root, 'app/globals.css'), 'utf-8');

		expect(result).toEqual({
			updated: false,
			filePath: join(root, 'app/globals.css'),
		});
		expect(content).toBe(initial);
	});
});
