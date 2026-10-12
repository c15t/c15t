import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import {
	dependenciesOf,
	isAtLeastMajor,
	readPackageJson,
	tailwindMajor,
} from './manifest';
import { createCodemodSession } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	importedModuleOf,
	isNodeRequire,
	lineIndent,
	localDeclarationsOf,
	propertyKey,
	unwrapExpression,
} from './source-edits';

const CONFIG_FILES = [
	'postcss.config.js',
	'postcss.config.cjs',
	'postcss.config.mjs',
	'postcss.config.ts',
];

const PLUGIN_SUFFIX = '/postcss-tailwind3';

/**
 * The plugin entry for the c15t package the app installs: the umbrella
 * `c15t` from v3 on, otherwise the scoped framework package. When neither
 * the `c15t` range nor the installed package tells its version, the scoped
 * package wins, and `c15t` is used only when no scoped package is listed.
 */
const pluginFor = async function pluginFor(
	projectRoot: string,
	dependencies: Record<string, string>
): Promise<string | null> {
	const umbrella = dependencies.c15t;
	const v3 =
		umbrella === undefined
			? false
			: await isAtLeastMajor(projectRoot, 'c15t', umbrella, 3);
	if (v3 === true) {
		return `c15t${PLUGIN_SUFFIX}`;
	}
	for (const name of ['@c15t/nextjs', '@c15t/react', '@c15t/tanstack-start']) {
		if (dependencies[name] !== undefined) {
			return `${name}${PLUGIN_SUFFIX}`;
		}
	}
	return v3 === null ? `c15t${PLUGIN_SUFFIX}` : null;
};

/** `plugins` values in the file, whatever object holds them. */
const pluginLists = function pluginLists(
	sourceFile: TsMorphTypes.SourceFile
): TsMorphTypes.Node[] {
	return sourceFile
		.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
		.filter((property) => propertyKey(property) === 'plugins')
		.map((property) => unwrapExpression(property.getInitializerOrThrow()));
};

/** A c15t PostCSS plugin entry: `c15t/…` or a scoped `@c15t/…/…` one. */
const PLUGIN_MODULE = /^(?:c15t|@c15t\/[^/]+)\/postcss-tailwind3$/u;

/**
 * The module an array-form plugin entry loads: a string, the first item of
 * a `[name, options]` tuple, a `require()` call, or a binding imported or
 * required from it, called or not.
 */
const entryModuleOf = function entryModuleOf(
	entry: TsMorphTypes.Node,
	depth = 0
): string | undefined {
	const node = unwrapExpression(entry);
	if (depth > 8) {
		return undefined;
	}
	if (
		Node.isStringLiteral(node) ||
		Node.isNoSubstitutionTemplateLiteral(node)
	) {
		return node.getLiteralValue();
	}
	if (Node.isArrayLiteralExpression(node)) {
		const [name] = node.getElements();
		return name && entryModuleOf(name, depth + 1);
	}
	if (Node.isPropertyAccessExpression(node)) {
		return entryModuleOf(node.getExpression(), depth + 1);
	}
	if (Node.isCallExpression(node)) {
		const callee = node.getExpression();
		const [argument] = node.getArguments();
		return Node.isIdentifier(callee) && isNodeRequire(callee) && argument
			? entryModuleOf(argument, depth + 1)
			: entryModuleOf(callee, depth + 1);
	}
	if (!Node.isIdentifier(node)) {
		return undefined;
	}
	for (const declaration of localDeclarationsOf(node)) {
		const imported = importedModuleOf(declaration);
		if (imported !== undefined) {
			return imported;
		}
		const initializer = Node.isVariableDeclaration(declaration)
			? declaration.getInitializer()
			: undefined;
		if (initializer) {
			return entryModuleOf(initializer, depth + 1);
		}
	}
	return undefined;
};

/** Whether an array-form `plugins` list already has a c15t plugin. */
const hasPluginEntry = function hasPluginEntry(
	list: TsMorphTypes.Node
): boolean {
	return (
		Node.isArrayLiteralExpression(list) &&
		list
			.getElements()
			.some((entry) => PLUGIN_MODULE.test(entryModuleOf(entry) ?? ''))
	);
};

type Outcome =
	| { kind: 'added' }
	| { kind: 'present' }
	| { kind: 'skipped'; reason: string };

