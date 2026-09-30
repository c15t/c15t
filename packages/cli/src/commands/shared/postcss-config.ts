import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { ts } from 'ts-morph';

import {
	readFile,
	resolvePlannedPath,
	writeFile,
} from '../generate/templates/shared/file-plan';

/** The PostCSS plugin Tailwind 3 apps run so c15t's stylesheets build. */
export const TAILWIND3_POSTCSS_PLUGIN = '@c15t/ui/postcss-tailwind3';

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
	| { status: 'manual'; filePath: string | null };

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
 * Whether setup should wire up the Tailwind 3 plugin: a React or Next.js app
 * (the targets that import c15t's prebuilt stylesheet) on Tailwind 3.
 *
 * @param framework - The detected framework, or null
 * @returns True when the app needs `@c15t/ui/postcss-tailwind3`
 */
export const needsTailwind3PostcssPlugin = function needsTailwind3PostcssPlugin(
	framework: { pkg: string; tailwindVersion: string | null } | null
): boolean {
	return (
		(framework?.pkg === 'c15t/react' || framework?.pkg === 'c15t/next') &&
		isTailwindV3(framework.tailwindVersion)
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
	sourceFile: ts.SourceFile
): PluginEntry | undefined {
	const name = stringText(element);
	if (name !== undefined) {
		const quote = quoteOf(element, sourceFile);
		return {
			c15tEntry: `${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote}`,
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
				c15tEntry: `${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote}`,
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
		const inner = arrayEntry(element.expression, sourceFile);
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
		c15tEntry: `require(${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote})`,
		name: requiredName,
		node: element,
	};
};

/** The module a `plugins` object key loads, such as `tailwindcss: {}`. */
const objectEntry = function objectEntry(
	property: ts.ObjectLiteralElementLike,
	sourceFile: ts.SourceFile,
	isJson: boolean
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
				c15tEntry: `${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote}: {}`,
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
 * @returns `present` when the active plugin list already loads the c15t
 *   plugin before `tailwindcss`, `added` with the updated source, or `manual` when the config has
 *   no single plugin list with a `tailwindcss` entry this can edit
 */
export const addTailwind3PluginToPostcssConfig =
	function addTailwind3PluginToPostcssConfig(
		content: string,
		fileName: string
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
			? list.elements.map((element) => arrayEntry(element, sourceFile))
			: list.properties.map((property) =>
					objectEntry(property, sourceFile, isJson)
				);
		const c15tIndex = entries.findIndex(
			(entry) => entry?.name === TAILWIND3_POSTCSS_PLUGIN
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

/** Whether package.json carries a `postcss` config object. */
const hasPackageJsonPostcssConfig = async function hasPackageJsonPostcssConfig(
	projectRoot: string
): Promise<boolean> {
	const packageJsonPath = join(projectRoot, 'package.json');
	await resolvePlannedPath(packageJsonPath);
	if (!existsSync(packageJsonPath)) {
		return false;
	}
	try {
		const packageJson: unknown = JSON.parse(
			await readFile(packageJsonPath, 'utf-8')
		);
		return (
			typeof packageJson === 'object' &&
			packageJson !== null &&
			'postcss' in packageJson &&
			typeof packageJson.postcss === 'object' &&
			packageJson.postcss !== null
		);
	} catch {
		return false;
	}
};

/**
 * Make sure a Tailwind 3 app runs `@c15t/ui/postcss-tailwind3` before
 * `tailwindcss`. Tailwind 3 rejects c15t's `@layer components` blocks and
 * purges their rules; the plugin flattens them first.
 *
 * @param options.projectRoot - App root to search for a PostCSS config
 * @param options.dryRun - Report the change without writing it
 * @returns `present` or `added` with the config path, or `manual` when no
 *   config was found, package.json holds the config, several config files
 *   exist, or the plugin list could not be edited
 */
export const ensureTailwind3PostcssPlugin =
	async function ensureTailwind3PostcssPlugin(options: {
		projectRoot: string;
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

		// A `postcss` field in package.json wins over every file, and with
		// several files the loaders disagree on which one runs. Editing a
		// config the build ignores would report success and change nothing.
		if (
			(await hasPackageJsonPostcssConfig(options.projectRoot)) ||
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
		const edit = addTailwind3PluginToPostcssConfig(content, candidate);
		if (edit.status === 'added' && !options.dryRun) {
			await writeFile(filePath, edit.content, 'utf-8');
		}

		return { filePath, status: edit.status };
	};

/** The manual step for configs this module cannot edit. */
export const TAILWIND3_POSTCSS_INSTRUCTION = `Tailwind 3 needs '${TAILWIND3_POSTCSS_PLUGIN}' before 'tailwindcss' in your PostCSS plugins, for example plugins: { '${TAILWIND3_POSTCSS_PLUGIN}': {}, tailwindcss: {}, autoprefixer: {} }. Install @c15t/ui as a direct dependency so PostCSS can load it.`;
