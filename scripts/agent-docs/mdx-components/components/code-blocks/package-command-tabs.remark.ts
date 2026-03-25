/** @biome-ignore lint/style/useDefaultSwitchClause: the switch statement is complete */
/** @biome-ignore lint/nursery/noUnnecessaryConditions: these are packages */
import type { Root } from 'mdast';
import type { Transformer } from 'unified';
import {
	createInlineCode,
	createJsxComponentProcessor,
	createTable,
	getAttributeValue,
} from '../../remark-libs';

type Mode = 'run' | 'install';

type Options = {
	/** Column labels. */
	labels?: { pm?: string; command?: string };
	/** Which package managers to include and in what order. */
	managers?: Array<'npm' | 'pnpm' | 'yarn' | 'bun'>;
};

const DEFAULT_LABELS = { pm: 'Package manager', command: 'Command' } as const;
const DEFAULT_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'] as const;

const COMMANDS = {
	install: {
		npm: 'npm install {pkg}',
		pnpm: 'pnpm add {pkg}',
		yarn: 'yarn add {pkg}',
		bun: 'bun add {pkg}',
	},
	run: {
		npm: 'npx {pkg}',
		pnpm: 'pnpm dlx {pkg}',
		yarn: 'yarn dlx {pkg}',
		bun: 'bunx {pkg}',
	},
} as const;

type Pm = keyof (typeof COMMANDS)['run'];

function cmdsFor(pm: Pm, pkgCmd: string, mode: Mode): string {
	const template = COMMANDS[mode][pm];
	return template.replace('{pkg}', pkgCmd);
}

export function remarkPackageCommandTabsToMarkdown(
	opts: Options = {}
): Transformer<Root, Root> {
	const labels = { ...DEFAULT_LABELS, ...(opts.labels ?? {}) };
	const managers = [...(opts.managers ?? DEFAULT_MANAGERS)];

	return createJsxComponentProcessor('PackageCommandTabs', (node) => {
		const rawCommand = (getAttributeValue(node, 'command') ?? '').trim();
		const rawMode = (getAttributeValue(node, 'mode') ?? 'run').trim();
		const mode: Mode = rawMode === 'install' ? 'install' : 'run';

		if (!rawCommand) {
			return [];
		}

		// Build table data
		const headers = [labels.pm, labels.command];
		const rows = managers.map((pm) => {
			const cmd = cmdsFor(pm, rawCommand, mode);
			return [pm, [createInlineCode(cmd)]];
		});

		const table = createTable(headers, rows, ['left', 'left']);
		return [table];
	});
}
