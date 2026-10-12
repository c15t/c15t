import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const STAR_EXPORT = /export\s*\*\s*from\s*["'](?<specifier>[^"']+)["']/gu;
const DECLARED_EXPORT =
	/export\s+(?:async\s+)?(?:const|let|function\*?)\s+(?<name>[A-Za-z_$][\w$]*)/gu;
const LIST_EXPORT = /export\s*\{(?<list>[^}]*)\}/gu;
const COMPOSABLE_NAME = /^use[A-Z]/u;
const SCRIPT_FILE = /\.[jt]s$/u;

/** The file a relative specifier names: source `.ts`, or built `.js`. */
const resolveModuleFile = function resolveModuleFile(
	from: string,
	specifier: string
): string | undefined {
	const base = resolve(dirname(from), specifier);
	return [base, `${base}.ts`, `${base}.js`, base.replace(/\.js$/u, '.ts')].find(
		(candidate) => SCRIPT_FILE.test(candidate) && existsSync(candidate)
	);
};

const collectExportNames = function collectExportNames(
	file: string,
	names: Set<string>,
	seen: Set<string>
): void {
	if (seen.has(file)) {
		return;
	}
	seen.add(file);
	const source = readFileSync(file, 'utf8');
	for (const match of source.matchAll(DECLARED_EXPORT)) {
		const name = match.groups?.name;
		if (name) {
			names.add(name);
		}
	}
	for (const match of source.matchAll(LIST_EXPORT)) {
		for (const entry of match.groups?.list?.split(',') ?? []) {
			const parts = entry.trim().split(/\s+as\s+/u);
			const exported = (parts[1] ?? parts[0])?.trim();
			if (exported && !entry.trim().startsWith('type ')) {
				names.add(exported);
			}
		}
	}
	for (const match of source.matchAll(STAR_EXPORT)) {
		const specifier = match.groups?.specifier;
		const target = specifier ? resolveModuleFile(file, specifier) : undefined;
		if (target) {
			collectExportNames(target, names, seen);
		}
	}
};

/**
 * The composables a module exports, following its `export * from`
 * re-exports: every exported name that starts with `use` and a capital
 * letter. The Nuxt module auto-imports exactly these, so a composable added
 * to the index is auto-imported without a second list to update.
 *
 * Reads the source as written in this package (TypeScript in the repo,
 * JavaScript once built), so it recognizes `export const`, `export function`
 * and `export { … }` declarations, which is all the composables use.
 *
 * @param entry - Absolute path of the composables index.
 * @returns The composable names, sorted.
 * @internal
 */
export const readComposableExports = function readComposableExports(
	entry: string
): string[] {
	const names = new Set<string>();
	collectExportNames(entry, names, new Set());
	return [...names].filter((name) => COMPOSABLE_NAME.test(name)).sort();
};
