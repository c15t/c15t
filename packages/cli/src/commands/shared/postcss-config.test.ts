import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	addTailwind3PluginToPostcssConfig,
	ensureTailwind3PostcssPlugin,
	isTailwindV3,
	tailwind3PostcssPluginName,
} from './postcss-config';

const PLUGIN = 'c15t/postcss-tailwind3';

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

/** The edited source, or the status when nothing was added. */
const edit = function edit(content: string, fileName = 'postcss.config.mjs') {
	const result = addTailwind3PluginToPostcssConfig(content, fileName, PLUGIN);
	return result.status === 'added' ? result.content : result.status;
};

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

		expect(edit(config, 'postcss.config.js')).toBe(
			[
				'module.exports = {',
				'  plugins: {',
				"    'c15t/postcss-tailwind3': {},",
				'    tailwindcss: {},',
				'    autoprefixer: {},',
				'  },',
				'};',
			].join('\n')
		);
	});

	it('adds an entry before tailwindcss in a one-line plugins array', () => {
		expect(
			edit('export default { plugins: ["tailwindcss", "autoprefixer"] };')
		).toBe(
			'export default { plugins: ["c15t/postcss-tailwind3", "tailwindcss", "autoprefixer"] };'
		);
	});

	it('adds an entry before a [name, options] tuple, not inside it', () => {
		expect(
			edit("export default { plugins: [['tailwindcss', {}], 'autoprefixer'] };")
		).toBe(
			"export default { plugins: ['c15t/postcss-tailwind3', ['tailwindcss', {}], 'autoprefixer'] };"
		);
	});

	it('adds a require() call before require("tailwindcss")', () => {
		expect(
			edit(
				"module.exports = { plugins: [require('tailwindcss')({ config: './tw.js' }), require('autoprefixer')] };",
				'postcss.config.cjs'
			)
		).toBe(
			"module.exports = { plugins: [require('c15t/postcss-tailwind3'), require('tailwindcss')({ config: './tw.js' }), require('autoprefixer')] };"
		);
	});

	it('uses double quotes in JSON configs', () => {
		expect(
			edit(
				'{ "plugins": { "tailwindcss": {}, "autoprefixer": {} } }',
				'.postcssrc.json'
			)
		).toBe(
			'{ "plugins": { "c15t/postcss-tailwind3": {}, "tailwindcss": {}, "autoprefixer": {} } }'
		);
	});

	it('goes before tailwindcss, not tailwindcss/nesting', () => {
		expect(
			edit(
				"export default { plugins: { 'tailwindcss/nesting': {}, tailwindcss: {} } };"
			)
		).toBe(
			"export default { plugins: { 'tailwindcss/nesting': {}, 'c15t/postcss-tailwind3': {}, tailwindcss: {} } };"
		);
	});

	it('edits the active config, not a commented-out example', () => {
		const config = [
			"// previous: { plugins: { 'c15t/postcss-tailwind3': {}, tailwindcss: {} } }",
			'/* plugins: { tailwindcss: {} } */',
			'export default {',
			'\tplugins: {',
			'\t\ttailwindcss: {},',
			'\t},',
			'};',
		].join('\n');

		expect(edit(config)).toBe(
			config.replace(
				'\t\ttailwindcss: {},',
				"\t\t'c15t/postcss-tailwind3': {},\n\t\ttailwindcss: {},"
			)
		);
	});

	it('reports a plugin that is already active', () => {
		expect(
			edit(
				"export default { plugins: { 'c15t/postcss-tailwind3': {}, tailwindcss: {} } };"
			)
		).toBe('present');
		expect(
			edit(
				"export default { plugins: [['c15t/postcss-tailwind3'], 'tailwindcss'] };"
			)
		).toBe('present');
	});

	it.each([
		'@c15t/ui/postcss-tailwind3',
		'@c15t/nextjs/postcss-tailwind3',
		'@c15t/react/postcss-tailwind3',
	])('takes %s for the same plugin', (name) => {
		expect(
			edit(`export default { plugins: { '${name}': {}, tailwindcss: {} } };`)
		).toBe('present');
		expect(
			edit(`export default { plugins: { tailwindcss: {}, '${name}': {} } };`)
		).toBe('manual');
	});

	it('adds the named plugin next to an unrelated postcss-tailwind3', () => {
		expect(
			addTailwind3PluginToPostcssConfig(
				"export default { plugins: { 'other/postcss-tailwind3': {}, tailwindcss: {} } };",
				'postcss.config.mjs',
				'@c15t/react/postcss-tailwind3'
			)
		).toEqual({
			content:
				"export default { plugins: { 'other/postcss-tailwind3': {}, '@c15t/react/postcss-tailwind3': {}, tailwindcss: {} } };",
			status: 'added',
		});
	});

	it('asks for a manual change when the plugin runs after tailwindcss', () => {
		expect(
			edit(
				"export default { plugins: { tailwindcss: {}, 'c15t/postcss-tailwind3': {} } };"
			)
		).toBe('manual');
		expect(
			edit(
				"export default { plugins: ['tailwindcss', 'c15t/postcss-tailwind3'] };"
			)
		).toBe('manual');
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

		expect(edit(importConfig)).toBe('manual');
		expect(edit(requireConfig, 'postcss.config.cjs')).toBe('manual');
	});

	it('leaves YAML and configs with several plugin lists to the user', () => {
		expect(edit('plugins:\n  tailwindcss: {}\n', '.postcssrc')).toBe('manual');
		expect(
			edit(
				[
					'export default process.env.CI',
					"\t? { plugins: ['tailwindcss'] }",
					": { plugins: ['tailwindcss', 'autoprefixer'] };",
				].join('\n')
			)
		).toBe('manual');
	});
});

