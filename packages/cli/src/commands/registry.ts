import { URLS } from '../constants';
import {
	authFlags,
	codemodFlags,
	migrationFlags,
	projectFlags,
	setupFlags,
} from '../context/parser';
import type { CliCommand, CliContext } from '../context/types';

const openUrl = async (context: CliContext, url: string) => {
	if (context.flags['non-interactive'] !== true) {
		const { default: open } = await import('open');
		await open(url);
	} else if (context.flags.json !== true) {
		context.logger.message(url);
	}
	return { url };
};
const setup: CliCommand = {
	action: async (context) => (await import('./generate')).generate(context),
	description: 'Set up c15t in a supported project.',
	flags: setupFlags,
	hint: 'Set up consent management',
	label: 'Setup',
	name: 'setup',
	usage: 'c15t setup [hosted|self-hosted|offline|custom] [options]',
};

/** Command metadata is shared by parsing, help, and the interactive menu. */
export const commands: CliCommand[] = [
	setup,
	{ ...setup, description: 'Alias for setup.', hidden: true, name: 'generate' },
	{
		action: async (context) =>
			(await import('./codemods')).codemodsCommand.action(context),
		description: 'Run deterministic legacy code migrations.',
		flags: codemodFlags,
		hiddenFromMenu: true,
		hint: 'Migrate older c15t code',
		label: 'Legacy codemods',
		name: 'codemods',
		usage:
			'c15t codemods [id ...] [--list|--all] [--from <version>] [--to <version>] [--dry-run]',
	},
	{
		action: async (context) =>
			(await import('./auth')).loginCommand.action(context),
		description: 'Authenticate with Inth using a device code.',
		flags: authFlags,
		hint: 'Authenticate with Inth',
		label: 'Login',
		name: 'login',
		usage: 'c15t login [--no-browser]',
	},
	{
		action: async (context) =>
			(await import('./auth')).logoutCommand.action(context),
		description: 'Log out of Inth.',
		hint: 'Clear stored credentials',
		label: 'Logout',
		name: 'logout',
		usage: 'c15t logout [--yes]',
	},
	{
		action: async (context) =>
			(await import('./auth')).authStatusCommand.action(context),
		description: 'Show the current authentication status.',
		hint: 'Check authentication',
		label: 'Auth status',
		name: 'status',
	},
	{
		action: async (context) =>
			(await import('./instances')).projectsAction(context),
		description: 'List, select, and create hosted projects.',
		examples: [
			'c15t projects list --json',
			'c15t projects select my-project --json',
			'c15t projects create my-app --organization my-org --region us-east-1 --json',
		],
		flags: projectFlags,
		hint: 'Manage hosted projects',
		label: 'Projects',
		name: 'projects',
		usage: 'c15t projects [list|select <project>|create <name>] [options]',
	},
	{
		action: async (context) =>
			(await import('./instances')).projectsAction(context),
		description: 'Alias for projects.',
		flags: projectFlags,
		hidden: true,
		hint: 'Alias for projects',
		label: 'Instances',
		name: 'instances',
	},
	{
		action: async (context) => (await import('./self-host')).selfHost(context),
		description: 'Plan and apply backend database migrations.',
		examples: [
			'c15t self-host migrate --plan --json',
			'c15t self-host migrate --apply --yes',
		],
		flags: migrationFlags,
		hint: 'Migrate a backend database',
		label: 'Self-host',
		name: 'self-host',
		usage: 'c15t self-host migrate [--config <path>] [--plan|--apply] [--yes]',
	},
	{
		action: async (context) =>
			(await import('./skills')).installSkills(context),
		description: 'Install c15t skills using the skills CLI.',
		hint: 'Install c15t agent skills',
		label: 'Skills',
		name: 'skills',
		usage: 'c15t skills [--yes]',
	},
	...(
		[
			['docs', 'Documentation', URLS.DOCS],
			['changelog', 'Changelog', URLS.CHANGELOG],
			['github', 'GitHub', URLS.GITHUB],
		] as const
	).map(([name, label, url]): CliCommand => ({
		action: (context) => openUrl(context, url),
		description: `Open ${label}, or print its URL outside a terminal.`,
		hint: `Open ${label}`,
		label,
		name,
	})),
];
