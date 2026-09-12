import fs from 'node:fs/promises';
import path from 'node:path';

import { getSelectedInstanceId } from '../../auth';
import type { CliContext } from '../../context/types';
import {
	createControlPlaneClientFromConfig,
	requireInstanceBackendUrl,
	resolveInstance,
} from '../../control-plane';
import { CliError } from '../../core/errors';
import { findLayoutFile } from '../../detection/layout';
import {
	checkInstalledDependencies,
	runPackageManagerInstall,
} from '../../machines/generate/actors/dependencies';
import {
	recoverGeneration,
	saveGenerationJournal,
	clearGenerationJournal,
} from '../../machines/generate/journal';
import { planGenerateFiles } from './options/utils/generate-files';
import type { GenerateMode } from './options/utils/generate-files';
import type { UIStyle, ExpandedTheme } from './prompts';
import {
	applyFileEdits,
	rollbackFileEdits,
} from './templates/shared/file-plan';
import type { FileEdit } from './templates/shared/file-plan';
import { SCRIPT_SNIPPETS } from './templates/shared/scripts';

const stringFlag = (context: CliContext, key: string): string | undefined => {
	const value = context.flags[key];
	return typeof value === 'string' ? value : undefined;
};

const validateMutationFlags = (context: CliContext): void => {
	const { flags } = context;
	if (
		flags.resume &&
		(flags.plan || flags['dry-run'] || !(flags.apply || flags.yes))
	) {
		throw new CliError('FLAG_INVALID', {
			details:
				'--resume restores interrupted file edits and requires --apply or --yes; it cannot be used with --plan or --dry-run.',
		});
	}
	if ((flags.plan || flags['dry-run']) && flags.apply) {
		throw new CliError('FLAG_INVALID', {
			details: '--apply cannot be combined with --plan or --dry-run.',
		});
	}
};

const readMode = (context: CliContext): GenerateMode => {
	const { flags } = context;
	validateMutationFlags(context);
	if (
		stringFlag(context, 'mode') &&
		context.commandArgs[0] &&
		stringFlag(context, 'mode') !== context.commandArgs[0]
	) {
		throw new CliError('FLAG_INVALID', {
			details: 'The positional mode conflicts with --mode.',
		});
	}
	if (flags['backend-url'] && flags.project) {
		throw new CliError('FLAG_INVALID', {
			details: 'Supply either --backend-url or --project, not both.',
		});
	}
	const inputMode = stringFlag(context, 'mode') ?? context.commandArgs[0];
	if (
		!inputMode ||
		!['hosted', 'offline', 'custom', 'c15t', 'self-hosted'].includes(inputMode)
	) {
		throw new CliError('INPUT_REQUIRED', {
			details:
				'Supply a mode: generate hosted, offline, or custom. Hosted setup also needs --backend-url or --project.',
		});
	}
	const mode: GenerateMode =
		inputMode === 'c15t' || inputMode === 'self-hosted'
			? 'hosted'
			: (inputMode as GenerateMode);
	if (mode !== 'hosted' && (flags.project || flags['backend-url'])) {
		throw new CliError('FLAG_INVALID', {
			details: '--backend-url and --project require hosted mode.',
		});
	}
	if (mode !== 'hosted' && flags.env) {
		throw new CliError('FLAG_INVALID', {
			details: '--env requires hosted mode.',
		});
	}
	return mode;
};

const resolveBackendURL = async (
	context: CliContext,
	mode: GenerateMode
): Promise<string | undefined> => {
	let backendURL = stringFlag(context, 'backend-url');
	if (mode === 'hosted' && !backendURL) {
		const query =
			stringFlag(context, 'project') ?? (await getSelectedInstanceId());
		if (!query) {
			throw new CliError('INPUT_REQUIRED', {
				details:
					'Hosted setup requires --backend-url <url> or --project <id|organization/name>.',
			});
		}
		const client = await createControlPlaneClientFromConfig();
		if (!client) {
			throw new CliError('FLAG_INVALID', {
				details: 'Log in before using --project, or supply --backend-url.',
			});
		}
		backendURL = requireInstanceBackendUrl(
			resolveInstance(query, await client.listInstances())
		);
	}
	if (backendURL) {
		let parsed: URL;
		try {
			parsed = new URL(backendURL);
		} catch {
			throw new CliError('FLAG_INVALID', {
				details: '--backend-url must be an absolute HTTP or HTTPS URL.',
			});
		}
		if (!['http:', 'https:'].includes(parsed.protocol)) {
			throw new CliError('FLAG_INVALID', {
				details: '--backend-url must use HTTP or HTTPS.',
			});
		}
	}
	return backendURL;
};

const readUIOptions = (
	context: CliContext
): { uiStyle: UIStyle; theme: ExpandedTheme; selectedScripts: string[] } => {
	const uiStyle = stringFlag(context, 'ui-style') ?? 'prebuilt';
	if (uiStyle !== 'prebuilt' && uiStyle !== 'expanded') {
		throw new CliError('FLAG_INVALID', {
			details: '--ui-style must be prebuilt or expanded.',
		});
	}
	const theme = stringFlag(context, 'theme') ?? 'none';
	if (
		theme !== 'none' &&
		theme !== 'minimal' &&
		theme !== 'dark' &&
		theme !== 'tailwind'
	) {
		throw new CliError('FLAG_INVALID', {
			details: '--theme must be none, minimal, dark, or tailwind.',
		});
	}
	const selectedScripts = [
		...new Set(
			(stringFlag(context, 'scripts') ?? '')
				.split(',')
				.map((value) => value.trim())
				.filter(Boolean)
		),
	];
	const unknownScripts = selectedScripts.filter(
		(script) => !(script in SCRIPT_SNIPPETS)
	);
	if (unknownScripts.length) {
		throw new CliError('FLAG_INVALID', {
			details: `Unknown scripts: ${unknownScripts.join(', ')}. Available: ${Object.keys(SCRIPT_SNIPPETS).join(', ')}`,
		});
	}
	return { selectedScripts, theme, uiStyle };
};

