import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const OUTER_BLOCK_REGEX =
	/<!-- BEGIN:c15t-agent-rules -->[\s\S]*?<!-- END:c15t-agent-rules -->/m;

export function upsertAgentsMd(
	projectRootFilePath: string,
	managedBlock: string
) {
	if (!existsSync(projectRootFilePath)) {
		writeFileSync(projectRootFilePath, `${managedBlock}\n`, 'utf8');
		return;
	}

	const existing = readFileSync(projectRootFilePath, 'utf8');
	if (OUTER_BLOCK_REGEX.test(existing)) {
		const next = existing.replace(OUTER_BLOCK_REGEX, managedBlock);
		writeFileSync(
			projectRootFilePath,
			next.endsWith('\n') ? next : `${next}\n`,
			'utf8'
		);
		return;
	}

	const separator = existing.endsWith('\n') ? '\n' : '\n\n';
	writeFileSync(
		projectRootFilePath,
		`${existing}${separator}${managedBlock}\n`,
		'utf8'
	);
}

export function extractManagedBlock(content: string) {
	return content.match(OUTER_BLOCK_REGEX)?.[0] ?? null;
}
