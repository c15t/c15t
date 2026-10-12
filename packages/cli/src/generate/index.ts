import { generateAstroBoilerplate } from './astro.ts';
import { readBackendURL } from './backend-url.ts';
import { getInstallSpecifier } from './dependencies.ts';
import { generateHtmlBoilerplate } from './html.ts';
import { generateJavaScriptBoilerplate } from './javascript.ts';
import { generateNextBoilerplate } from './next.ts';
import { generateReactBoilerplate } from './react.ts';
import { SCRIPT_SNIPPETS } from './scripts.ts';
import { generateSolidBoilerplate } from './solid.ts';
import { generateSvelteBoilerplate } from './svelte.ts';
import { generateTanStackStartBoilerplate } from './tanstack-start.ts';
import { isBoilerplateFramework } from './types.ts';
import type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
	FileMerge,
} from './types.ts';
import { generateVueBoilerplate } from './vue.ts';

export type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
	FileMerge,
} from './types.ts';
export { getInstallSpecifier, packageTag } from './dependencies.ts';
export { mergeFile } from './merge.ts';
export { boilerplateFrameworks } from './types.ts';

/** Explicit inputs for standalone v3 generation in another CLI. */
export interface GenerateOptions {
	framework: BoilerplateFramework;
	mode: 'offline' | 'hosted';
	backendURL?: string;
	scripts?: string[];
}

/** A filesystem-free plan. The host owns validation against existing files and writes. */
export interface GenerationPlan {
	/** Paths relative to the project root, with contents for a project without them. */
	files: Record<string, string>;
	/**
	 * How to apply a file the project already has, with {@link mergeFile}.
	 * Other existing files are replaced only when the user allows it.
	 */
	merge: Record<string, FileMerge>;
	/** Registry installation arguments, with c15t packages on the CLI's release line. */
	dependencies: string[];
	instructions: string[];
}

const validateOptions = (options: BoilerplateOptions): BoilerplateOptions => {
	if (options.mode !== 'hosted' && options.mode !== 'offline') {
		throw new Error('Choose hosted or offline mode.');
	}
	let { backendURL } = options;
	if (options.mode === 'hosted') {
		if (!options.backendURL) {
			throw new Error(
				'Hosted generation requires --backend-url or a selected project with a backend URL.'
			);
		}
		backendURL = readBackendURL(options.backendURL);
	} else if (options.backendURL) {
		throw new Error('A backend URL requires hosted mode.');
	}
	const scripts: string[] = [];
	for (const script of options.scripts) {
		if (!Object.hasOwn(SCRIPT_SNIPPETS, script)) {
			throw new Error(`Unknown script integration: ${script}`);
		}
		if (!scripts.includes(script)) {
			scripts.push(script);
		}
	}
	return { ...options, backendURL, scripts };
};

const generators: Record<
	BoilerplateFramework,
	(options: BoilerplateOptions) => BoilerplateTemplate
> = {
	astro: generateAstroBoilerplate,
	'astro-static': generateAstroBoilerplate,
	html: generateHtmlBoilerplate,
	javascript: generateJavaScriptBoilerplate,
	'next-app': generateNextBoilerplate,
	'next-pages': generateNextBoilerplate,
	nuxt: generateVueBoilerplate,
	react: generateReactBoilerplate,
	solid: generateSolidBoilerplate,
	svelte: generateSvelteBoilerplate,
	sveltekit: generateSvelteBoilerplate,
	'tanstack-start': generateTanStackStartBoilerplate,
	vue: generateVueBoilerplate,
};

/**
 * Generate a framework's quickstart files without filesystem, terminal, or
 * network access. Hosted mode writes the backend URL to `.env` under the
 * framework's public env var; offline mode resolves the policy in the
 * browser and writes no `.env`.
 * @param options Explicit framework, storage mode, backend URL, and integrations.
 * @returns Files relative to the project root, how to merge them into
 * existing files, bare dependency names, and wiring instructions.
 * @throws {Error} When a framework, mode, backend URL, or integration is invalid.
 * @example
 * const template = generateBoilerplateTemplate({
 *   framework: 'react', mode: 'hosted',
 *   backendURL: 'https://your-project.inth.app', scripts: ['posthog'],
 * });
 * template.files['src/consent.tsx'];
 */
export const generateBoilerplateTemplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const validatedOptions = validateOptions(options);
	if (!Object.hasOwn(generators, options.framework)) {
		throw new Error('Unknown boilerplate framework.');
	}
	const template = generators[options.framework](validatedOptions);
	const merge: Record<string, FileMerge> = { ...template.merge };
	if (template.files['.env'] !== undefined) {
		merge['.env'] = { type: 'env' };
	}
	return { ...template, merge };
};

