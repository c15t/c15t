import {
	closeSync,
	constants,
	fstatSync,
	fsyncSync,
	linkSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmdirSync,
	unlinkSync,
	writeSync,
} from 'node:fs';
import type { Stats } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { getInstallSpecifier } from '../../generate/dependencies.ts';
import type { FileMerge, GenerationPlan } from '../../generate/index.ts';
import { mergeFile } from '../../generate/merge.ts';

const recoveryDirectory = '.c15t-native-generation';

/** A reviewed generated file. Existing files must already match its contents. */
export interface PlannedFile {
	path: string;
	content: string;
	exists: boolean;
}

/** A generation plan bound to a canonical application directory. */
export interface ApplicationPlan {
	root: string;
	files: PlannedFile[];
	dependencies: string[];
	instructions: string[];
}

/** Read an errno code from Node errors or scriptc's `CODE: message` errors. */
const errorCode = (error: unknown): string | undefined => {
	if (!(error instanceof Error)) {
		return undefined;
	}
	if ('code' in error && typeof error.code === 'string') {
		return error.code;
	}
	const prefix = error.message.split(':')[0] ?? '';
	return /^[A-Z][A-Z0-9]*$/u.test(prefix) ? prefix : undefined;
};

const missing = (error: unknown): boolean => errorCode(error) === 'ENOENT';

const describeError = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

/** Validate containment and every ancestor, including dangling symlinks. */
const targetPath = (root: string, file: string): string => {
	const segments = file.split('/');
	if (
		!file ||
		isAbsolute(file) ||
		file.includes('\\') ||
		file.includes(':') ||
		file.includes('\0') ||
		segments.includes('..') ||
		segments.some((segment) =>
			['.git', recoveryDirectory, '.c15t-generation.json'].includes(
				segment.toLowerCase()
			)
		)
	) {
		throw new Error(
			`Generation target must be inside the application: ${file}`
		);
	}
	const target = resolve(root, file);
	if (target === root) {
		throw new Error('A generation file cannot be the application directory.');
	}
	let current = root;
	for (const segment of relative(root, target).split(sep)) {
		current = join(current, segment);
		try {
			const entry = lstatSync(current);
			if (entry.isSymbolicLink()) {
				throw new Error(`Generation cannot pass through a symlink: ${current}`);
			}
			if (current !== target && !entry.isDirectory()) {
				throw new Error(`Generation parent is not a directory: ${current}`);
			}
		} catch (error) {
			if (!missing(error)) {
				throw error;
			}
		}
	}
	return target;
};

const registerTarget = (seen: string[], target: string): void => {
	if (seen.includes(target)) {
		throw new Error(`Duplicate generation target: ${target}`);
	}
	if (
		seen.some(
			(previous) =>
				previous.startsWith(`${target}${sep}`) ||
				target.startsWith(`${previous}${sep}`)
		)
	) {
		throw new Error(
			'Generation targets cannot be parents of other generated files.'
		);
	}
	seen.push(target);
};

const readExisting = (target: string): string | null => {
	try {
		return readFileSync(target, 'utf8');
	} catch (error) {
		if (missing(error)) {
			return null;
		}
		throw error;
	}
};

const stagePath = (root: string): string => {
	const stage = join(root, recoveryDirectory);
	try {
		const entry = lstatSync(stage);
		if (entry.isSymbolicLink() || !entry.isDirectory()) {
			throw new Error(
				'Generation recovery directory must be a regular directory.'
			);
		}
	} catch (error) {
		if (!missing(error)) {
			throw error;
		}
	}
	return stage;
};

const requireNoRecovery = (root: string): void => {
	if (readExisting(join(root, '.c15t-generation.json')) !== null) {
		throw new Error(
			'An existing Node setup transaction needs recovery using c15t --resume --apply.'
		);
	}
	const stage = stagePath(root);
	try {
		lstatSync(stage);
	} catch (error) {
		if (missing(error)) {
			return;
		}
		throw error;
	}
	throw new Error(
		'An interrupted native generation needs --resume --apply before continuing.'
	);
};

const requireMatchingContents = (
	current: string | null,
	content: string,
	name: string
): void => {
	if (current !== null && current !== content) {
		throw new Error(`Refusing to overwrite existing file: ${name}`);
	}
};

