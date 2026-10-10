import { generateScriptsArrayValue, SCRIPT_SNIPPETS } from './scripts.ts';
import type { BoilerplateOptions } from './types.ts';

/** The public env var each framework's build integration reads. */
export const BACKEND_URL_ENV = {
	astro: 'PUBLIC_C15T_BACKEND_URL',
	next: 'NEXT_PUBLIC_C15T_BACKEND_URL',
	nuxt: 'NUXT_PUBLIC_C15T_BACKEND_URL',
	sveltekit: 'PUBLIC_C15T_BACKEND_URL',
	vite: 'VITE_C15T_BACKEND_URL',
} as const;

const specifierOf = (statement: string): string =>
	statement.match(/from '(?<specifier>[^']+)';$/u)?.groups?.specifier ?? '';

/**
 * Join import statements in module-specifier order, the order the examples
 * use, so a vendor import lands where a reader expects it.
 * @param statements One-line or multi-line import statements.
 * @returns The statements, sorted and joined with newlines.
 */
export const sortImports = (statements: string[]): string =>
	statements
		.toSorted((first, second) => {
			const a = specifierOf(first);
			const b = specifierOf(second);
			if (a === b) {
				return 0;
			}
			return a < b ? -1 : 1;
		})
		.join('\n');

/**
 * One import statement per selected vendor integration.
 * @param scripts Integration subpaths, such as `posthog`.
 * @returns Import statements from `@c15t/integrations/<subpath>`.
 */
export const scriptImports = (scripts: string[]): string[] =>
	scripts.map(
		(script) =>
			`import { ${SCRIPT_SNIPPETS[script]?.importName ?? script} } from '@c15t/integrations/${script}';`
	);

/**
 * A `scripts: [...]` property line, or nothing without vendors.
 * @param scripts Integration subpaths.
 * @param indentation Indentation of the property itself.
 * @returns The property with its trailing comma and newline, or ''.
 */
export const scriptsProperty = (
	scripts: string[],
	indentation: string
): string =>
	scripts.length
		? `${indentation}scripts: ${generateScriptsArrayValue(scripts, indentation)},\n`
		: '';

/**
 * A `const scripts = [...]` declaration, or nothing without vendors.
 * @param scripts Integration subpaths.
 * @param indentation Indentation of the declaration.
 * @returns The declaration with a trailing newline, or ''.
 */
export const scriptsConstant = (scripts: string[], indentation = ''): string =>
	scripts.length
		? `${indentation}const scripts = ${generateScriptsArrayValue(scripts, indentation)};\n`
		: '';

/**
 * An opening tag in the repository's format: one line with a single
 * attribute, one attribute per line with more.
 * @param tag Element name.
 * @param attributes Attributes, such as `state={consent}`.
 * @param indentation Indentation of the tag itself.
 * @returns The opening tag, without leading indentation.
 */
export const openingTag = (
	tag: string,
	attributes: string[],
	indentation: string
): string =>
	attributes.length > 1
		? `<${tag}\n${attributes.map((attribute) => `${indentation}\t${attribute}\n`).join('')}${indentation}>`
		: `<${tag}${attributes.map((attribute) => ` ${attribute}`).join('')}>`;

/** A URL as a `.env` value, quoted when a character would end it early. */
const envValue = (url: string): string =>
	/^[\w:/.\-?=&%@+~,;!*()$[\]]*$/u.test(url) ? url : `"${url}"`;

/**
 * The `.env` file holding the backend URL. Hosts merge it into an existing
 * `.env` with {@link mergeEnvFile} instead of replacing that file.
 * @param name The framework's public env var.
 * @param options Generation options with a validated backend URL.
 * @returns A file map entry, or no file in offline mode.
 */
export const envFile = (
	name: string,
	options: BoilerplateOptions
): Record<string, string> =>
	options.mode === 'hosted' && options.backendURL
		? { '.env': `${name}=${envValue(options.backendURL)}\n` }
		: {};

/** The instruction every offline template adds. */
export const offlineInstruction = (options: BoilerplateOptions): string[] =>
	options.mode === 'offline'
		? [
				'Offline mode resolves the recommended policy in the browser and records consent nowhere else. Review it before you deploy, or generate again in hosted mode.',
			]
		: [];

/**
 * Options for a build integration. Offline mode has no backend to fetch the
 * policy from, so the build skips the fetch instead of failing.
 * @param options Generation options.
 * @returns `''` in hosted mode, `{ onBuildError: 'runtime' }` offline.
 */
export const buildOptions = (options: BoilerplateOptions): string =>
	options.mode === 'offline' ? "{ onBuildError: 'runtime' }" : '';

/** Dependencies shared by every template that uses vendor integrations. */
export const integrationDependencies = (
	options: BoilerplateOptions
): string[] => (options.scripts.length ? ['@c15t/integrations'] : []);

/** The instruction every template with vendor placeholders adds. */
export const vendorInstruction = (
	options: BoilerplateOptions,
	file: string
): string[] =>
	options.scripts.length
		? [`Replace the placeholder vendor IDs in ${file} before deployment.`]
		: [];

/**
 * Merge generated `KEY=value` lines into an existing `.env`. A key that is
 * already set takes the generated value in place; other lines, comments
 * and keys stay as they are. New keys are appended.
 * @param existing Current `.env` contents, or `null` when there is none.
 * @param generated Generated `KEY=value` lines.
 * @returns The merged file contents.
 * @example
 * mergeEnvFile('SECRET=1\n', 'VITE_C15T_BACKEND_URL=https://x.inth.app\n');
 * // 'SECRET=1\nVITE_C15T_BACKEND_URL=https://x.inth.app\n'
 */
export const mergeEnvFile = (
	existing: string | null,
	generated: string
): string => {
	if (existing === null || existing === '') {
		return generated;
	}
	const lines = existing.split('\n');
	const appended: string[] = [];
	for (const line of generated.split('\n').filter(Boolean)) {
		const key = line.slice(0, line.indexOf('='));
		const index = lines.findIndex((current) =>
			new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`, 'u').test(current)
		);
		if (index === -1) {
			appended.push(line);
		} else {
			lines[index] = line;
		}
	}
	const merged = lines.join('\n');
	if (!appended.length) {
		return merged;
	}
	return `${merged}${merged.endsWith('\n') ? '' : '\n'}${appended.join('\n')}\n`;
};
