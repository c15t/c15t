import { execFileSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { checkAlphaRelease } from './check-alpha-release';

/** Temporarily hide prerelease state so Changesets accepts an explicit npm tag. */
export const withAlphaPublishState = function withAlphaPublishState(
	root: string,
	publish: () => void
): void {
	checkAlphaRelease(root);
	const prePath = join(root, '.changeset/pre.json');
	const backupDir = mkdtempSync(join(root, '.changeset/alpha-publish-'));
	const backupPath = join(backupDir, 'pre.json');
	renameSync(prePath, backupPath);
	try {
		publish();
	} finally {
		renameSync(backupPath, prePath);
		rmSync(backupDir, { recursive: true });
	}
};

if (import.meta.main) {
	withAlphaPublishState(process.cwd(), () => {
		execFileSync('bun', ['run', 'changeset', 'publish', '--tag', 'alpha'], {
			stdio: 'inherit',
		});
	});
}
