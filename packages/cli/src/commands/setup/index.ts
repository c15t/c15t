import { getFlagValue } from '../../context/parser';
import type { CliContext } from '../../context/types';
import {
	createControlPlaneClientFromConfig,
	requireInstanceBackendUrl,
	resolveInstance,
} from '../../control-plane';
import { CliError } from '../../core/errors';
import { createAgentSetupPlan, launchAgentSetup } from '../../frontend/agent';
import type { AgentSetupOptions } from '../../frontend/agent';

const readAgentOptions = (
	context: CliContext,
	preview: boolean
): AgentSetupOptions => {
	const { flags, commandArgs } = context;
	const unsupported = [
		'boilerplate',
		'output',
		'package-source',
		'env',
		'proxy',
		'ssr',
		'devtools',
		'ui-style',
		'theme',
		'skip-install',
		'apply',
		'resume',
		'debug',
	].find((flag) => Object.hasOwn(flags, flag));
	if (unsupported) {
		throw new CliError('FLAG_INVALID', {
			details: `--${unsupported} is not supported with --codex. Supply frontend preferences in the agent session.`,
		});
	}
	if (!preview && (flags.json === true || flags['non-interactive'] === true)) {
		throw new CliError('INPUT_REQUIRED', {
			details:
				'--codex requires an interactive terminal. Use --plan --json to export the task instead.',
		});
	}
	const modeFlag = getFlagValue(flags, 'mode');
	if (
		commandArgs.length > 1 ||
		(modeFlag && commandArgs[0] && modeFlag !== commandArgs[0])
	) {
		throw new CliError('FLAG_INVALID', {
			details:
				'Supply one setup mode; the positional mode and --mode must agree.',
		});
	}
	const project = getFlagValue(flags, 'project');
	const backendURL = getFlagValue(flags, 'backend-url');
	if (project && backendURL) {
		throw new CliError('FLAG_INVALID', {
			details: 'Supply either --project or --backend-url, not both.',
		});
	}
	const inputMode =
		modeFlag ?? commandArgs[0] ?? (project ? 'hosted' : undefined);
	const mode = inputMode === 'self-hosted' ? 'hosted' : inputMode;
	if (mode && !['hosted', 'offline', 'custom'].includes(mode)) {
		throw new CliError('FLAG_INVALID', {
			details: 'Choose hosted, offline, or custom mode.',
		});
	}
	if (project && mode !== 'hosted') {
		throw new CliError('FLAG_INVALID', {
			details: '--project requires hosted mode.',
		});
	}
	return {
		backendURL,
		framework: getFlagValue(flags, 'framework'),
		mode: mode as AgentSetupOptions['mode'],
		scripts: getFlagValue(flags, 'scripts')
			?.split(',')
			.map((script) => script.trim())
			.filter(Boolean),
	};
};

/** Run opt-in agent setup, bypassing the scaffold and AST setup workflows. */
export const setupWithAgent = async (context: CliContext): Promise<unknown> => {
	const { flags } = context;
	const preview = flags.plan === true || flags['dry-run'] === true;
	const options = readAgentOptions(context, preview);
	const project = getFlagValue(flags, 'project');
	let plan;
	try {
		plan = createAgentSetupPlan(options);
	} catch (error) {
		throw CliError.from(error, 'FLAG_INVALID');
	}
	if (project) {
		const client = await createControlPlaneClientFromConfig(
			context.projectRoot
		);
		options.backendURL = requireInstanceBackendUrl(
			resolveInstance(project, await client.listInstances())
		);
		plan = createAgentSetupPlan(options);
	}
	if (preview) {
		if (!flags.json) {
			context.logger.message(plan.prompt);
		}
		return { launched: false, ...plan };
	}
	const controller = new AbortController();
	const cancel = () => {
		controller.abort();
	};
	process.on('SIGINT', cancel);
	process.on('SIGTERM', cancel);
	try {
		const exitCode = await launchAgentSetup(
			context.projectRoot,
			plan,
			controller.signal
		);
		if (exitCode !== 0) {
			throw new CliError('AGENT_FAILED', {
				details: `Codex exited with code ${exitCode}.`,
				exitCode,
			});
		}
		return { agent: plan.agent, exitCode, launched: true };
	} catch (error) {
		throw controller.signal.aborted
			? new CliError('CANCELLED', {
					details: 'Review any agent edits already made.',
				})
			: CliError.from(error, 'AGENT_FAILED');
	} finally {
		process.off('SIGINT', cancel);
		process.off('SIGTERM', cancel);
	}
};