/** Tells the user what to add to an existing file this host won't change. */
const handMergeInstruction = (
	name: string,
	generated: string,
	merge: FileMerge
): string => {
	if (merge.type === 'insert') {
		return `Add to ${name}:\n${merge.inserts
			.map((insert) =>
				insert.before
					? `${insert.content}\n(before ${insert.before})`
					: insert.content
			)
			.join('\n')}`;
	}
	return `Add to ${name}:\n${generated.trimEnd()}`;
};

/**
 * Review generation against an existing app without writing files.
 * @param projectRoot Application directory containing package.json.
 * @param generation Generated file contents, dependencies, and wiring instructions.
 * @returns A plan bound to the real application root, including unchanged files.
 * @throws {Error} For conflicting files, symlinks, invalid targets, or pending recovery.
 */
export const planGeneration = (
	projectRoot: string,
	generation: GenerationPlan
): ApplicationPlan => {
	const root = realpathSync(projectRoot);
	readFileSync(targetPath(root, 'package.json'), 'utf8');
	requireNoRecovery(root);
	const files: PlannedFile[] = [];
	const instructions = generation.instructions.slice();
	const seen: string[] = [];
	for (const name of Object.keys(generation.files)) {
		const target = targetPath(root, name);
		registerTarget(seen, target);
		const generated = generation.files[name];
		if (typeof generated !== 'string') {
			throw new Error(`Invalid generated contents: ${name}`);
		}
		const current = readExisting(target);
		const merge = Object.hasOwn(generation.merge ?? {}, name)
			? generation.merge[name]
			: undefined;
		let content = generated;
		if (current !== null && merge) {
			// This host only creates files. An existing file that needs
			// lines added, such as `.env`, stays as it is for the user to edit.
			if (mergeFile(current, generated, merge) !== current) {
				instructions.push(handMergeInstruction(name, generated, merge));
			}
			content = current;
		}
		requireMatchingContents(current, content, name);
		files.push({
			content,
			exists: current !== null,
			path: relative(root, target).split(sep).join('/'),
		});
	}
	return {
		dependencies: generation.dependencies.map(getInstallSpecifier),
		files,
		instructions,
		root,
	};
};

const writeAll = (descriptor: number, content: string): void => {
	const bytes = new TextEncoder().encode(content);
	let offset = 0;
	while (offset < bytes.length) {
		const written = writeSync(descriptor, bytes, offset, bytes.length - offset);
		if (written <= 0) {
			throw new Error('Could not finish writing a generated file.');
		}
		offset += written;
	}
	fsyncSync(descriptor);
};

const openExclusive = (path: string, mode: number): number =>
	openSync(
		path,
		// Numeric exclusive-open flags compile statically with scriptc.
		// oxlint-disable-next-line no-bitwise
		constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
		mode
	);

const writeExclusive = (path: string, content: string, mode: number): void => {
	const descriptor = openExclusive(path, mode);
	try {
		writeAll(descriptor, content);
	} finally {
		closeSync(descriptor);
	}
};

/** Device and inode of a live file. */
interface FileIdentity {
	dev: number;
	ino: number;
}

/**
 * Identity recorded for a file published by copying. A deleted copy's inode
 * can be reused at once, so size and microsecond timestamps help tell a later
 * replacement apart from the copy.
 */
interface CopyIdentity extends FileIdentity {
	ctimeUs: number;
	mtimeUs: number;
	size: number;
}

// Copies the fields explicitly: scriptc does not width-coerce Stats records.
const identityOf = (entry: Stats): FileIdentity => ({
	dev: entry.dev,
	ino: entry.ino,
});

const copyIdentityOf = (entry: Stats): CopyIdentity => ({
	ctimeUs: Math.round(entry.ctimeMs * 1000),
	dev: entry.dev,
	ino: entry.ino,
	mtimeUs: Math.round(entry.mtimeMs * 1000),
	size: entry.size,
});

const sameIdentity = (entry: FileIdentity, other: FileIdentity): boolean =>
	entry.dev === other.dev && entry.ino === other.ino;

const sameCopy = (entry: CopyIdentity, other: CopyIdentity): boolean =>
	sameIdentity(entry, other) &&
	entry.ctimeUs === other.ctimeUs &&
	entry.mtimeUs === other.mtimeUs &&
	entry.size === other.size;

