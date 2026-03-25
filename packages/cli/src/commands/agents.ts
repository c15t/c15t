import { join } from 'node:path';
import type { CliCommand, CliContext } from '~/context/types';
import { checkAgentsMd } from '~/lib/agents/check-agents-md';
import { discoverInstalledAgentPackages } from '~/lib/agents/discover-packages';
import { renderManagedBlock } from '~/lib/agents/render-managed-block';
import { upsertAgentsMd } from '~/lib/agents/upsert-agents-md';

function hasArg(args: string[], flag: string) {
	return args.includes(flag);
}

export async function runAgentsCommand(
	context: CliContext,
	options?: { checkOnly?: boolean }
) {
	const { logger, projectRoot } = context;
	const checkOnly =
		options?.checkOnly ?? hasArg(context.commandArgs, '--check');
	const installed = discoverInstalledAgentPackages(projectRoot);

	if (installed.length === 0) {
		logger.error(
			'No supported c15t package docs were found. Install c15t packages first, then run `c15t agents` again.'
		);
		process.exitCode = 1;
		return;
	}

	const managedBlock = renderManagedBlock(installed);
	const agentsPath = join(projectRoot, 'AGENTS.md');

	if (checkOnly) {
		const result = checkAgentsMd(agentsPath, managedBlock);
		if (!result.ok) {
			logger.error(result.reason ?? 'AGENTS.md is out of date.');
			process.exitCode = 1;
			return;
		}
		logger.success('AGENTS.md is up to date.');
		return;
	}

	upsertAgentsMd(agentsPath, managedBlock);
	logger.success('Updated AGENTS.md with c15t agent rules.');
	logger.message('');
	logger.message('Included c15t package docs:');
	for (const pkg of installed) {
		logger.message(`- ${pkg.packageName}`);
	}
}

export const agentsCommand: CliCommand = {
	name: 'agents',
	label: 'Agents',
	hint: 'Generate AGENTS.md from installed c15t package docs',
	description:
		'Generate or update AGENTS.md using the docs bundled in installed c15t packages',
	action: async (context) => runAgentsCommand(context),
};
