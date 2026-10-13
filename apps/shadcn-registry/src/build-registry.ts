// oxlint-disable sort-keys -- Item JSON keeps the key order of shadcn's own registry, which reads better than alphabetical.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { registryItemSchema, registrySchema } from 'shadcn/schema';

import type { Base, Framework, RegistryFile, SetupItem, UiItem } from './items';
import {
	c15tRange,
	frameworks,
	itemName,
	setupItems,
	sourceFolderByBase,
	styles,
	uiItems,
} from './items';

export interface BuildOptions {
	/** Absolute path to `apps/shadcn-registry`. */
	appDir: string;
	/** Where `{style}/{name}.json` is served, such as `https://c15t.com/r`. */
	baseUrl: string;
	/** The c15t dependency items install. Defaults to `c15t@` plus {@link c15tRange}. */
	c15tDependency?: string;
}

/** Output files keyed by path under `dist/r`. */
export type RegistryOutput = Map<string, unknown>;

const nextImports: Record<string, string> = {
	'c15t/react': 'c15t/next',
	'c15t/react/headless': 'c15t/next/headless',
};

// Named so the docs and tests can say which specifiers a UI item may use.
export const uiC15tImports = Object.keys(nextImports);

const fromPattern = /(?<start>\bfrom\s+["'])(?<spec>[^"']+)(?<end>["'])/gu;
const sideEffectPattern = /^\s*import\s+["'](?<spec>[^"']+)["']/gmu;

// Every shadcn project already has these.
const providedPackages = new Set(['react', 'react-dom']);

const isC15tSpecifier = (spec: string): boolean =>
	spec === 'c15t' || spec.startsWith('c15t/') || spec.startsWith('@c15t/');

const packageName = (spec: string): string => {
	const parts = spec.split('/');
	return spec.startsWith('@')
		? parts.slice(0, 2).join('/')
		: (parts[0] ?? spec);
};

/** Every module specifier a source file imports or re-exports from. */
export const scanImports = (content: string): string[] => {
	const specifiers = [
		...Array.from(content.matchAll(fromPattern)),
		...Array.from(content.matchAll(sideEffectPattern)),
	].map((match) => match.groups?.spec);
	return [...new Set(specifiers.filter((spec) => spec !== undefined))];
};

/**
 * Turns a React UI source into its Next.js copy. The headless hooks and
 * components are the same modules under `c15t/next`, so only the import
 * paths change.
 *
 * @param content - The React source.
 * @param file - The source path, for error messages.
 * @returns The source with `c15t/react` imports pointing at `c15t/next`.
 * @throws {Error} When the source imports a c15t entry point with no Next.js twin.
 */
export const toNextSource = (content: string, file: string): string =>
	content.replace(
		fromPattern,
		(match: string, start: string, spec: string, end: string) => {
			const next = nextImports[spec];
			if (next) {
				return `${start}${next}${end}`;
			}
			if (isC15tSpecifier(spec)) {
				throw new Error(
					`${file} imports ${spec}. UI items may only import ${uiC15tImports.join(' and ')}.`
				);
			}
			return match;
		}
	);

interface ItemContext {
	appDir: string;
	base: Base;
	c15tDependency: string;
	framework: Framework;
	itemUrl: (name: string) => string;
	style: string;
}

interface ItemDependencies {
	dependencies: string[];
	registryDependencies: string[];
}

interface SourceFile {
	content: string;
	file: string;
}

interface ItemFile {
	path: string;
	type: RegistryFile['type'];
	target?: string;
	content: string;
}

/** One `{style}/{name}.json`, with keys in the order shadcn's own registry uses. */
interface ItemJson {
	$schema: string;
	name: string;
	type: 'registry:block' | 'registry:component';
	title: string;
	description: string;
	dependencies: string[];
	registryDependencies: string[];
	files: ItemFile[];
	envVars?: Record<string, string>;
	docs?: string;
}

const collectDependencies = (
	contents: SourceFile[],
	context: ItemContext
): ItemDependencies => {
	const dependencies = new Set<string>();
	const registryDependencies = new Set<string>();

	for (const { file, content } of contents) {
		for (const spec of scanImports(content)) {
			if (spec.startsWith('@/components/ui/')) {
				const name = spec.slice('@/components/ui/'.length);
				const vendored = path.join(
					context.appDir,
					'vendor',
					context.base,
					'components/ui',
					`${name}.tsx`
				);
				if (!existsSync(vendored)) {
					throw new Error(
						`${file} imports ${spec}, which isn't vendored for ${context.base}. Add it to vendor/${context.base} so check-types covers it.`
					);
				}
				registryDependencies.add(name);
			} else if (spec.startsWith('@/components/c15t/')) {
				const name = spec.slice('@/components/c15t/'.length);
				if (!uiItems.some((item) => item.name === name)) {
					throw new Error(
						`${file} imports ${spec}, which isn't a registry item.`
					);
				}
				registryDependencies.add(
					context.itemUrl(itemName(context.framework, name))
				);
			} else if (spec === '@/lib/utils') {
				registryDependencies.add('utils');
			} else if (spec.startsWith('@/') || spec.startsWith('.')) {
				throw new Error(
					`${file} imports ${spec}. Use @/components/ui, @/components/c15t or @/lib/utils, which shadcn rewrites to the project's aliases.`
				);
			} else if (isC15tSpecifier(spec)) {
				dependencies.add(context.c15tDependency);
			} else if (!providedPackages.has(packageName(spec))) {
				dependencies.add(packageName(spec));
			}
		}
	}

	return {
		dependencies: [...dependencies].sort(),
		registryDependencies: [...registryDependencies].sort(),
	};
};

