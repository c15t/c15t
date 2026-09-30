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

/** The edited source, or the status when nothing was added. */
const edit = function edit(content: string, fileName = 'postcss.config.mjs') {
	const result = addTailwind3PluginToPostcssConfig(content, fileName);
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
			edit('export default { plugins: ["tailwindcss", "autoprefixer"] };')
		).toBe(
			'export default { plugins: ["@c15t/ui/postcss-tailwind3", "tailwindcss", "autoprefixer"] };'
		);
	});

	it('adds an entry before a [name, options] tuple, not inside it', () => {
		expect(
			edit("export default { plugins: [['tailwindcss', {}], 'autoprefixer'] };")
		).toBe(
			"export default { plugins: ['@c15t/ui/postcss-tailwind3', ['tailwindcss', {}], 'autoprefixer'] };"
		);
	});

	it('adds a require() call before require("tailwindcss")', () => {
		expect(
			edit(
				"module.exports = { plugins: [require('tailwindcss')({ config: './tw.js' }), require('autoprefixer')] };",
				'postcss.config.cjs'
			)
		).toBe(
			"module.exports = { plugins: [require('@c15t/ui/postcss-tailwind3'), require('tailwindcss')({ config: './tw.js' }), require('autoprefixer')] };"
		);
	});

	it('uses double quotes in JSON configs', () => {
		expect(
			edit(
				'{ "plugins": { "tailwindcss": {}, "autoprefixer": {} } }',
				'.postcssrc.json'
			)
		).toBe(
			'{ "plugins": { "@c15t/ui/postcss-tailwind3": {}, "tailwindcss": {}, "autoprefixer": {} } }'
		);
	});

	it('goes before tailwindcss, not tailwindcss/nesting', () => {
		expect(
			edit(
				"export default { plugins: { 'tailwindcss/nesting': {}, tailwindcss: {} } };"
			)
		).toBe(
			"export default { plugins: { 'tailwindcss/nesting': {}, '@c15t/ui/postcss-tailwind3': {}, tailwindcss: {} } };"
		);
	});

	it('edits the active config, not a commented-out example', () => {
		const config = [
			"// previous: { plugins: { '@c15t/ui/postcss-tailwind3': {}, tailwindcss: {} } }",
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
				"\t\t'@c15t/ui/postcss-tailwind3': {},\n\t\ttailwindcss: {},"
			)
		);
	});

	it('reports a plugin that is already active', () => {
		expect(
			edit(
				"export default { plugins: { '@c15t/ui/postcss-tailwind3': {}, tailwindcss: {} } };"
			)
		).toBe('present');
		expect(
			edit(
				"export default { plugins: [['@c15t/ui/postcss-tailwind3'], 'tailwindcss'] };"
			)
		).toBe('present');
	});

	it('asks for a manual change when the plugin runs after tailwindcss', () => {
		expect(
			edit(
				"export default { plugins: { tailwindcss: {}, '@c15t/ui/postcss-tailwind3': {} } };"
			)
		).toBe('manual');
		expect(
			edit(
				"export default { plugins: ['tailwindcss', '@c15t/ui/postcss-tailwind3'] };"
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

	it('asks for a manual change when package.json holds the config', async () => {
		const config = 'export default { plugins: { tailwindcss: {} } };\n';
		const root = await createProject({
			'package.json': JSON.stringify({ postcss: { plugins: {} } }),
			'postcss.config.mjs': config,
		});

		const result = await ensureTailwind3PostcssPlugin({ projectRoot: root });

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
			ensureTailwind3PostcssPlugin({ projectRoot: root })
		).resolves.toEqual({
			filePath: join(root, '.postcssrc.yml'),
			status: 'manual',
		});
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
