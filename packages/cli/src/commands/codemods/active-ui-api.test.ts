import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runActiveUiApiCodemod } from './active-ui-api';

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

describe('active-ui-api codemod', () => {
	afterEach(async () => {
		for (const dir of createdDirs.splice(0, createdDirs.length)) {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('transforms legacy state checks and setter calls', async () => {
		const source = `
const manager = useConsentManager();

if (manager.showPopup) {
	console.log('banner');
}

if (manager.isPrivacyDialogOpen) {
	console.log('dialog');
}

manager.setShowPopup(true, true);
manager.setShowPopup(isOpen, shouldForce);
manager.setIsPrivacyDialogOpen(false);
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runActiveUiApiCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain("(manager.activeUI === 'banner')");
		expect(updated).toContain("(manager.activeUI === 'dialog')");
		expect(updated).toContain("manager.setActiveUI('banner', { force: true })");
		expect(updated).toContain(
			"manager.setActiveUI(isOpen ? 'banner' : 'none', shouldForce ? { force: true } : undefined)"
		);
		expect(updated).toContain("manager.setActiveUI('none')");
	});

	it('transforms destructured legacy members', async () => {
		const source = `
const {
	showPopup,
	setShowPopup,
	isPrivacyDialogOpen,
	setIsPrivacyDialogOpen,
} = useConsentManager();

const data = { showPopup };

if (showPopup && !isPrivacyDialogOpen) {
	console.log('visible');
}

setShowPopup(true);
setIsPrivacyDialogOpen(shouldOpen);
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runActiveUiApiCodemod({
			projectRoot: rootDir,
			dryRun: false,
		});

		const updated = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(updated).toContain('activeUI: showPopup');
		expect(updated).toContain('setActiveUI: setShowPopup');
		expect(updated).toContain('activeUI: isPrivacyDialogOpen');
		expect(updated).toContain('setActiveUI: setIsPrivacyDialogOpen');
		expect(updated).toContain("showPopup: (showPopup === 'banner')");
		expect(updated).toContain(
			"(showPopup === 'banner') && !(isPrivacyDialogOpen === 'dialog')"
		);
		expect(updated).toContain("setShowPopup('banner')");
		expect(updated).toContain(
			"setIsPrivacyDialogOpen(shouldOpen ? 'dialog' : 'none')"
		);
	});

	it('supports dry-run without modifying files', async () => {
		const source = `
const manager = useConsentManager();
manager.setShowPopup(true);
`;
		const { rootDir, filePath } = await createTempProject(source);

		const result = await runActiveUiApiCodemod({
			projectRoot: rootDir,
			dryRun: true,
		});
		const unchanged = await readFile(filePath, 'utf-8');

		expect(result.changedFiles).toHaveLength(1);
		expect(unchanged).toContain('manager.setShowPopup(true);');
		expect(unchanged).not.toContain('setActiveUI');
	});
});
