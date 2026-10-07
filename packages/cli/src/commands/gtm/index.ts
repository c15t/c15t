import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import type { CliContext } from '~/context/types';
import { CliError } from '~/core/errors';

import { migrateContainer } from './map';
import { parseGtmContainer } from './parse';
import { formatGtmReport } from './report';
import type { GtmMigration } from './types';

const CONTAINER_ID = /^GTM-[A-Z0-9]+$/iu;

/** Response fields the command reads. Tests can supply these without a network. */
export interface GtmFetchResponse {
	ok: boolean;
	status: number;
	text: () => Promise<string>;
}

/** Injected I/O. The default downloads only the public `gtm.js` URL. */
export interface GtmCommandDependencies {
	fetch: (url: string) => Promise<GtmFetchResponse>;
	readFile: (filePath: string) => Promise<string>;
}

const publishedContainerUrl = function publishedContainerUrl(
	id: string
): string {
	return `https://www.googletagmanager.com/gtm.js?id=${id}`;
};

const defaultDependencies: GtmCommandDependencies = {
	fetch: async (url) => {
		const response = await fetch(url);
		return {
			ok: response.ok,
			status: response.status,
			text: () => response.text(),
		};
	},
	readFile: (filePath) => readFile(filePath, 'utf8'),
};

const isEnoent = function isEnoent(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		error.code === 'ENOENT'
	);
};

interface LoadedContainer {
	text: string;
	requestedId?: string;
	/** True when the text is a `gtm.js` file, not a JSON export. */
	publishedScript: boolean;
}

const loadPublished = async function loadPublished(
	id: string,
	fetchContainer: GtmCommandDependencies['fetch']
): Promise<LoadedContainer> {
	const url = publishedContainerUrl(id);
	let text: string;
	try {
		const response = await fetchContainer(url);
		if (!response.ok) {
			throw new CliError('NETWORK_ERROR', {
				details: `Download failed with status ${response.status}.`,
			});
		}
		text = await response.text();
	} catch (error) {
		if (error instanceof CliError) {
			throw error;
		}
		const message = error instanceof Error ? error.message : 'Download failed.';
		throw new CliError('NETWORK_ERROR', { details: message });
	}
	if (!text.includes(id)) {
		throw new CliError('NETWORK_ERROR', {
			details: `The download was not the published container for ${id}.`,
		});
	}
	return { publishedScript: true, requestedId: id, text };
};

const loadFile = async function loadFile(
	filePath: string,
	read: GtmCommandDependencies['readFile']
): Promise<LoadedContainer> {
	try {
		const text = await read(filePath);
		return { publishedScript: text.includes('var data ='), text };
	} catch (error) {
		if (isEnoent(error)) {
			throw new CliError('FILE_NOT_FOUND', { details: filePath });
		}
		if (error instanceof CliError) {
			throw error;
		}
		throw new CliError('FILE_READ_ERROR', { details: filePath });
	}
};

const loadContainer = function loadContainer(
	argument: string,
	cwd: string,
	dependencies: GtmCommandDependencies
): Promise<LoadedContainer> {
	if (CONTAINER_ID.test(argument)) {
		return loadPublished(argument.toUpperCase(), dependencies.fetch);
	}
	return loadFile(path.resolve(cwd, argument), dependencies.readFile);
};

const withDownloadFacts = function withDownloadFacts(
	migration: GtmMigration,
	loaded: LoadedContainer
): GtmMigration {
	const warnings = [...migration.warnings];
	if (
		loaded.requestedId &&
		migration.containerId &&
		loaded.requestedId !== migration.containerId
	) {
		warnings.push(
			`Downloaded container is ${migration.containerId}, not ${loaded.requestedId}.`
		);
	}
	if (!loaded.publishedScript) {
		return { ...migration, warnings };
	}
	return {
		...migration,
		bytes: Buffer.byteLength(loaded.text),
		gzipBytes: gzipSync(loaded.text).length,
		warnings,
	};
};

/**
 * Read a published container or a GTM export and return the c15t scripts
 * that replace it.
 *
 * A bare container id always downloads
 * `https://www.googletagmanager.com/gtm.js?id=`. The command never fetches a
 * URL typed by the user. Any other argument is a file path. A local file
 * whose name is only the container id is still downloaded. Pass
 * `./GTM-XXXXXXX` to read that file.
 *
 * @param context - Command arguments, working directory, flags and logger.
 * @param dependencies - Fetch and file reader. Tests replace both.
 * @returns The replacement plan. Human output is also written to the logger
 * unless `--json` is set.
 * @throws {CliError} `INPUT_REQUIRED` when the argument is missing.
 * `NETWORK_ERROR` when the download fails or is not that container.
 * `FILE_NOT_FOUND` or `FILE_READ_ERROR` for a local file.
 */
export const migrateGtm = async function migrateGtm(
	context: Pick<CliContext, 'commandArgs' | 'cwd' | 'flags' | 'logger'>,
	dependencies: GtmCommandDependencies = defaultDependencies
): Promise<GtmMigration> {
	const argument = context.commandArgs[0]?.trim();
	if (!argument) {
		throw new CliError('INPUT_REQUIRED', {
			details: 'Pass a GTM container id or a path to a container export.',
		});
	}
	const loaded = await loadContainer(argument, context.cwd, dependencies);
	const migration = withDownloadFacts(
		migrateContainer(parseGtmContainer(loaded.text)),
		loaded
	);
	if (context.flags.json !== true) {
		context.logger.message(formatGtmReport(migration));
	}
	return migration;
};
