import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Per-cell settings the global setup reads from an optional
 * `compat.config.ts` in the cell directory.
 */
export interface CompatCellConfig {
	/**
	 * - `server` (default): `next build`, then `next start` serves the app
	 *   and the backend stub mounted inside it.
	 * - `static-export`: the cell builds with `output: 'export'`. The stub
	 *   runs as its own server, its URL is handed to the build through
	 *   `NEXT_PUBLIC_COMPAT_BACKEND_URL`, and `out/` is served by a static
	 *   file server.
	 */
	mode?: 'server' | 'static-export';
}

const CONFIG_FILE = 'compat.config.ts';

/**
 * Reads `compat.config.ts` from a cell, or returns the defaults when the
 * cell has none.
 */
export const readCellConfig = async function readCellConfig(
	appDir: string
): Promise<Required<CompatCellConfig>> {
	const configPath = join(appDir, CONFIG_FILE);
	if (!existsSync(configPath)) {
		return { mode: 'server' };
	}
	const loaded = (await import(pathToFileURL(configPath).href)) as {
		default?: CompatCellConfig;
	};
	return { mode: loaded.default?.mode ?? 'server' };
};
