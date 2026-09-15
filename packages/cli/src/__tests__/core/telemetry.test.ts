import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTelemetry } from '../../utils/telemetry';

afterEach(() => vi.unstubAllEnvs());

describe('telemetry preferences', () => {
	it('honors the environment opt-out even when disabled is explicitly false', async () => {
		vi.stubEnv('C15T_TELEMETRY_DISABLED', '1');
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'c15t-telemetry-'));
		try {
			const telemetry = createTelemetry({
				disabled: false,
				storageDir: path.join(root, 'state'),
			});
			expect(telemetry.isDisabled()).toBe(true);
			await telemetry.shutdown();
			expect(await fs.readdir(root)).toEqual([]);
		} finally {
			await fs.rm(root, { force: true, recursive: true });
		}
	});
	it('does not collect positional values or flag values with commands', () => {
		const telemetry = createTelemetry({ disabled: true });
		const track = vi.spyOn(telemetry, 'trackEvent');
		telemetry.trackCommand('projects', ['create', 'private-project'], {
			organization: 'private-org',
		});
		const event = JSON.stringify(track.mock.calls);
		expect(event).not.toContain('private-project');
		expect(event).not.toContain('private-org');
		expect(event).toContain('organization');
	});
});
