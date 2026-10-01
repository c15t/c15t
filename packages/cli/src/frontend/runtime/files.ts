import {
	closeSync,
	constants,
	fsyncSync,
	linkSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	realpathSync,
	rmSync,
	unlinkSync,
	writeSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import type { GenerationPlan } from '../../generate';
import { getInstallSpecifier } from '../../generate/dependencies';

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

const missing = (error: unknown): boolean =>
	error instanceof Error &&
	(('code' in error && error.code === 'ENOENT') ||
		error.message.startsWith('ENOENT:'));

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
	const seen: string[] = [];
	for (const name of Object.keys(generation.files)) {
		const target = targetPath(root, name);
		registerTarget(seen, target);
		const content = generation.files[name];
		if (typeof content !== 'string') {
			throw new Error(`Invalid generated contents: ${name}`);
		}
		const current = readExisting(target);
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
		instructions: generation.instructions.slice(),
		root,
	};
};

const writeExclusive = (path: string, content: string, mode: number): void => {
	const descriptor = openSync(
		path,
		// Numeric exclusive-open flags compile statically with scriptc.
		// oxlint-disable-next-line no-bitwise
		constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
		mode
	);
	try {
		const bytes = new TextEncoder().encode(content);
		let offset = 0;
		while (offset < bytes.length) {
			const written = writeSync(
				descriptor,
				bytes,
				offset,
				bytes.length - offset
			);
			if (written <= 0) {
				throw new Error('Could not finish staging a generated file.');
			}
			offset += written;
		}
		fsyncSync(descriptor);
	} finally {
		closeSync(descriptor);
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

const readRecovery = (root: string, stage: string): PlannedFile[] => {
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
		throw new Error(
			'Invalid native generation recovery record. Inspect it before continuing.'
		);
	}
	const files: PlannedFile[] = [];
	const seen: string[] = [];
	for (const entry of journal.files) {
		const file = decodeRecoveryFile(entry);
		const target = targetPath(root, file.path);
		registerTarget(seen, target);
		files.push(file);
	}
	return files;
};

const validateStage = (stage: string, files: PlannedFile[]): void => {
	const allowed = [
		'journal.json',
		...files.map((_file, index) => `${index}.tmp`),
	];
	for (const name of readdirSync(stage)) {
		const entry = lstatSync(join(stage, name));
		if (!allowed.includes(name) || !entry.isFile() || entry.isSymbolicLink()) {
			throw new Error(
				'Unexpected contents in the native generation recovery directory.'
			);
		}
	}
};

const checkOwnedFile = (
	root: string,
	stage: string,
	file: PlannedFile,
	index: number
): void => {
	const target = targetPath(root, file.path);
	const current = readExisting(target);
	if (current === null) {
		return;
	}
	const published = lstatSync(target);
	const staged = lstatSync(join(stage, `${index}.tmp`));
	if (
		current !== file.content ||
		published.dev !== staged.dev ||
		published.ino !== staged.ino
	) {
		throw new Error(`Generated file changed since apply: ${file.path}`);
	}
};

/**
 * Restore an interrupted apply without overwriting intervening application changes.
 * @param projectRoot Application directory used by the original apply.
 * @returns Whether a native generation transaction was recovered.
 * @throws {Error} For invalid records, symlinks, or generated files edited since apply.
 */
export const recoverGeneration = (projectRoot: string): boolean => {
	const root = realpathSync(projectRoot);
	const stage = stagePath(root);
	try {
		lstatSync(stage);
	} catch (error) {
		if (missing(error)) {
			return false;
		}
		throw error;
	}
	const files = readRecovery(root, stage);
	validateStage(stage, files);
	// Validate the entire record and current state before removing any file.
	for (let index = 0; index < files.length; index += 1) {
		const file = files[index];
		if (file) {
			checkOwnedFile(root, stage, file, index);
		}
	}
	for (let index = files.length - 1; index >= 0; index -= 1) {
		const file = files[index];
		if (!file) {
			throw new Error('Missing recovery entry.');
		}
		checkOwnedFile(root, stage, file, index);
		const target = targetPath(root, file.path);
		const current = readExisting(target);
		if (current === file.content) {
			unlinkSync(target);
		} else if (current !== null) {
			throw new Error(`Generated file changed during recovery: ${file.path}`);
		}
	}
	rmSync(stage, { recursive: true });
	return true;
};

/**
 * Apply a reviewed plan, publishing complete files without replacing existing ones.
 * @param plan Application plan produced by planGeneration.
 * @returns Paths created inside the application.
 * @throws {Error} For stale plans, conflicts, interrupted applies, or failed writes.
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
	const stage = stagePath(plan.root);
	mkdirSync(stage, { mode: 0o700 });
	const journal = join(stage, 'journal.json');
	writeExclusive(
		journal,
		JSON.stringify({ files, root: plan.root, version: 1 }),
		0o600
	);
	try {
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
			// Exclusive hard-link publication keeps partial writes out of application files.
			linkSync(staged, target);
		}
		validateStage(stage, files);
		rmSync(stage, { recursive: true });
		return files.map((file) => file.path);
	} catch (error) {
		try {
			recoverGeneration(plan.root);
		} catch {
			throw new Error(
				'Generation failed and recovery needs inspection. The recovery record was preserved.'
			);
		}
		throw error;
	}
};
