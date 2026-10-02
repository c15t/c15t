import { spawn } from 'node:child_process';

const copyWithCommand = (
	command: string,
	args: string[],
	text: string | Buffer
) =>
	new Promise<boolean>((resolve) => {
		const child = spawn(command, args, {
			stdio: ['pipe', 'ignore', 'ignore'],
			windowsHide: true,
		});
		const timeout = setTimeout(() => {
			child.kill();
			resolve(false);
		}, 2000);
		let inputFailed = false;
		child.stdin.on('error', () => {
			inputFailed = true;
		});
		child.once('error', () => {
			clearTimeout(timeout);
			resolve(false);
		});
		child.once('close', (code) => {
			clearTimeout(timeout);
			resolve(code === 0 && !inputFailed);
		});
		child.stdin.end(text);
	});

/**
 * Whether Linux is running under Windows Subsystem for Linux, where the
 * Windows clipboard is reachable through interop executables.
 */
const isWsl = () =>
	Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);

/**
 * Encode text for clip.exe, which reads UTF-16LE when the input starts with
 * a byte order mark and the console code page otherwise.
 */
const toClipExeInput = (text: string) =>
	Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);

/**
 * Copy text using an installed desktop clipboard tool, without a shell.
 * @param text Literal clipboard contents, sent through the tool's stdin.
 * @returns Whether a clipboard tool completed successfully.
 * @internal
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
	if (process.platform === 'darwin') {
		return copyWithCommand('pbcopy', [], text);
	}
	if (process.platform === 'win32') {
		return copyWithCommand(
			'powershell.exe',
			[
				'-NoLogo',
				'-NoProfile',
				'-NonInteractive',
				'-Command',
				'[Console]::InputEncoding = [System.Text.UTF8Encoding]::new(); Set-Clipboard -Value ([Console]::In.ReadToEnd())',
			],
			text
		);
	}
	if (process.platform === 'linux') {
		return (
			(await copyWithCommand('wl-copy', [], text)) ||
			(await copyWithCommand('xclip', ['-selection', 'clipboard'], text)) ||
			(await copyWithCommand('xsel', ['--clipboard', '--input'], text)) ||
			(isWsl() && (await copyWithCommand('clip.exe', [], toClipExeInput(text))))
		);
	}
	return false;
};
