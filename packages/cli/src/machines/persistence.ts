/**
 * State persistence utilities for CLI state machines
 *
 * Enables saving and loading machine snapshots for resume functionality.
 */

import path from 'node:path';
import type { AnyStateMachine, Snapshot, SnapshotFrom } from 'xstate';

/** Default persistence file name */
const DEFAULT_PERSIST_FILENAME = '.c15t-state.json';

/**
 * Persisted state structure
 */
export interface PersistedState<T = unknown> {
	/** Machine ID this state belongs to */
	machineId: string;
	/** Version for migration support */
	version: number;
	/** Timestamp when state was saved */
	savedAt: number;
	/** The actual snapshot data */
	snapshot: T;
}

/**
 * Get the persistence file path for a project
 */
export function getPersistPath(projectRoot: string): string {
	return path.join(projectRoot, DEFAULT_PERSIST_FILENAME);
}

/**
 * Fields to exclude from persistence (non-serializable or runtime-only)
 */
const NON_SERIALIZABLE_FIELDS = new Set([
	'cliContext',
	'spinner',
	'_parent',
	'_actorScope',
	'_processingStatus',
	'_systemId',
	'logic',
	'src',
	'system',
	'self',
	'_snapshot',
]);

/**
 * Create a serializable copy of the snapshot, handling cycles
 */
function makeSerializable(obj: unknown, seen = new WeakSet<object>()): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj !== 'object') {
		return obj;
	}

	// Detect cycles
	if (seen.has(obj as object)) {
		return '[Circular]';
	}
	seen.add(obj as object);

	if (Array.isArray(obj)) {
		return obj.map((item) => makeSerializable(item, seen));
	}

	// Handle Date objects
	if (obj instanceof Date) {
		return obj.toISOString();
	}

	// Handle Map
	if (obj instanceof Map) {
		return Object.fromEntries(
			Array.from(obj.entries()).map(([k, v]) => [k, makeSerializable(v, seen)])
		);
	}

	// Handle Set
	if (obj instanceof Set) {
		return Array.from(obj).map((v) => makeSerializable(v, seen));
	}

	// Handle regular objects
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
		// Skip non-serializable fields
		if (NON_SERIALIZABLE_FIELDS.has(key)) {
			continue;
		}

		// Skip functions and symbols
		if (typeof value === 'function' || typeof value === 'symbol') {
			continue;
		}

		// Recursively process nested objects
		result[key] = makeSerializable(value, seen);
	}

	return result;
}

/**
 * Save a machine snapshot to disk
 */
export async function saveSnapshot<TMachine extends AnyStateMachine>(
	snapshot: SnapshotFrom<TMachine>,
	machineId: string,
	persistPath: string
): Promise<void> {
	const fs = await import('node:fs/promises');

	// Create a serializable version of the snapshot
	const serializableSnapshot = makeSerializable(snapshot);

	const persisted: PersistedState = {
		machineId,
		version: 1,
		savedAt: Date.now(),
		snapshot: serializableSnapshot,
	};

	await fs.writeFile(persistPath, JSON.stringify(persisted, null, 2), 'utf-8');
}

/**
 * Load a machine snapshot from disk
 *
 * @returns The snapshot if found and valid, null otherwise
 */
export async function loadSnapshot<TSnapshot>(
	persistPath: string,
	machineId: string
): Promise<TSnapshot | null> {
	const fs = await import('node:fs/promises');

	try {
		const content = await fs.readFile(persistPath, 'utf-8');
		const persisted = JSON.parse(content) as PersistedState<TSnapshot>;

		// Validate machine ID matches
		if (persisted.machineId !== machineId) {
			return null;
		}

		// Check if state is too old (24 hours)
		const maxAge = 24 * 60 * 60 * 1000;
		if (Date.now() - persisted.savedAt > maxAge) {
			// State is stale, remove it
			await clearSnapshot(persistPath);
			return null;
		}

		return persisted.snapshot;
	} catch {
		// File doesn't exist or is invalid
		return null;
	}
}

/**
 * Clear a persisted snapshot
 */
export async function clearSnapshot(persistPath: string): Promise<void> {
	const fs = await import('node:fs/promises');

	try {
		await fs.unlink(persistPath);
	} catch {
		// File doesn't exist, ignore
	}
}

/**
 * Check if a persisted state exists
 */
export async function hasPersistedState(persistPath: string): Promise<boolean> {
	const fs = await import('node:fs/promises');

	try {
		await fs.access(persistPath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get metadata about persisted state without loading full snapshot
 */
export async function getPersistedStateInfo(
	persistPath: string
): Promise<{ machineId: string; savedAt: Date } | null> {
	const fs = await import('node:fs/promises');

	try {
		const content = await fs.readFile(persistPath, 'utf-8');
		const persisted = JSON.parse(content) as PersistedState;

		return {
			machineId: persisted.machineId,
			savedAt: new Date(persisted.savedAt),
		};
	} catch {
		return null;
	}
}

/**
 * Snapshot type for persistence subscriber
 */
interface PersistableSnapshot {
	value: unknown;
}

/**
 * Create a persistence middleware that auto-saves on state transitions
 */
export function createPersistenceSubscriber(
	machineId: string,
	persistPath: string,
	options: {
		/** States to persist (if not provided, persist all states) */
		persistStates?: string[];
		/** States to skip persisting */
		skipStates?: string[];
	} = {}
) {
	const { persistStates, skipStates = ['exited', 'complete', 'error'] } =
		options;

	return (snapshot: PersistableSnapshot) => {
		const stateValue = String(snapshot.value);

		// Skip final states
		if (skipStates.includes(stateValue)) {
			// Clear persisted state on completion
			clearSnapshot(persistPath).catch(() => {});
			return;
		}

		// Only persist specific states if configured
		if (persistStates && !persistStates.includes(stateValue)) {
			return;
		}

		// Save the snapshot
		saveSnapshot(
			snapshot as unknown as SnapshotFrom<AnyStateMachine>,
			machineId,
			persistPath
		).catch((error) => {
			console.error('Failed to persist state:', error);
		});
	};
}