const lstatOrNull = (path: string): Stats | null => {
	try {
		return lstatSync(path);
	} catch (error) {
		if (missing(error)) {
			return null;
		}
		throw error;
	}
};

const removeIfPresent = (path: string): void => {
	try {
		unlinkSync(path);
	} catch (error) {
		if (!missing(error)) {
			throw error;
		}
	}
};

// Filesystems such as exFAT, SMB, and 9p report these when hard links are unavailable.
const unsupportedLinkCodes = [
	'EXDEV',
	'EPERM',
	'ENOTSUP',
	'EOPNOTSUPP',
	'ENOSYS',
];

/**
 * Create the target exclusively, write its contents, then record its identity.
 * The record lets recovery tell this copy apart from a file created by anyone
 * else. A crash before the record leaves a file recovery won't claim; when it
 * is complete, the next plan accepts it as matching.
 */
const publishCopy = (target: string, content: string, record: string): void => {
	const descriptor = openExclusive(target, 0o644);
	// The open descriptor keeps this inode alive, so it cannot be reused yet.
	const opened = identityOf(fstatSync(descriptor));
	try {
		writeAll(descriptor, content);
		const created = copyIdentityOf(fstatSync(descriptor));
		writeExclusive(record, JSON.stringify(created), 0o600);
	} catch (error) {
		// Without a record, recovery cannot prove ownership, so remove the copy now.
		const current = lstatOrNull(target);
		if (current && sameIdentity(identityOf(current), opened)) {
			unlinkSync(target);
		}
		throw error;
	} finally {
		closeSync(descriptor);
	}
};

/** Publish a staged file without replacing anything already at the target. */
const publish = (
	staged: string,
	target: string,
	content: string,
	record: string
): void => {
	try {
		// Exclusive hard-link publication keeps partial writes out of application files.
		linkSync(staged, target);
	} catch (error) {
		const code = errorCode(error);
		if (!code || !unsupportedLinkCodes.includes(code)) {
			throw error;
		}
		publishCopy(target, content, record);
	}
};

const decodeRecoveryFile = (entry: unknown): PlannedFile => {
	if (
		!entry ||
		typeof entry !== 'object' ||
		!('path' in entry) ||
		typeof entry.path !== 'string' ||
		!('content' in entry) ||
		typeof entry.content !== 'string' ||
		!('exists' in entry) ||
		entry.exists !== false
	) {
		throw new Error('Invalid native generation recovery entry.');
	}
	return { content: entry.content, exists: false, path: entry.path };
};

/** A decoded native generation journal. */
interface RecoveryRecord {
	/** Directories apply may have created, parents first. */
	directories: string[];
	files: PlannedFile[];
}

const invalidRecord = (): Error =>
	new Error(
		'Invalid native generation recovery record. Inspect it before continuing.'
	);

const readRecovery = (root: string, stage: string): RecoveryRecord => {
	if (
		!lstatSync(join(stage, 'journal.json')).isFile() ||
		lstatSync(join(stage, 'journal.json')).isSymbolicLink()
	) {
		throw new Error(
			'Native generation recovery record must be a regular file.'
		);
	}
	const journal: unknown = JSON.parse(
		readFileSync(join(stage, 'journal.json'), 'utf8')
	);
	if (
		!journal ||
		typeof journal !== 'object' ||
		!('version' in journal) ||
		journal.version !== 1 ||
		!('root' in journal) ||
		journal.root !== root ||
		!('files' in journal) ||
		!Array.isArray(journal.files)
	) {
		throw invalidRecord();
	}
	const files: PlannedFile[] = [];
	const seen: string[] = [];
	for (const entry of journal.files) {
		const file = decodeRecoveryFile(entry);
		const target = targetPath(root, file.path);
		registerTarget(seen, target);
		files.push(file);
	}
	const directories: string[] = [];
	if ('directories' in journal) {
		if (!Array.isArray(journal.directories)) {
			throw invalidRecord();
		}
		for (const entry of journal.directories) {
			if (typeof entry !== 'string') {
				throw invalidRecord();
			}
			// Only ancestors of journaled files can have been created by apply.
			const directory = targetPath(root, entry);
			if (!seen.some((target) => target.startsWith(`${directory}${sep}`))) {
				throw invalidRecord();
			}
			directories.push(entry);
		}
	}
	return { directories, files };
};

