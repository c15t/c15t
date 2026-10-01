import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ts } from 'ts-morph';

import {
	readFile,
	resolvePlannedPath,
	writeFile,
} from '../generate/templates/shared/file-plan';

/**
 * Any c15t package's Tailwind 3 PostCSS plugin subpath. `c15t`, every
 * adapter that publishes a stylesheet, and `@c15t/ui` export the same plugin
 * as `<package>/postcss-tailwind3`.
 */
const C15T_TAILWIND3_PLUGIN = /^(?:c15t|@c15t\/[^/]+)\/postcss-tailwind3$/u;

/**
 * The Tailwind 3 PostCSS plugin name for an app that imports c15t from
 * `importPath`. The plugin comes from the package the app installed, so
 * PostCSS can resolve it without `@c15t/ui` as a direct dependency.
 *
 * @param importPath - The c15t entry point the app imports, such as
 *   `c15t/next` or `@c15t/react`
 * @returns The plugin name, such as `c15t/postcss-tailwind3`
 */
export const tailwind3PostcssPluginName = function tailwind3PostcssPluginName(
	importPath: string
): string {
	const segments = importPath.split('/');
	const packageName = importPath.startsWith('@')
		? segments.slice(0, 2).join('/')
		: segments[0];
	return `${packageName}/postcss-tailwind3`;
};

/**
 * PostCSS config files, in `postcss-load-config`'s search order (Vite),
 * plus `postcss.config.json`, which Next.js also reads. Both loaders check a
 * `postcss` field in `package.json` first.
 */
const POSTCSS_CONFIG_CANDIDATES = [
	'.postcssrc',
	'.postcssrc.json',
	'.postcssrc.yaml',
	'.postcssrc.yml',
	'.postcssrc.ts',
	'.postcssrc.cts',
	'.postcssrc.js',
	'.postcssrc.cjs',
	'.postcssrc.mjs',
	'postcss.config.ts',
	'postcss.config.cts',
	'postcss.config.mts',
	'postcss.config.js',
	'postcss.config.cjs',
	'postcss.config.mjs',
	'postcss.config.json',
] as const;

const JSON_CONFIGS = new Set([
	'.postcssrc',
	'.postcssrc.json',
	'postcss.config.json',
]);

export type EnsureTailwind3PostcssPluginResult =
	| { status: 'present' | 'added'; filePath: string }
	| { status: 'manual' | 'config-ignored'; filePath: string | null };

/**
 * Whether a `tailwindcss` dependency range targets Tailwind 3.
 *
 * @param version - The range from package.json, or null without Tailwind
 * @returns True for `3.x`, `^3.x` and `~3.x` ranges
 */
export const isTailwindV3 = function isTailwindV3(
	version: string | null
): boolean {
	return (
		version !== null && version !== undefined && /^(?:\^|~)?3/u.test(version)
	);
};

/**
 * Put `entry` in front of the match at `index`. A match that starts its line
 * gets the entry on a line of its own with the same indent.
 */
const insertBefore = function insertBefore(
	content: string,
	index: number,
	entry: string
): string {
	const lineStart = content.lastIndexOf('\n', index - 1) + 1;
	const indent = content.slice(lineStart, index);
	const insertion = /^\s*$/u.test(indent)
		? `${entry},\n${indent}`
		: `${entry}, `;

	return `${content.slice(0, index)}${insertion}${content.slice(index)}`;
};

/** A plugin entry and the text that loads the c15t plugin the same way. */
interface PluginEntry {
	name: string;
	node: ts.Node;
	c15tEntry: string;
}

const stringText = function stringText(node: ts.Node): string | undefined {
	return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
		? node.text
		: undefined;
};

/** The quote character a string literal node was written with. */
const quoteOf = function quoteOf(
	node: ts.Node,
	sourceFile: ts.SourceFile
): string {
	return sourceFile.text[node.getStart(sourceFile)] === '"' ? '"' : "'";
};

/**
 * The module a `plugins` array element loads: `'name'`, `['name', options]`,
 * `require('name')` or `require('name')(options)`. Undefined for anything
 * else, such as an imported binding.
 */
