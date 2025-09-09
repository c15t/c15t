import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryEventName } from '../../../utils/telemetry';
import { handleORMResult } from './orm-result';

function createTmpDir(prefix: string) {
	return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

describe('handleORMResult', () => {
	let cwd: string;
	beforeEach(async () => {
		cwd = await createTmpDir('orm-result');
	});

	afterEach(async () => {
		await fs.rm(cwd, { recursive: true, force: true });
	});

	it('writes file to path and tracks telemetry', async () => {
		const context = {
			cwd,
			logger: { info: vi.fn() },
			telemetry: { trackEvent: vi.fn() },
		} as unknown as Parameters<typeof handleORMResult>[0];

		const targetRel = 'migrations/001-init.sql';
		const result = {
			path: targetRel,
			code: 'CREATE TABLE test (id INT);',
		} as unknown as Parameters<typeof handleORMResult>[1];

		await handleORMResult(context, result);

		const targetAbs = path.join(cwd, targetRel);
		await expect(fs.readFile(targetAbs, 'utf8')).resolves.toBe(
			'CREATE TABLE test (id INT);'
		);

		expect(context.logger.info).toHaveBeenCalledWith(
			`Migration file created at ${targetAbs}`
		);
		expect(context.telemetry.trackEvent).toHaveBeenCalledWith(
			TelemetryEventName.MIGRATION_COMPLETED,
			{ success: true, migrationFileCreated: true }
		);
	});
});