const addPlugin = function addPlugin(
	sourceFile: TsMorphTypes.SourceFile,
	plugin: string
): Outcome {
	const lists = pluginLists(sourceFile);
	const objects = lists.filter((list) => Node.isObjectLiteralExpression(list));
	for (const object of objects) {
		if (!Node.isObjectLiteralExpression(object)) {
			continue;
		}
		const keys = object.getProperties().map(propertyKey);
		if (keys.some((key) => key?.endsWith(PLUGIN_SUFFIX))) {
			return { kind: 'present' };
		}
		const tailwind = object
			.getProperties()
			.find((property) => propertyKey(property) === 'tailwindcss');
		if (!tailwind) {
			continue;
		}
		const quote = sourceFile.getFullText().includes('"tailwindcss"')
			? '"'
			: "'";
		const entry = `${quote}${plugin}${quote}: {},`;
		const text = sourceFile.getFullText();
		const lineStart = text.lastIndexOf('\n', tailwind.getStart() - 1) + 1;
		const ownLine = text.slice(lineStart, tailwind.getStart()).trim() === '';
		sourceFile.insertText(
			tailwind.getStart(),
			ownLine ? `${entry}\n${lineIndent(tailwind)}` : `${entry} `
		);
		return { kind: 'added' };
	}
	if (lists.some(hasPluginEntry)) {
		return { kind: 'present' };
	}
	if (lists.some((list) => Node.isArrayLiteralExpression(list))) {
		return {
			kind: 'skipped',
			reason: `plugins is an array. Add ${plugin} before tailwindcss by hand, or switch to the object form.`,
		};
	}
	return {
		kind: 'skipped',
		reason: `No object-form plugins with a tailwindcss key. Add '${plugin}': {} before tailwindcss by hand.`,
	};
};

/**
 * Adds the c15t Tailwind CSS 3 PostCSS plugin before `tailwindcss` in an
 * object-form `postcss.config` when the app depends on Tailwind CSS 3 and
 * c15t. Array-form and unusual configs are reported as warnings and left
 * unchanged.
 *
 * @param options - Codemod execution options.
 * @returns The changed config, or a warning explaining why it was skipped.
 */
export const runPostcssTailwind3Codemod =
	async function runPostcssTailwind3Codemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		const result: CodemodRunResult = {
			changedFiles: [],
			errors: [],
			totalFiles: 0,
			warnings: [],
		};
		const dependencies = dependenciesOf(
			await readPackageJson(options.projectRoot)
		);
		const plugin = await pluginFor(options.projectRoot, dependencies);
		const specifier = dependencies.tailwindcss;
		if (!plugin || specifier === undefined) {
			return result;
		}
		const major = await tailwindMajor(options.projectRoot, specifier);
		if (major === null) {
			result.warnings?.push({
				filePath: options.projectRoot,
				message: `Could not tell the Tailwind CSS version from '${specifier}'. If the app uses Tailwind CSS 3, add '${plugin}': {} before tailwindcss in your PostCSS config.`,
			});
			return result;
		}
		if (major !== 3) {
			return result;
		}
		const configPath = CONFIG_FILES.map((file) =>
			join(options.projectRoot, file)
		).find((path) => existsSync(path));
		if (!configPath) {
			result.warnings?.push({
				filePath: options.projectRoot,
				message: `Tailwind CSS 3 found but no postcss.config.{js,cjs,mjs,ts}. Add '${plugin}': {} before tailwindcss in your PostCSS config.`,
			});
			return result;
		}
		result.totalFiles = 1;
		try {
			const { project } =
				options.session ?? (await createCodemodSession(options.projectRoot));
			const sourceFile =
				project.getSourceFile(configPath) ??
				project.addSourceFileAtPath(configPath);
			const before = sourceFile.getFullText();
			const outcome = addPlugin(sourceFile, plugin);
			if (outcome.kind === 'skipped') {
				result.warnings?.push({
					filePath: configPath,
					message: outcome.reason,
				});
				return result;
			}
			if (outcome.kind === 'present') {
				return result;
			}
			if (!options.dryRun) {
				await sourceFile.save();
			}
			result.changedFiles.push({
				after: sourceFile.getFullText(),
				before,
				filePath: configPath,
				operations: 1,
				summaries: [`added ${plugin} before tailwindcss`],
			});
		} catch (error) {
			result.errors.push({
				error: error instanceof Error ? error.message : String(error),
				filePath: configPath,
			});
		}
		return result;
	};