const arrayEntry = function arrayEntry(
	element: ts.Expression,
	sourceFile: ts.SourceFile,
	pluginName: string
): PluginEntry | undefined {
	const name = stringText(element);
	if (name !== undefined) {
		const quote = quoteOf(element, sourceFile);
		return {
			c15tEntry: `${quote}${pluginName}${quote}`,
			name,
			node: element,
		};
	}

	// A `[name, options]` tuple: the c15t plugin goes before the whole tuple.
	if (ts.isArrayLiteralExpression(element)) {
		const [head] = element.elements;
		const tupleName = head ? stringText(head) : undefined;
		if (head && tupleName !== undefined) {
			const quote = quoteOf(head, sourceFile);
			return {
				c15tEntry: `${quote}${pluginName}${quote}`,
				name: tupleName,
				node: element,
			};
		}
		return undefined;
	}

	if (!ts.isCallExpression(element)) {
		return undefined;
	}

	// `require('name')(options)` loads the same module as `require('name')`.
	if (ts.isCallExpression(element.expression)) {
		const inner = arrayEntry(element.expression, sourceFile, pluginName);
		return inner && { ...inner, node: element };
	}

	const [argument] = element.arguments;
	const requiredName = argument ? stringText(argument) : undefined;
	if (
		!ts.isIdentifier(element.expression) ||
		element.expression.text !== 'require' ||
		!argument ||
		requiredName === undefined
	) {
		return undefined;
	}
	const quote = quoteOf(argument, sourceFile);
	return {
		c15tEntry: `require(${quote}${pluginName}${quote})`,
		name: requiredName,
		node: element,
	};
};

/** The module a `plugins` object key loads, such as `tailwindcss: {}`. */
const objectEntry = function objectEntry(
	property: ts.ObjectLiteralElementLike,
	sourceFile: ts.SourceFile,
	isJson: boolean,
	pluginName: string
): PluginEntry | undefined {
	if (!ts.isPropertyAssignment(property)) {
		return undefined;
	}
	const { name } = property;
	let quote = "'";
	if (isJson) {
		quote = '"';
	} else if (ts.isStringLiteral(name)) {
		quote = quoteOf(name, sourceFile);
	}
	const keyName =
		ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined;
	return keyName === undefined
		? undefined
		: {
				c15tEntry: `${quote}${pluginName}${quote}: {}`,
				name: keyName,
				node: property,
			};
};

/**
 * Every `plugins` array or object in the config. Walking the syntax tree
 * skips comments and strings, so a commented-out example is never edited
 * or taken for the active configuration.
 */