const stageEntry = /^(?:0|[1-9][0-9]*)\.(?:tmp|copy)$/u;

/**
 * Reject anything in the stage apply could not have written.
 * @returns The number of file slots the staged entries cover.
 */
const validateStage = (stage: string, count: number | null): number => {
	let slots = 0;
	for (const name of readdirSync(stage)) {
		const entry = lstatSync(join(stage, name));
		const index = stageEntry.test(name) ? Number(name.split('.')[0]) : -1;
		if (
			!entry.isFile() ||
			entry.isSymbolicLink() ||
			(name !== 'journal.json' &&
				(index < 0 || (count !== null && index >= count)))
		) {
			throw new Error(
				'Unexpected contents in the native generation recovery directory.'
			);
		}
		slots = Math.max(slots, index + 1);
	}
	return slots;
};

/** Remove temps and copy records first and the journal last, then the stage. */
const removeStage = (stage: string, count: number): void => {
	for (let index = 0; index < count; index += 1) {
		removeIfPresent(join(stage, `${index}.copy`));
		removeIfPresent(join(stage, `${index}.tmp`));
	}
	removeIfPresent(join(stage, 'journal.json'));
	rmdirSync(stage);
};

const readCopyIdentity = (
	stage: string,
	index: number
): CopyIdentity | null => {
	const record = readExisting(join(stage, `${index}.copy`));
	if (record === null) {
		return null;
	}
	let identity: unknown;
	try {
		identity = JSON.parse(record);
	} catch {
		// A torn record cannot prove ownership.
		return null;
	}
	if (
		!identity ||
		typeof identity !== 'object' ||
		!('dev' in identity) ||
		typeof identity.dev !== 'number' ||
		!('ino' in identity) ||
		typeof identity.ino !== 'number' ||
		!('ctimeUs' in identity) ||
		typeof identity.ctimeUs !== 'number' ||
		!('mtimeUs' in identity) ||
		typeof identity.mtimeUs !== 'number' ||
		!('size' in identity) ||
		typeof identity.size !== 'number'
	) {
		return null;
	}
	return {
		ctimeUs: identity.ctimeUs,
		dev: identity.dev,
		ino: identity.ino,
		mtimeUs: identity.mtimeUs,
		size: identity.size,
	};
};

/**
 * Find a target this transaction published.
 * @returns The target path, or null when it is absent or belongs to someone else.
 * @throws {Error} When a file this transaction published was edited.
 */
const ownedTarget = (
	root: string,
	stage: string,
	file: PlannedFile,
	index: number
): string | null => {
	const target = targetPath(root, file.path);
	const published = lstatOrNull(target);
	// Apply writes each temp before publishing it, so a missing temp means the
	// target was never published by this transaction.
	const staged = lstatOrNull(join(stage, `${index}.tmp`));
	if (!published || !staged) {
		return null;
	}
	const copied = readCopyIdentity(stage, index);
	if (
		!sameIdentity(identityOf(published), identityOf(staged)) &&
		!(copied && sameCopy(copyIdentityOf(published), copied))
	) {
		return null;
	}
	if (!published.isFile() || readExisting(target) !== file.content) {
		throw new Error(`Generated file changed since apply: ${file.path}`);
	}
	return target;
};

const removeEmptyDirectory = (root: string, directory: string): void => {
	const target = targetPath(root, directory);
	const entry = lstatOrNull(target);
	if (!entry || !entry.isDirectory() || readdirSync(target).length) {
		return;
	}
	try {
		rmdirSync(target);
	} catch (error) {
		if (!missing(error) && errorCode(error) !== 'ENOTEMPTY') {
			throw error;
		}
	}
};

/**
 * Restore an interrupted apply without overwriting intervening application changes.
 * Files and directories created by someone else are left in place.
 * @param projectRoot Application directory used by the original apply.
 * @returns Whether a native generation transaction was recovered.
 * @throws {Error} For invalid records, symlinks, or generated files edited since apply.
 */
