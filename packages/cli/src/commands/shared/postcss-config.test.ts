import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	addTailwind3PluginToPostcssConfig,
	ensureTailwind3PostcssPlugin,
	isTailwindV3,
	needsTailwind3PostcssPlugin,
} from './postcss-config';

const tempDirs: string[] = [];

const createProject = async function createProject(
	files: Record<string, string>
): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'c15t-postcss-config-'));
	tempDirs.push(root);
	await Promise.all(
		Object.entries(files).map(([name, content]) =>
			writeFile(join(root, name), content, 'utf-8')
		)
	);
	return root;
};

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true }))
	);
});

describe('addTailwind3PluginToPostcssConfig', () => {
	it('adds a key before tailwindcss in a multi-line plugins object', () => {
		const config = [
			'module.exports = {',
			'  plugins: {',
			'    tailwindcss: {},',
			'    autoprefixer: {},',
			'  },',
			'};',
		].join('\n');

		expect(addTailwind3PluginToPostcssConfig(config, false)).toBe(
			[
				'module.exports = {',
				'  plugins: {',
				"    '@c15t/ui/postcss-tailwind3': {},",
				'    tailwindcss: {},',
				'    autoprefixer: {},',
				'  },',
				'};',
			].join('\n')
		);
	});

	it('adds an entry before tailwindcss in a one-line plugins array', () => {
		expect(
			addTailwind3PluginToPostcssConfig(
				'export default { plugins: ["tailwindcss", "autoprefixer"] };',
				false
			)
		).toBe(
			'export default { plugins: ["@c15t/ui/postcss-tailwind3", "tailwindcss", "autoprefixer"] };'
		);
	});

	it('adds a require() call before require("tailwindcss")', () => {
		expect(
			addTailwind3PluginToPostcssConfig(
				"module.exports = { plugins: [require('tailwindcss'), require('autoprefixer')] };",
				false
			)
		).toBe(
			"module.exports = { plugins: [require('@c15t/ui/postcss-tailwind3'), require('tailwindcss'), require('autoprefixer')] };"
		);
	});

	it('uses double quotes in JSON configs', () => {
		expect(
			addTailwind3PluginToPostcssConfig(
				'{ "plugins": { "tailwindcss": {}, "autoprefixer": {} } }',
				true
			)
		).toBe(
			'{ "plugins": { "@c15t/ui/postcss-tailwind3": {}, "tailwindcss": {}, "autoprefixer": {} } }'
		);
	});

	it('goes before tailwindcss, not tailwindcss/nesting', () => {
		expect(
			addTailwind3PluginToPostcssConfig(
				"export default { plugins: { 'tailwindcss/nesting': {}, tailwindcss: {} } };",
				false
			)
		).toBe(
			"export default { plugins: { 'tailwindcss/nesting': {}, '@c15t/ui/postcss-tailwind3': {}, tailwindcss: {} } };"
		);
	});

	it('leaves configs that pass an imported binding to the user', () => {
		const importConfig = [
			"import tailwindcss from 'tailwindcss';",
			'export default { plugins: [tailwindcss()] };',
		].join('\n');
		const requireConfig = [
			"const tailwindcss = require('tailwindcss');",
			'module.exports = { plugins: [tailwindcss] };',
		].join('\n');

		expect(addTailwind3PluginToPostcssConfig(importConfig, false)).toBeNull();
		expect(addTailwind3PluginToPostcssConfig(requireConfig, false)).toBeNull();
	});
});

describe('ensureTailwind3PostcssPlugin', () => {
	it('adds the plugin to postcss.config.mjs', async () => {
		const root = await createProject({
			'postcss.config.mjs':
				'export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n',
		});

		const result = await ensureTailwind3PostcssPlugin({ projectRoot: root });

		expect(result).toEqual({
			filePath: join(root, 'postcss.config.mjs'),
			status: 'added',
		});
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			"export default { plugins: { '@c15t/ui/postcss-tailwind3': {}, tailwindcss: {}, autoprefixer: {} } };\n"
		);
	});

	it('does not add the plugin twice', async () => {
		const config =
			"export default { plugins: ['@c15t/ui/postcss-tailwind3', 'tailwindcss'] };\n";
		const root = await createProject({ 'postcss.config.js': config });

		const result = await ensureTailwind3PostcssPlugin({ projectRoot: root });

		expect(result.status).toBe('present');
		expect(await readFile(join(root, 'postcss.config.js'), 'utf-8')).toBe(
			config
		);
	});

	it('writes nothing in a dry run', async () => {
		const config = "export default { plugins: ['tailwindcss'] };\n";
		const root = await createProject({ 'postcss.config.mjs': config });

		const result = await ensureTailwind3PostcssPlugin({
			dryRun: true,
			projectRoot: root,
		});

		expect(result.status).toBe('added');
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			config
		);
	});

	it('asks for a manual change without a config', async () => {
		const root = await createProject({});

		await expect(
			ensureTailwind3PostcssPlugin({ projectRoot: root })
		).resolves.toEqual({ filePath: null, status: 'manual' });
	});
});

describe('Tailwind 3 detection', () => {
	it('matches Tailwind 3 ranges only', () => {
		expect(isTailwindV3('3.4.17')).toBe(true);
		expect(isTailwindV3('^3.4.17')).toBe(true);
		expect(isTailwindV3('~3.3.0')).toBe(true);
		expect(isTailwindV3('^4.1.0')).toBe(false);
		expect(isTailwindV3(null)).toBe(false);
	});

	it('only wires the plugin for React and Next.js apps', () => {
		expect(
			needsTailwind3PostcssPlugin({
				pkg: 'c15t/next',
				tailwindVersion: '^3.4.0',
			})
		).toBe(true);
		expect(
			needsTailwind3PostcssPlugin({ pkg: 'c15t', tailwindVersion: '^3.4.0' })
		).toBe(false);
		expect(
			needsTailwind3PostcssPlugin({
				pkg: 'c15t/react',
				tailwindVersion: '^4.1.0',
			})
		).toBe(false);
		expect(needsTailwind3PostcssPlugin(null)).toBe(false);
	});
});
