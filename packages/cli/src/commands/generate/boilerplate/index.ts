import fs from 'node:fs/promises';
import path from 'node:path';

import { detectFramework } from '../../../context/framework-detection';
import type { CliContext } from '../../../context/types';
import { CliError } from '../../../core/errors';
import { findLayoutFile } from '../../../detection/layout';
import {
	clearGenerationJournal,
	recoverGeneration,
	saveGenerationJournal,
} from '../../../machines/generate/journal';
import {
	applyFileEdits,
	collectFileEdits,
	createFile,
} from '../templates/shared/file-plan';
import { SCRIPT_SNIPPETS } from '../templates/shared/scripts';
import { generateJavaScriptBoilerplate } from './javascript';
import { planBoilerplateDependencies } from './package-source';
import { generateReactBoilerplate } from './react';
import type {
	BoilerplateFramework,
	BoilerplateOptions,
	BoilerplateTemplate,
} from './types';

export const boilerplateFrameworks: readonly BoilerplateFramework[] = [
	'next-app',
	'next-pages',
	'react',
	'javascript',
	'tanstack-start',
	'vue',
	'nuxt',
	'svelte',
	'sveltekit',
	'solid',
	'astro',
];

const isFramework = (value: string): value is BoilerplateFramework =>
	boilerplateFrameworks.some((framework) => framework === value);

const resolveFramework = async (
	context: CliContext
): Promise<BoilerplateFramework> => {
	const explicit = context.flags.framework;
	if (typeof explicit === 'string') {
		if (!isFramework(explicit)) {
			throw new CliError('FLAG_INVALID', {
				details: `Unknown framework "${explicit}". Choose: ${boilerplateFrameworks.join(', ')}.`,
			});
		}
		return explicit;
	}
	const detected = context.framework.framework;
	const names: Record<string, BoilerplateFramework> = {
		Astro: 'astro',
		Nuxt: 'nuxt',
		React: 'react',
		Solid: 'solid',
		Svelte: 'svelte',
		SvelteKit: 'sveltekit',
		'TanStack Start': 'tanstack-start',
		'Vite + React': 'react',
		Vue: 'vue',
	};
	if (detected === 'Next.js') {
		const layout = await findLayoutFile(context.projectRoot);
		if (layout) {
			return layout.type === 'app' ? 'next-app' : 'next-pages';
		}
		throw new CliError('INPUT_REQUIRED', {
			details:
				'Specify --framework next-app or next-pages for a project without an existing router layout.',
		});
	}
	if (detected && names[detected]) {
		return names[detected];
	}
	if (detected) {
		throw new CliError('FLAG_INVALID', {
			details: `No boilerplate target for ${detected}. Select an explicit --framework.`,
		});
	}
	return 'javascript';
};

const readBackendURL = (
	flags: CliContext['flags'],
	mode: 'offline' | 'hosted'
): string | undefined => {
	const backendURL =
		typeof flags['backend-url'] === 'string' ? flags['backend-url'] : undefined;
	if (mode === 'hosted') {
		let url: URL;
		try {
			url = new URL(backendURL ?? '');
		} catch {
			throw new CliError('INPUT_REQUIRED', {
				details:
					'Hosted boilerplate requires --backend-url with an absolute HTTP or HTTPS URL.',
			});
		}
		if (
			!['http:', 'https:'].includes(url.protocol) ||
			url.username ||
			url.password
		) {
			throw new CliError('FLAG_INVALID', {
				details:
					'Use an HTTP or HTTPS backend URL without embedded credentials.',
			});
		}
	} else if (backendURL) {
		throw new CliError('FLAG_INVALID', {
			details: '--backend-url requires hosted mode.',
		});
	}
	return backendURL;
};

