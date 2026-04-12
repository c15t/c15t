import { spawn, spawnSync } from 'node:child_process';
import { existsSync, type FSWatcher, watch } from 'node:fs';
import { join } from 'node:path';

const packageRoot = join(import.meta.dirname, '..');
const dependencyDistRoot = join(packageRoot, '..', 'ui', 'dist');
const localDistRoot = join(packageRoot, 'dist');
const watchedDirs = [
	localDistRoot,
	join(localDistRoot, 'iab'),
	dependencyDistRoot,
	join(dependencyDistRoot, 'iab'),
];
const watchedFiles = new Set(['styles.css', 'styles.tw3.css']);

const child = spawn('bunx', ['rslib', 'build', '--watch'], {
	cwd: packageRoot,
	stdio: 'inherit',
});

let closed = false;
let regenerateTimer: NodeJS.Timeout | null = null;
let attachTimer: NodeJS.Timeout | null = null;
let suppressEventsUntil = 0;
const watchers: FSWatcher[] = [];

function cleanup(exitCode = 0) {
	if (closed) {
		return;
	}

	closed = true;

	if (regenerateTimer) {
		clearTimeout(regenerateTimer);
	}

	if (attachTimer) {
		clearInterval(attachTimer);
	}

	for (const watcher of watchers) {
		watcher.close();
	}

	if (!child.killed) {
		child.kill('SIGINT');
	}

	process.exit(exitCode);
}

function regenerateCssEntryPoints() {
	suppressEventsUntil = Date.now() + 750;

	const result = spawnSync(
		'bun',
		['run', join(import.meta.dirname, 'generate-distribution-css.ts')],
		{
			cwd: packageRoot,
			stdio: 'inherit',
		}
	);

	if (result.status && result.status !== 0) {
		console.error(
			`generate-distribution-css exited with status ${result.status}.`
		);
	}
}

function scheduleRegenerate() {
	if (closed) {
		return;
	}

	if (regenerateTimer) {
		clearTimeout(regenerateTimer);
	}

	regenerateTimer = setTimeout(() => {
		regenerateCssEntryPoints();
	}, 150);
}

function attachWatchers() {
	if (watchers.length > 0 || watchedDirs.some((dir) => !existsSync(dir))) {
		return;
	}

	for (const dir of watchedDirs) {
		const watcher = watch(dir, (_, fileName) => {
			if (Date.now() < suppressEventsUntil || !fileName) {
				return;
			}

			if (!watchedFiles.has(fileName.toString())) {
				return;
			}

			scheduleRegenerate();
		});

		watchers.push(watcher);
	}

	regenerateCssEntryPoints();
}

attachTimer = setInterval(attachWatchers, 250);
attachWatchers();

child.on('exit', (code) => {
	if (!closed) {
		cleanup(code ?? 0);
	}
});

process.on('SIGINT', () => cleanup());
process.on('SIGTERM', () => cleanup());
