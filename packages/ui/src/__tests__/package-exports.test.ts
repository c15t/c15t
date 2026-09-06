import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, test } from 'vitest';

const COMPONENT_STYLE_MODULES = [
	'accordion',
	'branding',
	'button',
	'collapsible',
	'consent-actions',
	'consent-banner',
	'consent-dialog',
	'consent-dialog-trigger',
	'consent-manager',
	'frame',
	'iab-consent-banner',
	'iab-consent-dialog',
	'legal-links',
	'preference-item',
	'switch',
	'tabs',
] as const;

const PRIMITIVE_CSS_MODULES = [
	'accordion',
	'button',
	'legal-links',
	'preference-item',
	'switch',
] as const;

/**
 * Style-loader runtime markers that must NOT appear in class maps.
 * Their presence means styles are being injected at runtime via JS instead of
 * being shipped as plain CSS assets.
 */
const STYLE_LOADER_MARKERS = [
	'document.createElement("style")',
	"document.createElement('style')",
	'insertBefore',
	'styleTagTransform',
	'injectStylesIntoStyleTag',
] as const;

const resolvePath = function resolvePath(specifier: string): string {
	return import.meta.resolve(specifier).replace('file://', '');
};

// `import.meta.url` is not a file URL under the test runner, so anchor the
// package root on a resolved dist asset instead.
const PACKAGE_ROOT = dirname(dirname(resolvePath('@c15t/ui/styles.css')));

type ExportTarget = string | { [condition: string]: ExportTarget };

const packageExports = (
	JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
		exports: Record<string, ExportTarget>;
	}
).exports;

const pickConditionTarget = function pickConditionTarget(
	target: ExportTarget,
	conditions: readonly string[]
): string | null {
	if (typeof target === 'string') {
		return target;
	}
	for (const [condition, nested] of Object.entries(target)) {
		if (condition === 'default' || conditions.includes(condition)) {
			const picked = pickConditionTarget(nested, conditions);
			if (picked !== null) {
				return picked;
			}
		}
	}
	return null;
};

/**
 * Resolve a package subpath against the `exports` map with an explicit
 * condition list, following Node's rules: exact keys win, otherwise the
 * pattern with the longest prefix (then longest suffix) matches, and the
 * first listed condition that is active wins.
 *
 * The test runner itself runs on Node, so `import.meta.resolve` always
 * applies the `node` condition. This helper lets the tests pin what a
 * bundler (`import`) and a Node runtime (`node`, `import`) each receive.
 */
const resolveExport = function resolveExport(
	subpath: string,
	conditions: readonly string[]
): string {
	let best: {
		key: string;
		prefix: string;
		suffix: string;
		match: string;
	} | null = null;

	for (const key of Object.keys(packageExports)) {
		const star = key.indexOf('*');
		if (star === -1) {
			if (key === subpath) {
				best = { key, match: '', prefix: key, suffix: '' };
				break;
			}
			continue;
		}
		const prefix = key.slice(0, star);
		const suffix = key.slice(star + 1);
		const matches =
			subpath.startsWith(prefix) &&
			subpath.endsWith(suffix) &&
			subpath.length >= prefix.length + suffix.length;
		if (!matches) {
			continue;
		}
		const isMoreSpecific =
			best === null ||
			prefix.length > best.prefix.length ||
			(prefix.length === best.prefix.length &&
				suffix.length > best.suffix.length);
		if (isMoreSpecific) {
			best = {
				key,
				match: subpath.slice(prefix.length, subpath.length - suffix.length),
				prefix,
				suffix,
			};
		}
	}

	if (best === null) {
		throw new Error(`No export matches ${subpath}`);
	}
	const target = pickConditionTarget(
		packageExports[best.key] ?? '',
		conditions
	);
	if (target === null) {
		throw new Error(
			`No target for ${subpath} under conditions ${conditions.join(', ')}`
		);
	}
	return join(PACKAGE_ROOT, target.replaceAll('*', best.match));
};

const BUNDLER_CONDITIONS = ['import'] as const;
const NODE_CONDITIONS = ['node', 'import'] as const;

/**
 * Every component style ships as a flat triple under dist/styles/components:
 * `<name>.js` (class map), `<name>.css` (plain CSS), `<name>.d.ts`.
 */