const validateWriteFlags = (flags: CliContext['flags']): void => {
	if ((flags.plan || flags['dry-run']) && flags.apply) {
		throw new CliError('FLAG_INVALID', {
			details: '--apply cannot be combined with --plan or --dry-run.',
		});
	}
	if (
		flags.resume &&
		(flags.plan || flags['dry-run'] || !(flags.apply || flags.yes))
	) {
		throw new CliError('FLAG_INVALID', {
			details:
				'--resume restores interrupted files and requires --apply or --yes without --plan or --dry-run.',
		});
	}
};

const readOptions = (
	context: CliContext
): Omit<BoilerplateOptions, 'framework'> => {
	const { flags, commandArgs } = context;
	const mode = flags.mode ?? commandArgs[0];
	if (mode !== 'offline' && mode !== 'hosted') {
		throw new CliError('INPUT_REQUIRED', {
			details:
				'Boilerplate requires an explicit mode: generate offline or generate hosted --backend-url <url>.',
		});
	}
	if (flags.mode && commandArgs[0] && flags.mode !== commandArgs[0]) {
		throw new CliError('FLAG_INVALID', {
			details: 'The positional mode conflicts with --mode.',
		});
	}
	validateWriteFlags(flags);
	for (const flag of [
		'env',
		'proxy',
		'ssr',
		'devtools',
		'ui-style',
		'theme',
		'project',
		'debug',
	]) {
		if (flags[flag]) {
			throw new CliError('FLAG_INVALID', {
				details: `--${flag} is not supported for standalone boilerplate. Edit the generated configuration or use the existing setup workflow.`,
			});
		}
	}
	const backendURL = readBackendURL(flags, mode);
	const scripts =
		typeof flags.scripts === 'string'
			? [
					...new Set(
						flags.scripts
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean)
					),
				]
			: [];
	if (scripts.some((script) => !Object.hasOwn(SCRIPT_SNIPPETS, script))) {
		throw new CliError('FLAG_INVALID', {
			details: `Unknown script. Choose: ${Object.keys(SCRIPT_SNIPPETS).join(', ')}.`,
		});
	}
	if (typeof flags.framework === 'string' && !isFramework(flags.framework)) {
		throw new CliError('FLAG_INVALID', {
			details: `Unknown framework "${flags.framework}". Choose: ${boilerplateFrameworks.join(', ')}.`,
		});
	}
	return {
		backendURL,
		mode,
		scripts,
	};
};

/** Produces framework-specific integration files using the local v3 API contract. */
export const generateBoilerplateTemplate = async (
	options: BoilerplateOptions
): Promise<BoilerplateTemplate> => {
	switch (options.framework) {
		case 'next-app':
		case 'next-pages':
		case 'react':
			return generateReactBoilerplate(options);
		case 'javascript':
			return generateJavaScriptBoilerplate(options);
		case 'vue':
		case 'nuxt':
			return (await import('./vue')).generateVueBoilerplate(options);
		case 'svelte':
		case 'sveltekit':
			return (await import('./svelte')).generateSvelteBoilerplate(options);
		case 'astro':
			return (await import('./astro')).generateAstroBoilerplate(options);
		case 'solid':
			return (await import('./solid')).generateSolidBoilerplate(options);
		case 'tanstack-start':
			return (
				await import('./tanstack-start')
			).generateTanStackStartBoilerplate(options);
		default:
			throw new CliError('FLAG_INVALID', {
				details: 'Unknown boilerplate framework.',
			});
	}
};

/** Reject output outside the project, including paths routed through symlinks. */
const checkOutputPath = async (root: string, target: string): Promise<void> => {
	const relative = path.relative(root, target);
	if (
		path.isAbsolute(relative) ||
		relative === '..' ||
		relative.startsWith(`..${path.sep}`)
	) {
		throw new CliError('FLAG_INVALID', {
			details: 'Boilerplate output must be inside the project directory.',
		});
	}
	let current = root;
	for (const segment of relative.split(path.sep).filter(Boolean)) {
		current = path.join(current, segment);
		try {
			// oxlint-disable-next-line no-await-in-loop -- Validate each ancestor before checking its child.
			if ((await fs.lstat(current)).isSymbolicLink()) {
				throw new CliError('FLAG_INVALID', {
					details: `Boilerplate output cannot pass through a symlink: ${current}`,
				});
			}
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'ENOENT'
			) {
				return;
			}
			throw error;
		}
	}
};

