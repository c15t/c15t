import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyToClipboard } from '../../utils/clipboard';

let directory = '';
beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), 'c15t-clipboard-'));
	vi.stubEnv('PATH', directory);
	vi.stubEnv('C15T_TEST_CLIPBOARD', join(directory, 'contents'));
	vi.stubEnv('C15T_TEST_CLIPBOARD_ARGS', join(directory, 'args'));
});
afterEach(async () => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	await rm(directory, { force: true, recursive: true });
});

const tool = (name: string, script = '/bin/cat > "$C15T_TEST_CLIPBOARD"') =>
	writeFile(
		join(directory, name),
		`#!/bin/sh\n${script}\nprintf '%s\\n' "$@" > "$C15T_TEST_CLIPBOARD_ARGS"\n`,
		{ mode: 0o755 }
	);

describe.skipIf(process.platform === 'win32')(
	'desktop clipboard transport',
	() => {
		it.each([
			['darwin', 'pbcopy'],
			['win32', 'powershell.exe'],
			['linux', 'wl-copy'],
			['linux', 'xclip'],
			['linux', 'xsel'],
		])(
			'copies literal Unicode text through %s %s stdin',
			async (platform, name) => {
				vi.stubGlobal('process', { ...process, platform });
				await tool(name);
				const prompt =
					'Set up c15t\n日本語 👋\n$(touch injected) & "quoted" %PATH%';
				expect(await copyToClipboard(prompt)).toBe(true);
				expect(await readFile(join(directory, 'contents'), 'utf8')).toBe(
					prompt
				);
				const args = await readFile(join(directory, 'args'), 'utf8');
				expect(args).not.toContain(prompt);
			}
		);

		it('falls back to X11 when the Wayland clipboard tool fails', async () => {
			vi.stubGlobal('process', { ...process, platform: 'linux' });
			await tool('wl-copy', 'exit 1');
			await tool('xclip');
			expect(await copyToClipboard('setup prompt')).toBe(true);
			expect(await readFile(join(directory, 'contents'), 'utf8')).toBe(
				'setup prompt'
			);
			expect(await readFile(join(directory, 'args'), 'utf8')).toBe(
				'-selection\nclipboard\n'
			);
		});

		it('reports unavailable clipboard tools without rejecting', async () => {
			vi.stubGlobal('process', { ...process, platform: 'linux' });
			expect(await copyToClipboard('setup prompt')).toBe(false);
		});

		it('stops a clipboard tool that does not finish', async () => {
			vi.stubGlobal('process', { ...process, platform: 'darwin' });
			await tool('pbcopy', 'exec /bin/sleep 30');
			vi.useFakeTimers();
			const copied = copyToClipboard('setup prompt');
			await vi.advanceTimersByTimeAsync(2000);
			expect(await copied).toBe(false);
		});
	}
);
