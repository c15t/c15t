import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runTrackingBlockerToNetworkBlockerCodemod } from './tracking-blocker-to-network-blocker';

const createdDirs: string[] = [];

async function createTempProject(
	content: string
): Promise<{ rootDir: string; filePath: string }> {
	const rootDir = await mkdtemp(join(tmpdir(), 'c15t-codemod-'));
	const filePath = join(rootDir, 'app.tsx');
	await writeFile(filePath, content, 'utf-8');
	createdDirs.push(rootDir);
	return { rootDir, filePath };
}

describe('tracking-blocker-to-network-blocker codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('converts trackingBlockerConfig object into networkBlocker rules', async () => {
		const source = `
import type { TrackingBlockerConfig } from 'c15t';

const options = {
	trackingBlockerConfig: {
		disableAutomaticBlocking: true,
		domainConsentMap: {
			'google-analytics.com': 'measurement',
			'facebook.com': 'marketing',
		},
	},
};

const { trackingBlockerConfig } = options;
const value = options.trackingBlockerConfig;
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTrackingBlockerToNetworkBlockerCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('NetworkBlockerConfig');
		expect(updated).toContain('networkBlocker: {');
		expect(updated).toContain('enabled: false');
		expect(updated).toContain(
			"{ domain: 'google-analytics.com', category: 'measurement' }"
		);
		expect(updated).toContain(
			"{ domain: 'facebook.com', category: 'marketing' }"
		);
		expect(updated).toContain(
			'const { networkBlocker: trackingBlockerConfig } = options;'
		);
		expect(updated).toContain('const value = options.networkBlocker;');
		expect(updated).not.toContain('trackingBlockerConfig:');
	});

	it('renames shorthand trackingBlockerConfig usage', async () => {
		const source = `
const trackingBlockerConfig = getConfig();
const options = { trackingBlockerConfig };
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTrackingBlockerToNetworkBlockerCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});
		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('networkBlocker: trackingBlockerConfig');
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const options = {
	trackingBlockerConfig: {
		disableAutomaticBlocking: true,
	},
};
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runTrackingBlockerToNetworkBlockerCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('trackingBlockerConfig');
		expect(unchanged).not.toContain('networkBlocker');
	});
});