const validateFrameworkOptions = async (
	context: CliContext,
	mode: GenerateMode,
	uiStyle: string,
	theme: string
) => {
	const { flags, framework } = context;
	if (flags.ssr && (framework.pkg !== 'c15t/next' || mode !== 'hosted')) {
		throw new CliError('FLAG_INVALID', {
			details: '--ssr requires a hosted Next.js App Router project.',
		});
	}
	if (
		flags.ssr &&
		(await findLayoutFile(context.projectRoot))?.type !== 'app'
	) {
		throw new CliError('FLAG_INVALID', {
			details: '--ssr requires a Next.js App Router layout.',
		});
	}
	if (flags.proxy && (framework.pkg !== 'c15t/next' || mode !== 'hosted')) {
		throw new CliError('FLAG_INVALID', {
			details: '--proxy requires a hosted Next.js project.',
		});
	}
	if (
		framework.pkg === 'c15t' &&
		(uiStyle !== 'prebuilt' || theme !== 'none')
	) {
		throw new CliError('FLAG_INVALID', {
			details: 'UI style and theme options require a React or Next.js project.',
		});
	}
};

// Keep rollback contents private while exposing reviewable edit metadata.
const describeEdits = async (edits: FileEdit[]) =>
	await Promise.all(
		edits.map(async (edit) => {
			const isEnvironmentFile = (filePath: string) =>
				/^\.env(?:\.|$)/u.test(path.basename(filePath));
			let sensitive = isEnvironmentFile(edit.path);
			if (!sensitive && edit.before !== null) {
				sensitive = isEnvironmentFile(await fs.realpath(edit.path));
			}
			return sensitive
				? {
						operation: edit.before === null ? 'create' : 'update',
						path: edit.path,
						redacted: true,
					}
				: edit;
		})
	);

const applySetup = async (
	context: CliContext,
	edits: Awaited<ReturnType<typeof planGenerateFiles>>['edits'],
	dependencies: string[],
	install: typeof runPackageManagerInstall
) => {
	const { flags } = context;
	await saveGenerationJournal(context.projectRoot, edits);
	try {
		await applyFileEdits(edits);
	} catch (error) {
		if (!(error instanceof AggregateError)) {
			await clearGenerationJournal(context.projectRoot);
		}
		throw error;
	}
	if (!flags['skip-install']) {
		const cancellation = new AbortController();
		const cancel = () => cancellation.abort(new CliError('CANCELLED'));
		process.on('SIGINT', cancel);
		process.on('SIGTERM', cancel);
		try {
			await install(
				context.projectRoot,
				dependencies,
				context.packageManager.name,
				cancellation.signal
			);
			cancellation.signal.throwIfAborted();
		} catch (error) {
			await rollbackFileEdits(edits);
			await clearGenerationJournal(context.projectRoot);
			cancellation.signal.throwIfAborted();
			throw new CliError('CONFIG_INVALID', {
				details: `Dependency installation failed. Generated files were restored. Package-manager changes to manifests, lockfiles or node_modules may remain. ${error instanceof Error ? error.message : String(error)}`,
			});
		} finally {
			process.off('SIGINT', cancel);
			process.off('SIGTERM', cancel);
		}
	}
	await clearGenerationJournal(context.projectRoot);
};

/** Plans or applies setup from explicit inputs, without opening prompts. */
export const generateWithoutPrompts = async (
	context: CliContext,
	services: { install: typeof runPackageManagerInstall } = {
		install: runPackageManagerInstall,
	}
) => {
	const { flags, framework } = context;
	const mode = readMode(context);
	const { uiStyle, theme, selectedScripts } = readUIOptions(context);
	await validateFrameworkOptions(context, mode, uiStyle, theme);
	await fs.access(path.join(context.projectRoot, 'package.json'));
	await recoverGeneration(context.projectRoot, flags.resume === true);
	const backendURL = await resolveBackendURL(context, mode);
	const dependencies = ['c15t'];
	if (selectedScripts.length) {
		dependencies.push('@c15t/scripts');
	}
	if (flags.devtools && framework.pkg === 'c15t') {
		dependencies.push('@c15t/dev-tools');
	}
	const { missing: missingDependencies } = await checkInstalledDependencies({
		dependencies,
		projectRoot: context.projectRoot,
	});
	const plan = await planGenerateFiles({
		backendURL,
		context,
		enableDevTools: flags.devtools === true,
		enableSSR: flags.ssr === true,
		expandedTheme: theme,
		mode,
		proxyNextjs: flags.proxy === true,
		selectedScripts,
		spinner: {
			message: () => undefined,
			start: () => undefined,
			stop: () => undefined,
		} as Parameters<typeof planGenerateFiles>[0]['spinner'],
		uiStyle,
		useEnvFile: flags.env === true,
	});
	const apply =
		!flags.plan &&
		!flags['dry-run'] &&
		(flags.apply === true || flags.yes === true);
	if (apply) {
		await applySetup(
			context,
			plan.edits,
			missingDependencies,
			services.install
		);
		context.logger.success(`Applied ${plan.edits.length} file edits.`);
	} else {
		context.logger.info(
			`Planned ${plan.edits.length} file edits. Pass --apply to write them.`
		);
	}
	return {
		applied: apply,
		dependencies: missingDependencies,
		edits: await describeEdits(plan.edits),
		framework: framework.framework,
		installSkipped: !apply || flags['skip-install'] === true,
		mode,
	};
};
