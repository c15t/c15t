import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const thisDirectory = dirname(fileURLToPath(import.meta.url));

/** The package root, which is where the manifest's export map is defined. */
const packageRoot = join(thisDirectory, '../../..');
const manifestPath = join(packageRoot, 'package.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
	exports: Record<string, Record<string, unknown>>;
	name: string;
};

const pluginExports = manifest.exports['./expo-plugin'] ?? {};
const requireSpecifier = pluginExports.require;
const importSpecifier = pluginExports.import;

// A manifest that lost either condition means Expo cannot load the plugin at
// all, so say that rather than let every assertion below compare against
// `undefined`.
if (
	typeof requireSpecifier !== 'string' ||
	typeof importSpecifier !== 'string'
) {
	throw new Error(
		'./expo-plugin needs both a "require" and an "import" condition in packages/react-native/package.json, otherwise Expo resolves the plugin to an ES module it cannot require.'
	);
}

/**
 * Resolve and load the way Expo does: `@expo/require-utils` hands the specifier
 * to Node's CommonJS resolver, then `require()`s whatever file comes back. A
 * self-reference is the same resolution from inside the package.
 */
const requireFromPackage = createRequire(manifestPath);

const entryPath = function entryPath(specifier: string): string {
	return resolve(packageRoot, specifier.replace(/^\.\//u, ''));
};

const cjsEntryPath = entryPath(requireSpecifier);

/** Load the built file, failing with the reason rather than an ENOENT stack. */
const builtCjsEntry = function builtCjsEntry(): Record<string, unknown> {
	if (!existsSync(cjsEntryPath)) {
		throw new Error(
			`${cjsEntryPath} is missing. Run \`bun run build\` in packages/react-native before this test.`
		);
	}

	return requireFromPackage(cjsEntryPath) as Record<string, unknown>;
};

describe('the CommonJS plugin entry', () => {
	it('publishes a require condition ahead of import and default', () => {
		// Node takes the first condition key that matches, so the order is part
		// of the contract: a `require` placed after `import` would never fire.
		expect(Object.keys(pluginExports)).toEqual([
			'types',
			'require',
			'import',
			'default',
		]);
		expect(requireSpecifier).toBe('./dist/expo-plugin/index.cjs');
		expect(importSpecifier).toBe('./dist/expo-plugin/index.js');
	});

	it('resolves the published subpath to the .cjs for a require', () => {
		const resolved = requireFromPackage.resolve(`${manifest.name}/expo-plugin`);

		expect(resolve(resolved)).toBe(cjsEntryPath);
	});

	it('loads under require() with the plugin on the default export', () => {
		const loaded = builtCjsEntry();

		expect(typeof loaded.default).toBe('function');
		expect(typeof loaded.withC15t).toBe('function');
		expect(typeof loaded.applyParamsOnConfig).toBe('function');
		expect(typeof loaded.C15tPluginError).toBe('function');
	});

	it('is one bundled file that leaves @expo/config-plugins external', () => {
		const code = readFileSync(cjsEntryPath, 'utf8');

		expect(code).toMatch(/["']use strict["']/u);
		expect(code).not.toMatch(/^\s*import\s*[{'"*]/mu);
		expect(code).not.toMatch(/^\s*export\s*[{'*]/mu);
		// A second copy of @expo/config-plugins would register its mods through a
		// separate `withMod`, so this has to stay a require of the host's copy.
		expect(code).toMatch(
			/require\((?<quote>["'])@expo\/config-plugins\k<quote>\)/u
		);
	});
});

describe('the ES module plugin entry', () => {
	it('stays published alongside the CommonJS one', () => {
		const esmEntryPath = entryPath(importSpecifier);

		expect(existsSync(esmEntryPath)).toBe(true);
		expect(readFileSync(esmEntryPath, 'utf8')).toContain('export default');
	});
});
