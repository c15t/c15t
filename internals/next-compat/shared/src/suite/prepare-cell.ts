import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

/**
 * Prepares a compatibility cell, restoring its packed dependencies even when
 * Turbo restored the app build without the cell's node_modules.
 *
 * @param appDir - Compatibility cell directory.
 * @param built - Whether a usable app build already exists.
 * @param env - Environment overrides for the build.
 * @returns Whether the app was rebuilt.
 * @throws {Error} When building or installing packed packages fails.
 */
export const prepareCompatCell = async function prepareCompatCell(
	appDir: string,
	built: boolean,
	env: Record<string, string> = {}
): Promise<boolean> {
	const rebuild =
		process.env.COMPAT_SKIP_BUILD !== '1' &&
		(process.env.COMPAT_FORCE_BUILD === '1' || !built);
	// Build scripts pack before compiling. Cached builds still need the same
	// installed package tree for server externals and the dev prerender probe.
	const args = rebuild
		? ['run', 'build']
		: [fileURLToPath(new URL('../../scripts/pack.ts', import.meta.url))];
	const child = spawn('bun', args, {
		cwd: appDir,
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', ...env },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	let logs = '';
	child.stdout.on('data', (chunk) => {
		logs += String(chunk);
	});
	child.stderr.on('data', (chunk) => {
		logs += String(chunk);
	});
	const [code] = await once(child, 'exit');
	if (code !== 0) {
		throw new Error(`bun ${args.join(' ')} failed (exit ${code})\n${logs}`);
	}
	return rebuild;
};