describe('ensureTailwind3PostcssPlugin', () => {
	it('adds the plugin to postcss.config.mjs', async () => {
		const root = await createProject({
			'postcss.config.mjs':
				'export default { plugins: { tailwindcss: {}, autoprefixer: {} } };\n',
		});

		const result = await ensureTailwind3PostcssPlugin({
			pluginName: PLUGIN,
			projectRoot: root,
		});

		expect(result).toEqual({
			filePath: join(root, 'postcss.config.mjs'),
			status: 'added',
		});
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			"export default { plugins: { 'c15t/postcss-tailwind3': {}, tailwindcss: {}, autoprefixer: {} } };\n"
		);
	});

	it('does not add the plugin twice', async () => {
		const config =
			"export default { plugins: ['c15t/postcss-tailwind3', 'tailwindcss'] };\n";
		const root = await createProject({ 'postcss.config.js': config });

		const result = await ensureTailwind3PostcssPlugin({
			pluginName: PLUGIN,
			projectRoot: root,
		});

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
			pluginName: PLUGIN,
			projectRoot: root,
		});

		expect(result.status).toBe('added');
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			config
		);
	});

	it('asks for a manual change when package.json holds the config', async () => {
		const config = 'export default { plugins: { tailwindcss: {} } };\n';
		const root = await createProject({
			'package.json': JSON.stringify({ postcss: { plugins: {} } }),
			'postcss.config.mjs': config,
		});

		const result = await ensureTailwind3PostcssPlugin({
			pluginName: PLUGIN,
			projectRoot: root,
		});

		expect(result.status).toBe('manual');
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			config
		);
	});

	it('asks for a manual change when several config files exist', async () => {
		const config = 'export default { plugins: { tailwindcss: {} } };\n';
		const root = await createProject({
			'.postcssrc.yml': 'plugins:\n  tailwindcss: {}\n',
			'postcss.config.mjs': config,
		});

		await expect(
			ensureTailwind3PostcssPlugin({ pluginName: PLUGIN, projectRoot: root })
		).resolves.toEqual({
			filePath: join(root, '.postcssrc.yml'),
			status: 'manual',
		});
		expect(await readFile(join(root, 'postcss.config.mjs'), 'utf-8')).toBe(
			config
		);
	});

	it.each([
		{ config: 'module.exports = { plugins: { tailwindcss: {} } };\n' },
		{ config: null },
	])(
		'leaves Create React App alone, which ignores PostCSS config (config: $config)',
		async ({ config }) => {
			const files: Record<string, string> = {
				'package.json': JSON.stringify({
					dependencies: { 'react-scripts': '5.0.1' },
				}),
			};
			if (config) {
				files['postcss.config.js'] = config;
			}
			const root = await createProject(files);

			const result = await ensureTailwind3PostcssPlugin({
				pluginName: PLUGIN,
				projectRoot: root,
			});

			expect(result).toEqual({
				filePath: config ? join(root, 'postcss.config.js') : null,
				status: 'config-ignored',
			});
			expect((await readdir(root)).sort()).toEqual(Object.keys(files).sort());
			expect(
				config && (await readFile(join(root, 'postcss.config.js'), 'utf-8'))
			).toBe(config);
		}
	);

	it('asks for a manual change without a config', async () => {
		const root = await createProject({});

		await expect(
			ensureTailwind3PostcssPlugin({ pluginName: PLUGIN, projectRoot: root })
		).resolves.toEqual({ filePath: null, status: 'manual' });
	});
});

describe('Tailwind 3 detection', () => {
	it('matches Tailwind 3 ranges only', () => {
		expect(isTailwindV3('3.4.17')).toBe(true);
		expect(isTailwindV3('^3.4.17')).toBe(true);
		expect(isTailwindV3('~3.3.0')).toBe(true);
		expect(isTailwindV3('>=3.4.17 <4')).toBe(true);
		expect(isTailwindV3('<4 >=3.4.17')).toBe(true);
		expect(isTailwindV3('3.3 - 3.4')).toBe(true);
		expect(isTailwindV3('^3.3 || ^3.4')).toBe(true);
		expect(isTailwindV3('3.0.0-alpha.1')).toBe(true);
		expect(isTailwindV3('>=3')).toBe(false);
		expect(isTailwindV3('^3 || ^4')).toBe(false);
		expect(isTailwindV3('>=4 <3')).toBe(false);
		expect(isTailwindV3('30.0.0')).toBe(false);
		expect(isTailwindV3('latest')).toBe(false);
		expect(isTailwindV3('^4.1.0')).toBe(false);
		expect(isTailwindV3(null)).toBe(false);
	});
});

describe('tailwind3PostcssPluginName', () => {
	it('names the plugin after the package the app imports c15t from', () => {
		expect(tailwind3PostcssPluginName('c15t/next')).toBe(
			'c15t/postcss-tailwind3'
		);
		expect(tailwind3PostcssPluginName('c15t/react')).toBe(
			'c15t/postcss-tailwind3'
		);
		expect(tailwind3PostcssPluginName('@c15t/nextjs')).toBe(
			'@c15t/nextjs/postcss-tailwind3'
		);
		expect(tailwind3PostcssPluginName('@c15t/svelte')).toBe(
			'@c15t/svelte/postcss-tailwind3'
		);
	});
});
