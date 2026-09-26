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
 * Class maps carry no CSS side-effect import. Component rules reach the page
 * through the aggregated stylesheet (`styles.css`, `styles.tw3.css`, and the
 * IAB variants), which `generate-css-entrypoints.ts` builds from these same
 * `<name>.css` files together with the default theme tokens and primitive
 * rules. React, Next.js, TanStack Start, Svelte and Astro document one
 * app-level import of it. A class map that also imported its own CSS made
 * bundlers emit a second copy of the same rules in a separate asset.
 *
 * `<name>.css` stays published. Vue components import it next to each class
 * map, because Vue apps load no aggregate (Vue supplies the default tokens at
 * runtime). Hosts that assemble their own stylesheet can import it too; it
 * holds only that component's rules, without the default tokens or primitive
 * rules.
 *
 * `<name>.node.js` is byte-identical to `<name>.js`. It stays published
 * because the `node` export condition and the explicit `*.node.js` subpaths
 * point at it.
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
 *
 * Fresh rslib output (`<name>.module.js`) always carries that import, so its
 * absence there throws: a change to the rslib output shape must not slip
 * through as a class map that still imports some other stylesheet. A class
 * map this script already normalized (a re-run without a rebuild) has no
 * import left and passes through unchanged.
 */
const stripCssImport = function stripCssImport(
	source: string,
	name: string,
	fromRslibOutput: boolean
): string {
	const cssImport = new RegExp(
		`import\\s*["']\\./${name}\\.css["']\\s*;?`,
		'u'
	);
	if (fromRslibOutput && !cssImport.test(source)) {
		throw new Error(
			`generate-style-artifacts: ${name}.module.js does not import its stylesheet; the rslib output shape changed`
		);
	}
	const stripped = source.replace(cssImport, '');
	if (/\.css["']/u.test(stripped)) {
		throw new Error(
			`generate-style-artifacts: ${name}.js still references a stylesheet after stripping ./${name}.css`
		);
	}
	return stripped;
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
	const classMap = stripCssImport(
		normalizeStyleModule(js.content, name),
		name,
		js.path.endsWith('.module.js')
	);
	writeFileSync(join(DIST_COMPONENTS_DIR, `${name}.js`), classMap);
	writeFileSync(join(DIST_COMPONENTS_DIR, `${name}.node.js`), classMap);

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
