import { generateAstroBoilerplate } from './astro.ts';
import { readBackendURL } from './backend-url.ts';
import { getInstallSpecifier } from './dependencies.ts';
import { generateJavaScriptBoilerplate } from './javascript.ts';
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
} from './types.ts';
import { generateVueBoilerplate } from './vue.ts';

export type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
} from './types.ts';
export { getInstallSpecifier, packageTag } from './dependencies.ts';
export { boilerplateFrameworks } from './types.ts';

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
	/** Registry installation arguments, with c15t packages on the CLI's release line. */
	dependencies: string[];
	instructions: string[];
}

const validateOptions = (options: BoilerplateOptions): BoilerplateOptions => {
	if (options.mode !== 'hosted' && options.mode !== 'offline') {
		throw new Error('Choose hosted or offline mode.');
	}
	if (options.mode === 'hosted') {
		if (!options.backendURL) {
			throw new Error(
				'Hosted generation requires --backend-url or a selected project with a backend URL.'
			);
		}
		readBackendURL(options.backendURL);
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
 * Create a standalone integration plan. Installation arguments pin c15t
 * packages to the release line of the CLI that published this source.
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
	if (!isBoilerplateFramework(framework)) {
		throw new Error(`Unknown framework: ${framework}`);
	}
	return framework;
};

const generationFlags = [
	'--mode',
	'--framework',
	'--backend-url',
	'--scripts',
	'--output',
];

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