const findPluginLists = function findPluginLists(
	sourceFile: ts.SourceFile
): (ts.ArrayLiteralExpression | ts.ObjectLiteralExpression)[] {
	const lists: (ts.ArrayLiteralExpression | ts.ObjectLiteralExpression)[] = [];
	const visit = (node: ts.Node): void => {
		if (
			ts.isPropertyAssignment(node) &&
			(ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
			node.name.text === 'plugins' &&
			(ts.isArrayLiteralExpression(node.initializer) ||
				ts.isObjectLiteralExpression(node.initializer))
		) {
			lists.push(node.initializer);
			return;
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return lists;
};

const scriptKindFor = function scriptKindFor(fileName: string): ts.ScriptKind {
	return /\.[mc]?ts$/u.test(fileName) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
};

type PostcssConfigEdit =
	| { status: 'present' }
	| { status: 'added'; content: string }
	| { status: 'manual' };

/**
 * Add the c15t plugin in front of `tailwindcss` in a PostCSS config.
 *
 * @param content - The config file's source
 * @param fileName - The config's file name, which selects JSON, JavaScript
 *   or TypeScript parsing
 * @param pluginName - The plugin name to add, from
 *   {@link tailwind3PostcssPluginName}
 * @returns `present` when the active plugin list already loads a c15t
 *   package's plugin (any `…/postcss-tailwind3`) before `tailwindcss`,
 *   `added` with the updated source, or `manual` when the config has no
 *   single plugin list with a `tailwindcss` entry this can edit
 */
export const addTailwind3PluginToPostcssConfig =
	function addTailwind3PluginToPostcssConfig(
		content: string,
		fileName: string,
		pluginName: string
	): PostcssConfigEdit {
		const isJson = JSON_CONFIGS.has(fileName);
		const sourceFile = isJson
			? ts.parseJsonText(fileName, content)
			: ts.createSourceFile(
					fileName,
					content,
					ts.ScriptTarget.Latest,
					true,
					scriptKindFor(fileName)
				);
		const lists = findPluginLists(sourceFile);
		const [list] = lists;
		if (!list || lists.length > 1) {
			return { status: 'manual' };
		}

		const entries = ts.isArrayLiteralExpression(list)
			? list.elements.map((element) =>
					arrayEntry(element, sourceFile, pluginName)
				)
			: list.properties.map((property) =>
					objectEntry(property, sourceFile, isJson, pluginName)
				);
		const c15tIndex = entries.findIndex(
			(entry) => entry !== undefined && C15T_TAILWIND3_PLUGIN.test(entry.name)
		);
		const tailwindIndex = entries.findIndex(
			(entry) => entry?.name === 'tailwindcss'
		);
		if (c15tIndex >= 0) {
			// PostCSS runs plugins in order, so a c15t entry after tailwindcss
			// does nothing. Moving it is left to the user.
			return {
				status:
					tailwindIndex >= 0 && c15tIndex > tailwindIndex
						? 'manual'
						: 'present',
			};
		}

		const tailwind = entries[tailwindIndex];
		if (!tailwind) {
			return { status: 'manual' };
		}

		return {
			content: insertBefore(
				content,
				tailwind.node.getStart(sourceFile),
				tailwind.c15tEntry
			),
			status: 'added',
		};
	};

/** The parsed package.json, or null when it is missing or invalid. */
const readPackageJson = async function readPackageJson(
	projectRoot: string
): Promise<Record<string, unknown> | null> {
	const packageJsonPath = join(projectRoot, 'package.json');
	await resolvePlannedPath(packageJsonPath);
	if (!existsSync(packageJsonPath)) {
		return null;
	}
	try {
		const packageJson: unknown = JSON.parse(
			await readFile(packageJsonPath, 'utf-8')
		);
		return typeof packageJson === 'object' && packageJson !== null
			? (packageJson as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
};

const hasDependency = function hasDependency(
	packageJson: Record<string, unknown>,
	name: string
): boolean {
	return ['dependencies', 'devDependencies'].some((field) => {
		const dependencies = packageJson[field];
		return (
			typeof dependencies === 'object' &&
			dependencies !== null &&
			name in dependencies
		);
	});
};

/**
 * Make sure a Tailwind 3 app runs c15t's `postcss-tailwind3` plugin before
 * `tailwindcss`. Tailwind 3 rejects c15t's `@layer components` blocks and
 * purges their rules; the plugin flattens them first.
 *
 * @param options.projectRoot - App root to search for a PostCSS config
 * @param options.pluginName - The plugin name to add, from
 *   {@link tailwind3PostcssPluginName}
 * @param options.dryRun - Report the change without writing it
 * @returns `present` or `added` with the config path; `config-ignored`
 *   for Create React App, which never reads a PostCSS config; or `manual`
 *   when no config was found, package.json holds the config, several config
 *   files exist, or the plugin list could not be edited
 */
export const ensureTailwind3PostcssPlugin =
	async function ensureTailwind3PostcssPlugin(options: {
		projectRoot: string;
		pluginName: string;
		dryRun?: boolean;
	}): Promise<EnsureTailwind3PostcssPluginResult> {
		const found: string[] = [];
		for (const candidate of POSTCSS_CONFIG_CANDIDATES) {
			const filePath = join(options.projectRoot, candidate);
			// oxlint-disable-next-line no-await-in-loop -- Check each candidate in order.
			await resolvePlannedPath(filePath);
			if (existsSync(filePath)) {
				found.push(candidate);
			}
		}

		const packageJson = await readPackageJson(options.projectRoot);
		// react-scripts runs Tailwind with `postcss: { config: false }`, so no
		// config file can add the plugin.
		if (packageJson && hasDependency(packageJson, 'react-scripts')) {
			return {
				filePath: found[0] ? join(options.projectRoot, found[0]) : null,
				status: 'config-ignored',
			};
		}

		// A `postcss` field in package.json wins over every file, and with
		// several files the loaders disagree on which one runs. Editing a
		// config the build ignores would report success and change nothing.
		const packageJsonPostcss = packageJson?.postcss;
		if (
			(typeof packageJsonPostcss === 'object' && packageJsonPostcss !== null) ||
			found.length > 1
		) {
			return {
				filePath: join(options.projectRoot, found[0] ?? 'package.json'),
				status: 'manual',
			};
		}

		const [candidate] = found;
		if (!candidate) {
			return { filePath: null, status: 'manual' };
		}

		const filePath = join(options.projectRoot, candidate);
		const content = await readFile(filePath, 'utf-8');
		const edit = addTailwind3PluginToPostcssConfig(
			content,
			candidate,
			options.pluginName
		);
		if (edit.status === 'added' && !options.dryRun) {
			await writeFile(filePath, edit.content, 'utf-8');
		}

		return { filePath, status: edit.status };
	};

/**
 * The manual step for configs this module cannot edit.
 *
 * @param pluginName - The plugin name, from {@link tailwind3PostcssPluginName}
 * @returns The instruction to show
 */
export const tailwind3PostcssInstruction = function tailwind3PostcssInstruction(
	pluginName: string
): string {
	return `Tailwind 3 needs '${pluginName}' before 'tailwindcss' in your PostCSS plugins, for example plugins: { '${pluginName}': {}, tailwindcss: {}, autoprefixer: {} }.`;
};

/**
 * Why Create React App cannot run Tailwind 3 with c15t, and the ways out.
 * react-scripts builds CSS with `postcss: { config: false }`.
 *
 * @param pluginName - The plugin name, from {@link tailwind3PostcssPluginName}
 * @returns The warning to show
 */
export const tailwind3CreateReactAppWarning =
	function tailwind3CreateReactAppWarning(pluginName: string): string {
		return `Create React App ignores PostCSS config files, so Tailwind 3 cannot run '${pluginName}' and the build fails on c15t's dialog stylesheet. Add the plugin before 'tailwindcss' through CRACO, eject, or move the app to Vite.`;
	};
