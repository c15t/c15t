import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { cleanupProjects, createProject } from './__tests__/helpers';
import { runPostcssTailwind3Codemod as codemod } from './postcss-tailwind3';

const manifest = (dependencies: Record<string, string>) =>
	JSON.stringify({ dependencies, name: 'app' });

const OBJECT_CONFIG = `// PostCSS for Tailwind CSS 3
export default {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
};
`;

describe('postcss-tailwind3 codemod', { timeout: 20_000 }, () => {
	afterEach(cleanupProjects);

	it('adds the umbrella plugin before tailwindcss', async () => {
		const rootDir = await createProject({
			'package.json': manifest({
				c15t: '3.0.0-alpha.5',
				tailwindcss: '^3.4.17',
			}),
			'postcss.config.mjs': OBJECT_CONFIG,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });

		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8'))
			.toBe(`// PostCSS for Tailwind CSS 3
export default {
	plugins: {
		'c15t/postcss-tailwind3': {},
		tailwindcss: {},
		autoprefixer: {},
	},
};
`);
		expect(result.changedFiles[0]?.summaries).toEqual([
			'added c15t/postcss-tailwind3 before tailwindcss',
		]);
	});

	it('reads the installed version when the specifier has none', async () => {
		const rootDir = await createProject({
			'node_modules/tailwindcss/package.json': JSON.stringify({
				version: '3.4.17',
			}),
			'package.json': manifest({
				c15t: '3.0.0-alpha.5',
				tailwindcss: 'workspace:*',
			}),
			'postcss.config.mjs': OBJECT_CONFIG,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });

		expect(result.warnings).toEqual([]);
		expect(
			await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8')
		).toContain("'c15t/postcss-tailwind3': {},\n\t\ttailwindcss: {},");
	});

	it.each(['latest', 'catalog:', 'workspace:*'])(
		'warns when it cannot tell the version from %s',
		async (specifier) => {
			const rootDir = await createProject({
				'package.json': manifest({
					c15t: '3.0.0-alpha.5',
					tailwindcss: specifier,
				}),
				'postcss.config.mjs': OBJECT_CONFIG,
			});
			const result = await codemod({ dryRun: false, projectRoot: rootDir });

			expect(result.changedFiles).toEqual([]);
			expect(result.warnings).toEqual([
				{
					filePath: rootDir,
					message: `Could not tell the Tailwind CSS version from '${specifier}'. If the app uses Tailwind CSS 3, add 'c15t/postcss-tailwind3': {} before tailwindcss in your PostCSS config.`,
				},
			]);
			expect(await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8')).toBe(
				OBJECT_CONFIG
			);
		}
	);

	it.each<[string, string | undefined, string]>([
		['catalog:', '3.0.0-alpha.5', 'c15t/postcss-tailwind3'],
		['catalog:web2', '3.0.0', 'c15t/postcss-tailwind3'],
		['^2 || ^3', '3.0.0', 'c15t/postcss-tailwind3'],
		['catalog:', '1.8.0', '@c15t/react/postcss-tailwind3'],
		['catalog:', undefined, '@c15t/react/postcss-tailwind3'],
	])(
		'reads the installed c15t for c15t %s (installed: %s)',
		async (specifier, installed, plugin) => {
			const rootDir = await createProject({
				...(installed && {
					'node_modules/c15t/package.json': JSON.stringify({
						version: installed,
					}),
				}),
				'package.json': manifest({
					'@c15t/react': 'catalog:',
					c15t: specifier,
					tailwindcss: '^3.4.17',
				}),
				'postcss.config.mjs': OBJECT_CONFIG,
			});
			const result = await codemod({ dryRun: false, projectRoot: rootDir });

			expect(result.warnings).toEqual([]);
			expect(
				await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8')
			).toContain(`'${plugin}': {},\n\t\ttailwindcss: {},`);
		}
	);

	it('uses the umbrella plugin for an unresolved c15t with no scoped package', async () => {
		const rootDir = await createProject({
			'package.json': manifest({ c15t: 'catalog:', tailwindcss: '^3.4.17' }),
			'postcss.config.mjs': OBJECT_CONFIG,
		});
		await codemod({ dryRun: false, projectRoot: rootDir });

		expect(
			await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8')
		).toContain("'c15t/postcss-tailwind3': {},\n\t\ttailwindcss: {},");
	});

	it('uses the scoped plugin and the file quote style in a CommonJS config', async () => {
		const rootDir = await createProject({
			'package.json': JSON.stringify({
				dependencies: { '@c15t/nextjs': '^2.3.0' },
				devDependencies: { tailwindcss: '3.4.1' },
			}),
			'postcss.config.js': `module.exports = { plugins: { "tailwindcss": {}, "autoprefixer": {} } };
`,
		});
		await codemod({ dryRun: false, projectRoot: rootDir });
		expect(await readFile(join(rootDir, 'postcss.config.js'), 'utf-8')).toBe(
			`module.exports = { plugins: { "@c15t/nextjs/postcss-tailwind3": {}, "tailwindcss": {}, "autoprefixer": {} } };
`
		);
	});

	it('finds plugins in a config bound to a variable', async () => {
		const rootDir = await createProject({
			'package.json': manifest({
				'@c15t/react': 'alpha',
				tailwindcss: '~3.3.0',
			}),
			'postcss.config.ts': `const config = {
	plugins: {
		tailwindcss: {},
	},
};

export default config;
`,
		});
		await codemod({ dryRun: false, projectRoot: rootDir });
		expect(
			await readFile(join(rootDir, 'postcss.config.ts'), 'utf-8')
		).toContain(
			"\t\t'@c15t/react/postcss-tailwind3': {},\n\t\ttailwindcss: {},"
		);
	});

	it('finds the plugin under a computed key', async () => {
		const config = `export default {
	plugins: {
		['c15t/postcss-tailwind3']: false,
		[\`tailwindcss\`]: {},
	},
};
`;
		const rootDir = await createProject({
			'package.json': manifest({ c15t: '^3.0.0', tailwindcss: '^3.4.17' }),
			'postcss.config.mjs': config,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });

		expect(result.changedFiles).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(await readFile(join(rootDir, 'postcss.config.mjs'), 'utf-8')).toBe(
			config
		);
	});

	it('warns and leaves an array-form config unchanged', async () => {
		const config = `module.exports = { plugins: [require('tailwindcss'), require('autoprefixer')] };
`;
		const rootDir = await createProject({
			'package.json': manifest({ c15t: '^3.0.0', tailwindcss: '^3.4.0' }),
			'postcss.config.cjs': config,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(result.changedFiles).toEqual([]);
		expect(result.warnings).toEqual([
			expect.objectContaining({
				message: expect.stringContaining('plugins is an array'),
			}),
		]);
		expect(await readFile(join(rootDir, 'postcss.config.cjs'), 'utf-8')).toBe(
			config
		);
	});

	it('warns when Tailwind CSS 3 has no PostCSS config', async () => {
		const rootDir = await createProject({
			'package.json': manifest({ c15t: '^3.0.0', tailwindcss: '^3.4.0' }),
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(result.warnings?.[0]?.message).toContain('no postcss.config');
	});

	it.each<Record<string, string>>([
		{ c15t: '^3.0.0', tailwindcss: '^4.1.0' },
		{ tailwindcss: '^3.4.0' },
	])('does nothing for dependencies %o', async (dependencies) => {
		const rootDir = await createProject({
			'package.json': manifest(dependencies),
			'postcss.config.mjs': OBJECT_CONFIG,
		});
		const result = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(result.changedFiles).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	it('is idempotent and writes nothing in a dry run', async () => {
		const files = {
			'package.json': manifest({ c15t: '^3.0.0', tailwindcss: '^3.4.0' }),
			'postcss.config.mjs': OBJECT_CONFIG,
		};
		const dryRoot = await createProject(files);
		const dry = await codemod({ dryRun: true, projectRoot: dryRoot });
		expect(dry.changedFiles[0]?.after).toContain(
			"'c15t/postcss-tailwind3': {}"
		);
		expect(await readFile(join(dryRoot, 'postcss.config.mjs'), 'utf-8')).toBe(
			OBJECT_CONFIG
		);

		const rootDir = await createProject(files);
		await codemod({ dryRun: false, projectRoot: rootDir });
		const again = await codemod({ dryRun: false, projectRoot: rootDir });
		expect(again.changedFiles).toEqual([]);
		expect(again.warnings).toEqual([]);
	});
});
