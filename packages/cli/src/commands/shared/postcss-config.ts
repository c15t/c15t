import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
	readFile,
	resolvePlannedPath,
	writeFile,
} from '../generate/templates/shared/file-plan';

/** The PostCSS plugin Tailwind 3 apps run so c15t's stylesheets build. */
export const TAILWIND3_POSTCSS_PLUGIN = '@c15t/ui/postcss-tailwind3';

/**
 * Config files `postcss-load-config` reads, in its search order. The
 * `package.json` `postcss` field and YAML configs are left to the user.
 */
const POSTCSS_CONFIG_CANDIDATES = [
	'.postcssrc',
	'.postcssrc.json',
	'.postcssrc.js',
	'.postcssrc.mjs',
	'.postcssrc.cjs',
	'.postcssrc.ts',
	'postcss.config.js',
	'postcss.config.mjs',
	'postcss.config.cjs',
	'postcss.config.ts',
	'postcss.config.mts',
	'postcss.config.cts',
] as const;

const JSON_CONFIGS = new Set(['.postcssrc', '.postcssrc.json']);

/**
 * `tailwindcss` as an entry in a plugin list: an object key
 * (`{ tailwindcss: {} }`), a name string (`['tailwindcss']`) or a
 * `require('tailwindcss')` call (`[require('tailwindcss')]`). Each must
 * follow `{`, `[` or `,`, so `const tw = require('tailwindcss')` and
 * `import tw from 'tailwindcss'` don't match; a config that passes an
 * imported binding gets manual steps. The closing quote right after the
 * name excludes `tailwindcss/nesting`.
 */
const TAILWIND_OBJECT_KEY_RE =
	/(?<=[{,]\s*)(?<quote>['"]?)tailwindcss\k<quote>\s*:/u;
const TAILWIND_REQUIRE_RE =
	/(?<=[[,]\s*)require\(\s*(?<quote>['"])tailwindcss\k<quote>\s*\)/u;
const TAILWIND_STRING_RE = /(?<=[[,]\s*)(?<quote>['"])tailwindcss\k<quote>/u;

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

/**
 * Add the c15t plugin in front of `tailwindcss` in a PostCSS config.
 *
 * @param content - The config file's source
 * @param isJson - Whether the file is JSON, which needs double quotes
 * @returns The updated source, or null when the plugin list has a shape
 *   this cannot edit safely
 */
export const addTailwind3PluginToPostcssConfig =
	function addTailwind3PluginToPostcssConfig(
		content: string,
		isJson: boolean
	): string | null {
		const objectKey = TAILWIND_OBJECT_KEY_RE.exec(content);
		if (objectKey) {
			const quote = isJson ? '"' : (objectKey.groups?.quote ?? '') || "'";
			return insertBefore(
				content,
				objectKey.index,
				`${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote}: {}`
			);
		}

		if (isJson) {
			return null;
		}

		const requireCall = TAILWIND_REQUIRE_RE.exec(content);
		if (requireCall) {
			const quote = requireCall.groups?.quote ?? "'";
			return insertBefore(
				content,
				requireCall.index,
				`require(${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote})`
			);
		}

		const pluginName = TAILWIND_STRING_RE.exec(content);
		if (pluginName) {
			const quote = pluginName.groups?.quote ?? "'";
			return insertBefore(
				content,
				pluginName.index,
				`${quote}${TAILWIND3_POSTCSS_PLUGIN}${quote}`
			);
		}

		return null;
	};

/**
 * Make sure a Tailwind 3 app runs `@c15t/ui/postcss-tailwind3` before
 * `tailwindcss`. Tailwind 3 rejects c15t's `@layer components` blocks and
 * purges their rules; the plugin flattens them first.
 *
 * @param options.projectRoot - App root to search for a PostCSS config
 * @param options.dryRun - Report the change without writing it
 * @returns `present` or `added` with the config path, or `manual` when no
 *   config was found or its plugin list could not be edited
 */
export const ensureTailwind3PostcssPlugin =
	async function ensureTailwind3PostcssPlugin(options: {
		projectRoot: string;
		dryRun?: boolean;
	}): Promise<EnsureTailwind3PostcssPluginResult> {
		for (const candidate of POSTCSS_CONFIG_CANDIDATES) {
			const filePath = join(options.projectRoot, candidate);
			// oxlint-disable-next-line no-await-in-loop -- Check each candidate before following it.
			await resolvePlannedPath(filePath);
			if (!existsSync(filePath)) {
				continue;
			}

			// oxlint-disable-next-line no-await-in-loop -- Stops at the first config found.
			const content = await readFile(filePath, 'utf-8');
			if (content.includes(TAILWIND3_POSTCSS_PLUGIN)) {
				return { filePath, status: 'present' };
			}

			const nextContent = addTailwind3PluginToPostcssConfig(
				content,
				JSON_CONFIGS.has(candidate)
			);
			if (nextContent === null) {
				return { filePath, status: 'manual' };
			}

			if (!options.dryRun) {
				// oxlint-disable-next-line no-await-in-loop -- Stops at the first config found.
				await writeFile(filePath, nextContent, 'utf-8');
			}

			return { filePath, status: 'added' };
		}

		return { filePath: null, status: 'manual' };
	};

/** The manual step for configs this module cannot edit. */
export const TAILWIND3_POSTCSS_INSTRUCTION = `Tailwind 3 needs '${TAILWIND3_POSTCSS_PLUGIN}' before 'tailwindcss' in your PostCSS plugins, for example plugins: ['${TAILWIND3_POSTCSS_PLUGIN}', 'tailwindcss', 'autoprefixer'].`;
