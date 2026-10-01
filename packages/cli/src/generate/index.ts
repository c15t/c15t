import { generateAstroBoilerplate } from './astro';
import { getInstallSpecifier } from './dependencies';
import { generateJavaScriptBoilerplate } from './javascript';
import { generateReactBoilerplate } from './react';
import { SCRIPT_SNIPPETS } from './scripts';
import { generateSolidBoilerplate } from './solid';
import { generateSvelteBoilerplate } from './svelte';
import { generateTanStackStartBoilerplate } from './tanstack-start';
import type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
} from './types';
import { generateVueBoilerplate } from './vue';

export type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
} from './types';
export { getInstallSpecifier, packageTag } from './dependencies';

/** Explicit inputs for standalone v3 generation in another CLI. */
export interface GenerateOptions {
	framework: BoilerplateFramework;
	mode: 'offline' | 'hosted';
	backendURL?: string;
	scripts?: string[];
	/** Relative destination inside the application. Defaults to src/consent. */
	output?: string;
}

/** A filesystem-free plan. The host owns validation against existing files and writes. */
export interface GenerationPlan {
	files: Record<string, string>;
	/** Registry installation arguments, including @alpha for c15t packages. */
	dependencies: string[];
	instructions: string[];
}

const validateOptions = (options: BoilerplateOptions): BoilerplateOptions => {
	if (options.mode !== 'hosted' && options.mode !== 'offline') {
		throw new Error('Choose hosted or offline mode.');
	}
	if (options.mode === 'hosted') {
		const url = new URL(options.backendURL ?? '');
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			throw new Error(
				'Hosted generation requires an HTTP or HTTPS backend URL.'
			);
		}
		if (url.username || url.password) {
			throw new Error('Use a backend URL without embedded credentials.');
		}
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
	return { ...options, scripts };
};

/**
 * Generate v3 integration files without filesystem, terminal, or network access.
 * @param options Explicit framework, storage mode, backend URL, and integrations.
 * @returns Relative file contents, bare dependency names, and wiring instructions.
 * @throws {Error} When a framework, mode, backend URL, or integration is invalid.
 * @example
 * const template = generateBoilerplateTemplate({
 *   framework: 'react', mode: 'hosted',
 *   backendURL: 'https://consent.example.com', scripts: ['google-tag'],
 * });
 */
export const generateBoilerplateTemplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const validatedOptions = validateOptions(options);

	switch (options.framework) {
		case 'next-app':
		case 'next-pages':
		case 'react':
			return generateReactBoilerplate(validatedOptions);
		case 'javascript':
			return generateJavaScriptBoilerplate(validatedOptions);
		case 'vue':
		case 'nuxt':
			return generateVueBoilerplate(validatedOptions);
		case 'svelte':
		case 'sveltekit':
			return generateSvelteBoilerplate(validatedOptions);
		case 'astro':
			return generateAstroBoilerplate(validatedOptions);
		case 'solid':
			return generateSolidBoilerplate(validatedOptions);
		case 'tanstack-start':
			return generateTanStackStartBoilerplate(validatedOptions);
		default:
			throw new Error('Unknown boilerplate framework.');
	}
};

/**
 * Create a standalone integration plan with alpha installation arguments.
 * @param options Explicit framework and consent configuration.
 * @returns Files relative to the app, including a README with wiring instructions.
 * @throws {Error} When inputs are invalid or the output directory escapes the application.
 */
export const generate = (options: GenerateOptions): GenerationPlan => {
	const output = options.output ?? 'src/consent';
	if (
		!output ||
		output.startsWith('/') ||
		output.includes('\\') ||
		output.includes(':') ||
		output.split('/').includes('..')
	) {
		throw new Error(
			'Output must be a relative directory inside the application.'
		);
	}
	const template = generateBoilerplateTemplate({
		backendURL: options.backendURL,
		framework: options.framework,
		mode: options.mode,
		scripts: options.scripts ?? [],
	});
	const files: Record<string, string> = {};
	for (const name of Object.keys(template.files)) {
		files[`${output}/${name}`] = template.files[name] ?? '';
	}
	const dependencies = template.dependencies.map(getInstallSpecifier);
	const instructions = template.instructions.map((instruction) =>
		instruction.replaceAll('{{output}}', output)
	);
	instructions.push(`Install dependencies: ${dependencies.join(' ')}.`);
	files[`${output}/README.md`] =
		`# c15t ${options.framework} integration\n\n${instructions.join('\n\n')}\n`;
	return { dependencies, files, instructions };
};

const readFramework = (framework: string): BoilerplateFramework => {
	switch (framework) {
		case 'next-app':
		case 'next-pages':
		case 'react':
		case 'javascript':
		case 'tanstack-start':
		case 'vue':
		case 'nuxt':
		case 'svelte':
		case 'sveltekit':
		case 'solid':
		case 'astro':
			return framework;
		default:
			throw new Error(`Unknown framework: ${framework}`);
	}
};

const readGenerationFlag = (
	args: string[],
	index: number,
	seenFlags: string[]
): string => {
	const argument = args[index] ?? '';
	if (
		!['--framework', '--backend-url', '--scripts', '--output'].includes(
			argument
		)
	) {
		throw new Error(`Unsupported generation flag: ${argument}`);
	}
	if (seenFlags.includes(argument)) {
		throw new Error(`Supply ${argument} only once.`);
	}
	seenFlags.push(argument);
	const value = args[index + 1] ?? '';
	if (!value || value.startsWith('--')) {
		throw new Error(`Missing value for ${argument}`);
	}
	return value;
};

/**
 * Parse standalone generation arguments with defaults supplied by a host CLI.
 * @param args Arguments after `generate`. Explicit arguments override host defaults.
 * @param defaults Framework, mode, backend URL, integrations, and output from the host.
 * @returns Explicit generation options. Backend and output validation runs during generation.
 * @throws {Error} When arguments are missing, conflicting, or unsupported.
 * @example
 * const options = parseGenerateOptions(['hosted', '--framework', 'react',
 *   '--backend-url', 'https://consent.example.com']);
 */
export const parseGenerateOptions = (
	args: string[],
	defaults: Partial<GenerateOptions> = {}
): GenerateOptions => {
	let mode = '';
	let framework = '';
	let backendURL: string | undefined;
	let output: string | undefined;
	let scripts = defaults.scripts ?? [];
	const seenFlags: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index] ?? '';
		if (!argument.startsWith('-')) {
			if (mode) {
				throw new Error('Supply exactly one mode.');
			}
			mode = argument;
			continue;
		}
		const value = readGenerationFlag(args, index, seenFlags);
		index += 1;
		switch (argument) {
			case '--framework':
				framework = value;
				break;
			case '--backend-url':
				backendURL = value;
				break;
			case '--output':
				output = value;
				break;
			case '--scripts':
				scripts = value
					.split(',')
					.map((script) => script.trim())
					.filter((script) => script.length > 0);
				break;
			default:
				throw new Error(`Unsupported generation flag: ${argument}`);
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
		output: output ?? defaults.output,
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