const filePath = (style: string, file: RegistryFile): string =>
	// With no target, shadcn installs a component at the part of its path
	// after `components/`, inside the project's components alias.
	file.type === 'registry:component'
		? `registry/${style}/components/c15t/${file.source}`
		: `registry/${style}/${file.source}`;

const readSources = (
	item: UiItem | SetupItem,
	context: ItemContext
): (SourceFile & { registryFile: RegistryFile })[] => {
	const isSetup = 'framework' in item;
	const sourceDir = isSetup
		? `registry/setup/${item.framework}`
		: `registry/${sourceFolderByBase[context.base]}`;

	return item.files.map((registryFile) => {
		const file = `${sourceDir}/${registryFile.source}`;
		const raw = readFileSync(path.join(context.appDir, file), 'utf8');
		if (isSetup) {
			return { content: raw, file, registryFile };
		}
		// Converting the React copy too means an import the Next.js copy
		// can't follow fails both builds, not only the Next.js one.
		const next = toNextSource(raw, file);
		const content = context.framework === 'next' ? next : raw;
		return { content, file, registryFile };
	});
};

const buildItem = (
	item: UiItem | SetupItem,
	context: ItemContext
): ItemJson => {
	const isSetup = 'framework' in item;
	const sources = readSources(item, context);
	const { dependencies, registryDependencies } = collectDependencies(
		sources,
		context
	);

	const files = sources.map(({ content, registryFile }): ItemFile => {
		const { target, type } = registryFile;
		const itemPath = filePath(context.style, registryFile);
		return target
			? { path: itemPath, type, target, content }
			: { path: itemPath, type, content };
	});

	const json: ItemJson = {
		$schema: 'https://ui.shadcn.com/schema/registry-item.json',
		name: itemName(context.framework, item.name),
		type: isSetup ? 'registry:block' : 'registry:component',
		title: item.title,
		description: item.description,
		dependencies,
		registryDependencies,
		files,
	};
	if (isSetup && item.envVars) {
		json.envVars = item.envVars;
	}
	if (item.docs) {
		json.docs = item.docs;
	}

	const parsed = registryItemSchema.safeParse(json);
	if (!parsed.success) {
		throw new Error(
			`${context.style}/${json.name}.json doesn't match the shadcn item schema: ${parsed.error.message}`
		);
	}
	// parsed.data reorders keys, so return what was checked as written.
	return json;
};

/**
 * Builds every item for every shadcn style, plus a `registry.json` index
 * per style. Items are identical across styles that share a base. Only
 * their file paths and cross-item URLs change.
 *
 * @param options - The app directory to read sources from and the URL the output is served at.
 * @returns Output files keyed by path under `dist/r`.
 * @throws {Error} When a source imports something the registry can't express, or an item fails shadcn's schema.
 */
export const buildRegistry = (options: BuildOptions): RegistryOutput => {
	const baseUrl = options.baseUrl.replace(/\/+$/u, '');
	const c15tDependency = options.c15tDependency ?? `c15t@${c15tRange}`;
	const output: RegistryOutput = new Map();

	for (const { base, name: style } of styles) {
		const itemUrl = (name: string) => `${baseUrl}/${style}/${name}.json`;
		const items = frameworks.flatMap((framework) => {
			const context = {
				appDir: options.appDir,
				base,
				c15tDependency,
				framework,
				itemUrl,
				style,
			};
			return [
				...uiItems.map((item) => buildItem(item, context)),
				...setupItems
					.filter((item) => item.framework === framework)
					.map((item) => buildItem(item, context)),
			];
		});

		for (const item of items) {
			output.set(`${style}/${item.name}.json`, item);
		}

		const registry = {
			$schema: 'https://ui.shadcn.com/schema/registry.json',
			name: 'c15t',
			homepage: 'https://c15t.com',
			items: items.map(({ $schema: _schema, files, ...item }) => ({
				...item,
				files: files.map(({ content: _content, ...file }) => file),
			})),
		};
		const parsed = registrySchema.safeParse(registry);
		if (!parsed.success) {
			throw new Error(
				`${style}/registry.json doesn't match the shadcn registry schema: ${parsed.error.message}`
			);
		}
		output.set(`${style}/registry.json`, registry);
	}

	return output;
};
