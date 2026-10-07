// oxlint-disable no-await-in-loop -- Readiness polling must wait between attempts.
import { execFile } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** The image the backend database tests use in CI. */
const image =
	'postgres:16@sha256:33f923b05f64ca54ac4401c01126a6b92afe839a0aa0a52bc5aeb5cc958e5f20';

/**
 * A throwaway PostgreSQL server in Docker. Its data directory is a tmpfs,
 * so removing the container removes the data.
 */
export const startPostgres = async function startPostgres() {
	const { stdout } = await run('docker', [
		'run',
		'--detach',
		'--rm',
		'--env',
		'POSTGRES_PASSWORD=c15t',
		'--env',
		'POSTGRES_DB=c15t',
		'--publish',
		'127.0.0.1::5432',
		'--tmpfs',
		'/var/lib/postgresql/data',
		image,
	]);
	const container = stdout.trim();
	const close = async () => {
		await run('docker', ['rm', '--force', container]).catch(() => undefined);
	};
	try {
		const { stdout: address } = await run('docker', [
			'port',
			container,
			'5432/tcp',
		]);
		const port = address.trim().split('\n')[0]?.split(':').at(-1);
		// The image's first-run server listens on a socket only. A TCP answer
		// comes from the final server, after initialization.
		const deadline = Date.now() + 60_000;
		while (true) {
			try {
				await run('docker', [
					'exec',
					container,
					'pg_isready',
					'--host=127.0.0.1',
					'--username=postgres',
				]);
				break;
			} catch (error) {
				if (Date.now() > deadline) {
					throw error;
				}
				await delay(250);
			}
		}
		return {
			close,
			url: `postgres://postgres:c15t@127.0.0.1:${port}/c15t`,
		};
	} catch (error) {
		await close();
		throw error;
	}
};
