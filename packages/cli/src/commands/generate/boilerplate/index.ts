import fs from 'node:fs/promises';
import path from 'node:path';

import { detectFramework } from '../../../context/framework-detection';
import type { CliContext } from '../../../context/types';
import { CliError } from '../../../core/errors';
import { findLayoutFile } from '../../../detection/layout';
import { generateBoilerplateTemplate } from '../../../generate';
import { mergeFile } from '../../../generate/merge';
import {
	boilerplateFrameworks,
	isBoilerplateFramework,
} from '../../../generate/types';
import {
	clearGenerationJournal,
	recoverGeneration,
	saveGenerationJournal,
} from '../../../machines/generate/journal';
import {
	applyFileEdits,
	collectFileEdits,
	describeFileEdits,
	readFile,
	writeFile,
} from '../templates/shared/file-plan';
import { SCRIPT_SNIPPETS } from '../templates/shared/scripts';
import { planBoilerplateDependencies } from './package-source';
import type { BoilerplateFramework, BoilerplateOptions } from './types';

export { boilerplateFrameworks } from '../../../generate/types';

/** Server adapters that give an Astro site on-demand rendering. */
const ASTRO_ADAPTER = /^@astrojs\/(?:cloudflare|netlify|node|vercel)$/u;

/** Whether an Astro project lists a server adapter, so it can render per request. */
const usesAstroAdapter = async (projectRoot: string): Promise<boolean> => {
	try {
		const manifest = JSON.parse(
			await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
		) as Record<string, Record<string, string> | undefined>;
		return [manifest.dependencies, manifest.devDependencies].some(
			(dependencies) =>
				Object.keys(dependencies ?? {}).some((name) => ASTRO_ADAPTER.test(name))
		);
	} catch {
		return false;
	}
};

const resolveFramework = async (
	context: CliContext
): Promise<BoilerplateFramework> => {
	const explicit = context.flags.framework;
	if (typeof explicit === 'string') {
		if (!isBoilerplateFramework(explicit)) {
			throw new CliError('FLAG_INVALID', {
				details: `Unknown framework "${explicit}". Choose: ${boilerplateFrameworks.join(', ')}.`,
			});
		}
		return explicit;
	}
	const detected = context.framework.framework;
	const names: Record<string, BoilerplateFramework> = {
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
	if (detected === 'Astro') {
		return (await usesAstroAdapter(context.projectRoot))
			? 'astro'
			: 'astro-static';
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
	if (
		typeof flags.framework === 'string' &&
		!isBoilerplateFramework(flags.framework)
	) {
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

export { generateBoilerplateTemplate } from '../../../generate';

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

/**
 * Next.js projects created with `--src-dir` keep `app/` and `pages/` under
 * `src/`. The quickstart's other files stay at the project root.
 */
const placeFiles = async (
	projectRoot: string,
	framework: BoilerplateFramework
): Promise<(name: string) => string> => {
	if (framework !== 'next-app' && framework !== 'next-pages') {
		return (name) => name;
	}
	const layout = await findLayoutFile(projectRoot);
	if (!layout?.path.split(path.sep).join('/').startsWith('src/')) {
		return (name) => name;
	}
	return (name) => (/^(?:app|pages)\//u.test(name) ? `src/${name}` : name);
};

/** The file a project already has, or `null`. */
const readExisting = async (file: string): Promise<string | null> => {
	try {
		return await readFile(file, 'utf8');
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return null;
		}
		throw error;
	}
};

/**
 * Plans or writes a framework's quickstart files; never installs registry
 * packages. Existing files are merged where the template says how, such as
 * `.env`, and otherwise replaced only with `--overwrite`.
 */
export const generateBoilerplate = async (context: CliContext) => {
	const inputOptions = readOptions(context);
	const root = context.projectRoot;
	await checkOutputPath(root, path.join(root, 'package.json'));
	await fs.access(path.join(root, 'package.json'));
	const recovered = await recoverGeneration(
		root,
		context.flags.resume === true
	);
	const options: BoilerplateOptions = {
		...inputOptions,
		framework: await resolveFramework(
			recovered
				? { ...context, framework: await detectFramework(root) }
				: context
		),
	};
	let template: ReturnType<typeof generateBoilerplateTemplate>;
	try {
		template = generateBoilerplateTemplate(options);
	} catch (error) {
		throw new CliError('FLAG_INVALID', {
			details: error instanceof Error ? error.message : String(error),
		});
	}
	const dependencyPlan = await planBoilerplateDependencies({
		dependencies: template.dependencies,
		packageSource:
			typeof context.flags['package-source'] === 'string'
				? path.resolve(context.cwd, context.flags['package-source'])
				: undefined,
		projectRoot: root,
	});
	const instructions = [
		...template.instructions,
		...dependencyPlan.instructions,
	];
	const place = await placeFiles(root, options.framework);
	const overwrite = context.flags.overwrite === true;
	const conflicts: string[] = [];
	const { edits } = await collectFileEdits(async () => {
		for (const [templateName, content] of Object.entries(template.files)) {
			const name = place(templateName);
			const destination = path.resolve(root, name);
			// oxlint-disable-next-line no-await-in-loop -- Inspect and record files in deterministic order.
			await checkOutputPath(root, destination);
			// oxlint-disable-next-line no-await-in-loop -- Read each file once, in order.
			const existing = await readExisting(destination);
			const merge = template.merge[templateName];
			let next = content;
			if (existing !== null && merge) {
				try {
					next = mergeFile(existing, content, merge);
				} catch (error) {
					throw new CliError('FILE_CONFLICT', {
						details: `${name}: ${error instanceof Error ? error.message : String(error)}`,
					});
				}
			} else if (existing !== null && existing !== content && !overwrite) {
				conflicts.push(name);
				continue;
			}
			// oxlint-disable-next-line no-await-in-loop -- Record edits in order.
			await writeFile(destination, next);
		}
	});
	if (conflicts.length) {
		throw new CliError('FILE_CONFLICT', {
			details: `${conflicts.join(', ')}. Merge the quickstart into them by hand, or pass --overwrite to replace them.`,
		});
	}
	const plannedEdits = [...edits, ...dependencyPlan.edits];
	const applied =
		!context.flags.plan &&
		!context.flags['dry-run'] &&
		(context.flags.apply === true || context.flags.yes === true);
	if (applied && plannedEdits.length) {
		await saveGenerationJournal(root, plannedEdits);
		try {
			await applyFileEdits(plannedEdits);
		} catch (error) {
			if (!(error instanceof AggregateError)) {
				await clearGenerationJournal(root);
			}
			throw error;
		}
		await clearGenerationJournal(root);
	}
	context.logger.success(
		`${applied ? 'Wrote' : 'Planned'} ${edits.length} quickstart file edits for ${options.framework}.`
	);
	for (const edit of plannedEdits) {
		context.logger.message(
			`${edit.before === null ? 'Create' : 'Update'} ${path.relative(root, edit.path)}`
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
		edits: await describeFileEdits(plannedEdits),
		framework: options.framework,
		installSkipped: true,
		instructions,
		mode: options.mode,
		source: dependencyPlan.source,
	};
};
