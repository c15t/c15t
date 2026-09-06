/**
 * Post-build script for @c15t/ui component styles.
 *
 * Rslib already compiles CSS Modules to hashed class maps, but it emits
 * implementation-shaped filenames (`*.module.js`, `*_module.css`) and leaves
 * the source `.module.css` files as the public package target. This normalizes
 * the publish surface to per-component class-map modules plus plain CSS:
 *
 *   dist/styles/components/<name>.js
 *   dist/styles/components/<name>.node.js
 *   dist/styles/components/<name>.css
 *   dist/styles/components/<name>.d.ts
 *
 * `<name>.js` starts with a side-effect `import "./<name>.css"` so bundlers
 * pull the component CSS in with the class map. `<name>.node.js` is the same
 * class map without that import: it is served through the `node` export
 * condition to runtimes that load the package with plain Node (for example
 * the Next.js Pages Router externalising node_modules), which cannot import
 * CSS and already load the aggregated stylesheet for SSR.
 *
 * Relative `@import`s (the shared `animations/*.css` files) are inlined into
 * each component's CSS so every artifact is self-contained.
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
const SRC_COMPONENTS_DIR = join(PACKAGE_DIR, 'src', 'styles', 'components');
const DIST_COMPONENTS_DIR = join(PACKAGE_DIR, 'dist', 'styles', 'components');
const TYPES_COMPONENTS_DIR = join(PACKAGE_DIR, 'types', 'styles', 'components');

const discoverModuleNames = function discoverModuleNames(): string[] {
	return readdirSync(SRC_COMPONENTS_DIR)
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
		`generate-style-artifacts: missing expected file; tried ${pathCandidates.join(
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

/**
 * Drop the `import "./<name>.css"` side effect from a normalized class map.
 * Throws when the import is missing so a change to the rslib output shape
 * cannot silently produce a `.node.js` that still differs from `.js`.
 */
const stripCssImport = function stripCssImport(
	source: string,
	name: string
): string {
	const cssImport = new RegExp(
		`import\\s*["']\\./${name}\\.css["']\\s*;?`,
		'u'
	);
	if (!cssImport.test(source)) {
		throw new Error(
			`generate-style-artifacts: ${name}.js does not import ./${name}.css; cannot derive ${name}.node.js`
		);
	}
	return source.replace(cssImport, '');
};

const normalizeDeclaration = function normalizeDeclaration(
	source: string
): string {
	return source.replace(
		/export\s*=\s*styles;\s*$/mu,
		'export default styles;\n'
	);
};

const moduleNames = discoverModuleNames();

if (moduleNames.length === 0) {
	throw new Error('generate-style-artifacts: no component CSS Modules found');
}

for (const name of moduleNames) {
	const css = readExisting([
		join(DIST_COMPONENTS_DIR, `${name}_module.css`),
		join(DIST_COMPONENTS_DIR, `${name}.module.css`),
		join(DIST_COMPONENTS_DIR, `${name}.css`),
	]);
	writeFileSync(
		join(DIST_COMPONENTS_DIR, `${name}.css`),
		inlineRelativeCssImports(css.content, css.path)
	);

	const js = readExisting([
		join(DIST_COMPONENTS_DIR, `${name}.module.js`),
		join(DIST_COMPONENTS_DIR, `${name}.js`),
	]);
	const classMap = normalizeStyleModule(js.content, name);
	writeFileSync(join(DIST_COMPONENTS_DIR, `${name}.js`), classMap);
	writeFileSync(
		join(DIST_COMPONENTS_DIR, `${name}.node.js`),
		stripCssImport(classMap, name)
	);

	const declaration = readExisting([
		join(TYPES_COMPONENTS_DIR, `${name}.module.css.d.ts`),
	]);
	writeFileSync(
		join(DIST_COMPONENTS_DIR, `${name}.d.ts`),
		normalizeDeclaration(declaration.content)
	);

	for (const stalePath of [
		join(DIST_COMPONENTS_DIR, `${name}_module.css`),
		join(DIST_COMPONENTS_DIR, `${name}.module.css`),
		join(DIST_COMPONENTS_DIR, `${name}.module.js`),
		join(DIST_COMPONENTS_DIR, `${name}.module.cjs`),
		join(DIST_COMPONENTS_DIR, `${name}.cjs`),
	]) {
		if (existsSync(stalePath)) {
			rmSync(stalePath);
		}
	}
}

console.log(
	`Generated ${moduleNames.length} component style artifact sets in dist/styles/components`
);
