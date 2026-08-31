/**
 * Post-build script for @c15t/ui v3 styles.
 *
 * Rslib already compiles CSS Modules to hashed class maps, but it emits
 * implementation-shaped filenames (`*.module.js`, `*_module.css`) and leaves
 * the source `.module.css` files as the public package target. This normalizes
 * the v3 publish surface to per-component class-map modules plus plain CSS:
 *
 *   dist/styles/v3/<name>.js
 *   dist/styles/v3/<name>.css
 *   dist/styles/v3/<name>.d.ts
 */
import {
	existsSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

const PACKAGE_DIR = join(import.meta.dirname, '..');
const SRC_V3_DIR = join(PACKAGE_DIR, 'src', 'styles', 'v3');
const DIST_V3_DIR = join(PACKAGE_DIR, 'dist', 'styles', 'v3');
const TYPES_V3_DIR = join(PACKAGE_DIR, 'types', 'styles', 'v3');

const discoverV3ModuleNames = function discoverV3ModuleNames(): string[] {
	return readdirSync(SRC_V3_DIR)
		.filter((file) => file.endsWith('.module.css'))
		.map((file) => file.replace('.module.css', ''))
		.sort();
};

const readExisting = function readExisting(pathCandidates: string[]): {
	path: string;
	content: string;
} {
	for (const path of pathCandidates) {
		if (existsSync(path)) {
			return { content: readFileSync(path, 'utf8'), path };
		}
	}

	throw new Error(
		`generate-v3-style-artifacts: missing expected file; tried ${pathCandidates.join(
			', '
		)}`
	);
};

const inlineRelativeCssImports = function inlineRelativeCssImports(
	css: string,
	fromPath: string
): string {
	return css.replace(
		/@import\s+(?:url\()?["'](?<capture1>[^"']+\.css)["']\)?\s*;/gu,
		(match, specifier: string) => {
			if (!specifier.startsWith('.')) {
				return match;
			}

			const importedPath = join(dirname(fromPath), specifier);
			const importedCss = readFileSync(importedPath, 'utf8').trim();
			return `${importedCss}\n`;
		}
	);
};

const normalizeStyleModule = function normalizeStyleModule(
	source: string,
	name: string
): string {
	return source
		.replace(new RegExp(`\\./${name}_module\\.css`, 'gu'), `./${name}.css`)
		.replace(new RegExp(`\\./${name}\\.module\\.css`, 'gu'), `./${name}.css`);
};

const normalizeDeclaration = function normalizeDeclaration(
	source: string
): string {
	return source.replace(
		/export\s*=\s*styles;\s*$/mu,
		'export default styles;\n'
	);
};

const moduleNames = discoverV3ModuleNames();

if (moduleNames.length === 0) {
	throw new Error('generate-v3-style-artifacts: no v3 CSS Modules found');
}

for (const name of moduleNames) {
	const css = readExisting([
		join(DIST_V3_DIR, `${name}_module.css`),
		join(DIST_V3_DIR, `${name}.module.css`),
		join(DIST_V3_DIR, `${name}.css`),
	]);
	writeFileSync(
		join(DIST_V3_DIR, `${name}.css`),
		inlineRelativeCssImports(css.content, css.path)
	);

	const js = readExisting([
		join(DIST_V3_DIR, `${name}.module.js`),
		join(DIST_V3_DIR, `${name}.js`),
	]);
	writeFileSync(
		join(DIST_V3_DIR, `${name}.js`),
		normalizeStyleModule(js.content, name)
	);

	const declaration = readExisting([
		join(TYPES_V3_DIR, `${name}.module.css.d.ts`),
	]);
	writeFileSync(
		join(DIST_V3_DIR, `${name}.d.ts`),
		normalizeDeclaration(declaration.content)
	);

	for (const stalePath of [
		join(DIST_V3_DIR, `${name}_module.css`),
		join(DIST_V3_DIR, `${name}.module.css`),
		join(DIST_V3_DIR, `${name}.module.js`),
		join(DIST_V3_DIR, `${name}.module.cjs`),
		join(DIST_V3_DIR, `${name}.cjs`),
	]) {
		if (existsSync(stalePath)) {
			rmSync(stalePath);
		}
	}
}

console.log(
	`Generated ${moduleNames.length} v3 style artifact sets in dist/styles/v3`
);