/**
 * Create a standalone integration plan. Installation arguments pin c15t
 * packages to the release line of the CLI that published this source.
 * @param options Explicit framework and consent configuration.
 * @returns Files relative to the project root, merge rules for files the
 * project already has, dependencies, and wiring instructions.
 * @throws {Error} When inputs are invalid.
 */
export const generate = (options: GenerateOptions): GenerationPlan => {
	const template = generateBoilerplateTemplate({
		backendURL: options.backendURL,
		framework: options.framework,
		mode: options.mode,
		scripts: options.scripts ?? [],
	});
	const dependencies = template.dependencies.map(getInstallSpecifier);
	const instructions = [...template.instructions];
	if (dependencies.length) {
		instructions.push(`Install dependencies: ${dependencies.join(' ')}.`);
	}
	return {
		dependencies,
		files: template.files,
		instructions,
		merge: template.merge,
	};
};

const readFramework = (framework: string): BoilerplateFramework => {
	if (!isBoilerplateFramework(framework)) {
		throw new Error(`Unknown framework: ${framework}`);
	}
	return framework;
};

const generationFlags = ['--mode', '--framework', '--backend-url', '--scripts'];

/** One value flag, read from `--flag value` or `--flag=value`. */
interface GenerationFlag {
	flag: string;
	value: string;
	/** Arguments read, so the caller can skip a separate value. */
	length: 1 | 2;
}

const readGenerationFlag = (
	args: string[],
	index: number,
	seenFlags: string[]
): GenerationFlag => {
	const argument = args[index] ?? '';
	const separator = argument.indexOf('=');
	const flag = separator < 0 ? argument : argument.slice(0, separator);
	if (flag === '--output') {
		throw new Error(
			'--output was removed. Generation writes the quickstart files at their framework paths.'
		);
	}
	if (!generationFlags.includes(flag)) {
		throw new Error(`Unsupported generation flag: ${flag}`);
	}
	if (seenFlags.includes(flag)) {
		throw new Error(`Supply ${flag} only once.`);
	}
	seenFlags.push(flag);
	if (separator >= 0) {
		const value = argument.slice(separator + 1);
		if (!value) {
			throw new Error(`Missing value for ${flag}`);
		}
		return { flag, length: 1, value };
	}
	const value = args[index + 1] ?? '';
	if (!value || value.startsWith('--')) {
		throw new Error(`Missing value for ${flag}`);
	}
	return { flag, length: 2, value };
};

const readMode = (currentMode: string, inputMode: string): string => {
	if (currentMode) {
		throw new Error('Supply exactly one mode.');
	}
	return inputMode;
};

/**
 * Parse standalone generation arguments with defaults supplied by a host CLI.
 * @param args Arguments after `generate`. Explicit arguments override host
 * defaults. Value flags accept `--flag value` and `--flag=value`.
 * @param defaults Framework, mode, backend URL, and integrations from the host.
 * @returns Explicit generation options. Backend validation runs during generation.
 * @throws {Error} When arguments are missing, conflicting, or unsupported.
 * @example
 * const options = parseGenerateOptions(['hosted', '--framework', 'react',
 *   '--backend-url', 'https://your-project.inth.app']);
 */
export const parseGenerateOptions = (
	args: string[],
	defaults: Partial<GenerateOptions> = {}
): GenerateOptions => {
	let mode = '';
	let framework = '';
	let backendURL: string | undefined;
	let scripts = defaults.scripts ?? [];
	const seenFlags: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index] ?? '';
		if (!argument.startsWith('-')) {
			mode = readMode(mode, argument);
			continue;
		}
		const { flag, length, value } = readGenerationFlag(args, index, seenFlags);
		index += length - 1;
		switch (flag) {
			case '--mode':
				mode = readMode(mode, value);
				break;
			case '--framework':
				framework = value;
				break;
			case '--backend-url':
				backendURL = value;
				break;
			case '--scripts':
				scripts = value
					.split(',')
					.map((script) => script.trim())
					.filter((script) => script.length > 0);
				break;
			default:
				throw new Error(`Unsupported generation flag: ${flag}`);
		}
	}
	mode ||= defaults.mode ?? '';
	if (mode !== 'hosted' && mode !== 'offline') {
		throw new Error('Supply hosted or offline mode.');
	}
	return {
		backendURL:
			backendURL ?? (mode === 'hosted' ? defaults.backendURL : undefined),
		framework: readFramework(framework || defaults.framework || ''),
		mode,
		scripts,
	};
};

/**
 * Run standalone generation from arguments forwarded by a host CLI.
 * @param args Arguments after `generate`. Explicit arguments override host defaults.
 * @param defaults Framework and configuration supplied by the host.
 * @returns A generation plan without installing dependencies or writing files.
 * @throws {Error} When arguments or configuration are invalid.
 */
export const runGenerateCommand = (
	args: string[],
	defaults: Partial<GenerateOptions> = {}
): GenerationPlan => generate(parseGenerateOptions(args, defaults));
