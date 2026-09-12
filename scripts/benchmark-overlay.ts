import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Use identical fixtures, including deletions, while retaining each revision's product. */
export const replaceBenchmarkFixtures = function replaceBenchmarkFixtures(
	source: string,
	base: string
) {
	const tracked = (cwd: string, includeNew: boolean) =>
		execFileSync(
			'git',
			[
				'ls-files',
				'-z',
				'--cached',
				...(includeNew ? ['--others', '--exclude-standard'] : []),
				'--',
				'benchmarks',
			],
			{ cwd, encoding: 'utf8' }
		)
			.split('\0')
			.filter(Boolean);
	for (const file of tracked(base, false)) {
		rmSync(join(base, file), { force: true });
	}
	for (const file of tracked(source, true)) {
		if (!existsSync(join(source, file))) {
			continue;
		}
		mkdirSync(dirname(join(base, file)), { recursive: true });
		cpSync(join(source, file), join(base, file));
	}
};