describe('package exports: @c15t/ui/styles/components/<name> triple', () => {
	for (const name of COMPONENT_STYLE_MODULES) {
		test(`@c15t/ui/styles/components/${name} → dist JS class map`, () => {
			const resolvedPath = resolveExport(
				`./styles/components/${name}`,
				BUNDLER_CONDITIONS
			);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).not.toContain('/src/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.js$`, 'u'));
			expect(existsSync(resolvedPath)).toBe(true);
		});

		test(`@c15t/ui/styles/components/${name}.css → dist CSS asset`, () => {
			const resolvedPath = resolvePath(
				`@c15t/ui/styles/components/${name}.css`
			);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.css$`, 'u'));
			expect(readFileSync(resolvedPath, 'utf-8')).toContain('c15t-ui-');
		});

		test(`@c15t/ui/styles/components/${name}.module.css → dist JS class map`, () => {
			const resolvedPath = resolveExport(
				`./styles/components/${name}.module.css`,
				BUNDLER_CONDITIONS
			);

			expect(resolvedPath).toContain('/dist/styles/components/');
			expect(resolvedPath).toMatch(new RegExp(`/${name}\\.js$`, 'u'));
			expect(existsSync(resolvedPath)).toBe(true);
		});

		test(`components/${name}.js has no style-injection runtime`, () => {
			const contents = readFileSync(
				resolveExport(`./styles/components/${name}`, BUNDLER_CONDITIONS),
				'utf-8'
			);

			expect(contents).toContain(`./${name}.css`);
			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}
});

/**
 * Runtimes that load the package with plain Node (the Next.js Pages Router
 * externalising node_modules, for example) cannot import CSS. The `node`
 * export condition serves the same class map without the side-effect import;
 * those consumers load the aggregated stylesheet instead.
 */
describe('package exports: node condition serves class maps without CSS imports', () => {
	for (const name of COMPONENT_STYLE_MODULES) {
		test(`@c15t/ui/styles/components/${name} → ${name}.node.js`, () => {
			for (const subpath of [
				`./styles/components/${name}`,
				`./styles/components/${name}.module.css`,
			]) {
				const resolvedPath = resolveExport(subpath, NODE_CONDITIONS);

				expect(resolvedPath).toContain('/dist/styles/components/');
				expect(resolvedPath).toMatch(new RegExp(`/${name}\\.node\\.js$`, 'u'));
				expect(existsSync(resolvedPath)).toBe(true);
			}
		});

		test(`components/${name}.node.js is ${name}.js minus the CSS import`, async () => {
			const bundlerPath = resolveExport(
				`./styles/components/${name}`,
				BUNDLER_CONDITIONS
			);
			const nodePath = resolveExport(
				`./styles/components/${name}`,
				NODE_CONDITIONS
			);
			const bundlerContents = readFileSync(bundlerPath, 'utf-8');
			const nodeContents = readFileSync(nodePath, 'utf-8');

			expect(nodeContents).not.toContain('.css');
			expect(nodeContents).not.toContain('import');
			for (const marker of STYLE_LOADER_MARKERS) {
				expect(nodeContents).not.toContain(marker);
			}
			expect(nodeContents).toBe(
				bundlerContents.replace(
					new RegExp(`import\\s*["']\\./${name}\\.css["']\\s*;?`, 'u'),
					''
				)
			);

			const classMap = (await import(nodePath)) as {
				default: Record<string, string>;
			};
			expect(Object.keys(classMap.default).length).toBeGreaterThan(0);
			for (const className of Object.values(classMap.default)) {
				expect(className).toMatch(/^c15t-ui-/u);
			}
		});
	}

	test('plain Node imports the class map instead of failing on the CSS', async () => {
		const nodeBinary = process.versions.bun ? 'node' : process.execPath;
		const script = [
			"import('@c15t/ui/styles/components/button')",
			'.then((m) => console.log(JSON.stringify(m.default)))',
		].join('');
		const result = spawnSync(
			nodeBinary,
			['--input-type=module', '-e', script],
			{ cwd: PACKAGE_ROOT, encoding: 'utf-8' }
		);

		expect(result.error).toBeUndefined();
		expect(result.stderr).not.toContain('ERR_UNKNOWN_FILE_EXTENSION');
		expect(result.status).toBe(0);

		const expected = (await import(
			resolveExport('./styles/components/button', NODE_CONDITIONS)
		)) as { default: Record<string, string> };
		expect(JSON.parse(result.stdout.trim())).toEqual(expected.default);
	});
});

describe('package exports: .module.js resolves to JS class maps in dist/', () => {
	for (const name of PRIMITIVE_CSS_MODULES) {
		test(`@c15t/ui/styles/primitives/${name}.module.js → dist JS class map`, () => {
			const resolvedPath = resolvePath(
				`@c15t/ui/styles/primitives/${name}.module.js`
			);

			expect(resolvedPath).toContain('/dist/');
			expect(resolvedPath).not.toContain('/src/');
			// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
			expect(resolvedPath).toMatch(/\.module\.(js|cjs)$/u);
		});

		test(`primitives/${name}.module.js has no style-injection runtime`, () => {
			const contents = readFileSync(
				resolvePath(`@c15t/ui/styles/primitives/${name}.module.js`),
				'utf-8'
			);

			for (const marker of STYLE_LOADER_MARKERS) {
				expect(contents).not.toContain(marker);
			}
		});
	}
});

describe('package exports: aggregated stylesheets', () => {
	for (const entry of [
		'styles.css',
		'styles.tw3.css',
		'iab/styles.css',
		'iab/styles.tw3.css',
	]) {
		test(`@c15t/ui/${entry} aggregates component rules`, () => {
			const resolvedPath = resolvePath(`@c15t/ui/${entry}`);
			const contents = readFileSync(resolvedPath, 'utf-8');

			expect(resolvedPath).toContain('/dist/');
			expect(contents).toContain('c15t-ui-');
			expect(contents).toContain('@keyframes');
			if (entry.endsWith('.tw3.css')) {
				expect(contents).not.toMatch(/@layer\b/u);
			} else {
				expect(contents).toContain('@layer components');
			}
		});
	}
});