/** Plans or creates standalone integration files; never installs registry packages. */
export const generateBoilerplate = async (context: CliContext) => {
	const inputOptions = readOptions(context);
	await checkOutputPath(
		context.projectRoot,
		path.join(context.projectRoot, 'package.json')
	);
	await fs.access(path.join(context.projectRoot, 'package.json'));
	const output = path.resolve(
		context.projectRoot,
		typeof context.flags.output === 'string'
			? context.flags.output
			: 'src/consent'
	);
	await checkOutputPath(context.projectRoot, output);
	const recovered = await recoverGeneration(
		context.projectRoot,
		context.flags.resume === true
	);
	const options: BoilerplateOptions = {
		...inputOptions,
		framework: await resolveFramework(
			recovered
				? { ...context, framework: await detectFramework(context.projectRoot) }
				: context
		),
	};
	const template = await generateBoilerplateTemplate(options);
	const dependencyPlan = await planBoilerplateDependencies({
		dependencies: template.dependencies,
		packageSource:
			typeof context.flags['package-source'] === 'string'
				? path.resolve(context.cwd, context.flags['package-source'])
				: undefined,
		projectRoot: context.projectRoot,
	});
	const relativeOutput =
		path.relative(context.projectRoot, output).split(path.sep).join('/') || '.';
	const instructions = [
		...template.instructions.map((instruction) =>
			instruction.replaceAll('{{output}}', relativeOutput)
		),
		...dependencyPlan.instructions,
	];
	if (options.scripts.length) {
		instructions.push(
			'Replace vendor example IDs in the generated script configuration before running the application.'
		);
	}
	const files = {
		...template.files,
		'README.md': `# c15t ${options.framework} integration\n\nGenerated for the unpublished v3 API.\n\n${instructions.map((instruction, index) => `${index + 1}. ${instruction}`).join('\n\n')}\n`,
	};
	const { edits } = await collectFileEdits(async () => {
		for (const [name, content] of Object.entries(files)) {
			const destination = path.resolve(output, name);
			// oxlint-disable-next-line no-await-in-loop -- Inspect and record files in deterministic order.
			await checkOutputPath(output, destination);
			// oxlint-disable-next-line no-await-in-loop -- Keep the first conflicting file actionable.
			await createFile(destination, content);
		}
	});
	const plannedEdits = [...edits, ...dependencyPlan.edits];
	const applied =
		!context.flags.plan &&
		!context.flags['dry-run'] &&
		(context.flags.apply === true || context.flags.yes === true);
	if (applied && plannedEdits.length) {
		await saveGenerationJournal(context.projectRoot, plannedEdits);
		try {
			await applyFileEdits(plannedEdits);
		} catch (error) {
			if (!(error instanceof AggregateError)) {
				await clearGenerationJournal(context.projectRoot);
			}
			throw error;
		}
		await clearGenerationJournal(context.projectRoot);
	}
	context.logger.success(
		`${applied ? 'Created' : 'Planned'} ${edits.length} boilerplate file edits for ${options.framework}.`
	);
	for (const edit of plannedEdits) {
		context.logger.message(
			`${edit.before === null ? 'Create' : 'Update'} ${path.relative(context.projectRoot, edit.path)}`
		);
	}
	for (const instruction of instructions) {
		context.logger.message(instruction);
	}
	if (!applied) {
		context.logger.info(
			'Pass --apply to write this plan. Dependency installation is a separate step.'
		);
	}
	return {
		applied,
		dependencies: dependencyPlan.dependencies,
		edits: plannedEdits,
		framework: options.framework,
		installSkipped: true,
		instructions,
		mode: options.mode,
		output,
		source: dependencyPlan.source,
	};
};