export const recoverGeneration = (projectRoot: string): boolean => {
	const root = realpathSync(projectRoot);
	const stage = stagePath(root);
	if (!lstatOrNull(stage)) {
		return false;
	}
	let record: RecoveryRecord;
	try {
		record = readRecovery(root, stage);
	} catch (error) {
		if (!missing(error) && !(error instanceof SyntaxError)) {
			throw error;
		}
		// Without a complete journal, ownership of application files cannot be
		// established, so they stay. Temps and copy records left without a journal
		// are safe to delete: published hard links keep their contents. Apply
		// completes the journal before staging any file, so a partial journal
		// next to staged files needs inspection.
		removeStage(stage, validateStage(stage, missing(error) ? null : 0));
		return true;
	}
	const { directories, files } = record;
	validateStage(stage, files.length);
	// Validate the entire record and current state before removing any file.
	const owned = files.map((file, index) =>
		ownedTarget(root, stage, file, index)
	);
	for (let index = files.length - 1; index >= 0; index -= 1) {
		const file = files[index];
		if (!file) {
			throw new Error('Missing recovery entry.');
		}
		if (owned[index]) {
			const target = ownedTarget(root, stage, file, index);
			if (target) {
				unlinkSync(target);
			}
		}
	}
	for (let index = directories.length - 1; index >= 0; index -= 1) {
		const directory = directories[index];
		if (directory) {
			removeEmptyDirectory(root, directory);
		}
	}
	removeStage(stage, files.length);
	return true;
};

/** List directories that publishing these files would create, parents first. */
const missingDirectories = (root: string, files: PlannedFile[]): string[] => {
	const directories: string[] = [];
	for (const file of files) {
		const segments = relative(root, dirname(targetPath(root, file.path)))
			.split(sep)
			.filter(Boolean);
		for (let depth = 1; depth <= segments.length; depth += 1) {
			const directory = segments.slice(0, depth).join('/');
			if (
				!directories.includes(directory) &&
				!lstatOrNull(join(root, directory))
			) {
				directories.push(directory);
			}
		}
	}
	return directories;
};

/**
 * Apply a reviewed plan, publishing complete files without replacing existing ones.
 * Uses exclusive hard links, or exclusive copies where hard links are unsupported.
 * @param plan Application plan produced by planGeneration.
 * @returns Paths created inside the application.
 * @throws {Error} For stale plans, conflicts, interrupted applies, or failed writes.
 * When rollback also fails, the error names both failures and keeps the original as `cause`.
 */
export const applyGeneration = (plan: ApplicationPlan): string[] => {
	if (realpathSync(plan.root) !== plan.root) {
		throw new Error('Application root changed since planning.');
	}
	readFileSync(targetPath(plan.root, 'package.json'), 'utf8');
	requireNoRecovery(plan.root);
	const seen: string[] = [];
	for (const file of plan.files) {
		const target = targetPath(plan.root, file.path);
		registerTarget(seen, target);
		const current = readExisting(target);
		if (current !== (file.exists ? file.content : null)) {
			throw new Error(`File changed since planning: ${file.path}`);
		}
	}
	const files = plan.files.filter((file) => !file.exists);
	if (!files.length) {
		return [];
	}
	const directories = missingDirectories(plan.root, files);
	const stage = stagePath(plan.root);
	mkdirSync(stage, { mode: 0o700 });
	const journal = join(stage, 'journal.json');
	try {
		writeExclusive(
			journal,
			JSON.stringify({ directories, files, root: plan.root, version: 1 }),
			0o600
		);
		for (let index = 0; index < files.length; index += 1) {
			const file = files[index];
			if (!file) {
				throw new Error('Missing generation entry.');
			}
			const target = targetPath(plan.root, file.path);
			mkdirSync(dirname(target), { recursive: true });
			targetPath(plan.root, file.path);
			const staged = join(stage, `${index}.tmp`);
			writeExclusive(staged, file.content, 0o644);
			publish(staged, target, file.content, join(stage, `${index}.copy`));
		}
		validateStage(stage, files.length);
		removeStage(stage, files.length);
		return files.map((file) => file.path);
	} catch (error) {
		try {
			recoverGeneration(plan.root);
		} catch (recoveryError) {
			// The message names both failures; `cause` keeps the original error.
			// oxlint-disable-next-line preserve-caught-error
			throw new Error(
				`Generation failed (${describeError(error)}) and recovery needs inspection (${describeError(recoveryError)}). The recovery record was preserved.`,
				{ cause: error }
			);
		}
		throw error;
	}
};
