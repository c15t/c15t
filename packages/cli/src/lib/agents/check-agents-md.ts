import { existsSync, readFileSync } from 'node:fs';
import { extractManagedBlock } from './upsert-agents-md';

export function checkAgentsMd(filePath: string, expectedManagedBlock: string) {
	if (!existsSync(filePath)) {
		return {
			ok: false,
			reason: 'AGENTS.md does not exist',
		};
	}

	const actual = readFileSync(filePath, 'utf8');
	const managed = extractManagedBlock(actual);

	if (!managed) {
		return {
			ok: false,
			reason: 'AGENTS.md does not contain a managed c15t block',
		};
	}

	if (managed.trim() !== expectedManagedBlock.trim()) {
		return {
			ok: false,
			reason: 'AGENTS.md managed c15t block is out of date',
		};
	}

	return { ok: true };
}
