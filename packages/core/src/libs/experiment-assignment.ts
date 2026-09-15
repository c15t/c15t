/**
 * Sticky experiment assignment for a browser.
 *
 * The kernel is pure, so the arm a visitor runs is decided here, in the
 * runtime layer, and stored under {@link EXPERIMENT_STORAGE_KEY} so the
 * same browser lands in the same arm on every visit. A host-resolved
 * `variant` always wins and overwrites the stored arm; built-in assignment
 * reuses the stored arm for the same experiment id and otherwise hashes a
 * stable key: the hydrated subject id when one exists, else a random key
 * kept in the record.
 */
import type { ConsentKernel } from '../types';
import { getRawCookieValue, setCookie } from './cookie';
import type { StorageConfig } from './cookie';
import { assignExperimentVariant, validateExperiment } from './experiment';
import type {
	ConsentExperiment,
	ExperimentAssignment,
	ExperimentDiagnostics,
	ValidateExperimentOptions,
} from './experiment';

/** localStorage key (and cookie name fallback) of the stored assignment. */
export const EXPERIMENT_STORAGE_KEY = 'c15t-experiment-v1';

/** What the browser keeps between visits. */
export interface StoredExperimentAssignment extends ExperimentAssignment {
	/** Stable key built-in assignment hashed. Absent for a host-resolved arm. */
	key?: string;
}

const isStoredAssignment = function isStoredAssignment(
	value: unknown
): value is StoredExperimentAssignment {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.variant === 'string' &&
		(record.assignedBy === 'host' || record.assignedBy === 'c15t') &&
		typeof record.acknowledgedDiagnostics === 'boolean' &&
		(record.key === undefined || typeof record.key === 'string')
	);
};

const parseStored = function parseStored(
	raw: string | null | undefined
): StoredExperimentAssignment | null {
	if (!raw) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return isStoredAssignment(parsed) ? parsed : null;
	} catch {
		return null;
	}
};

const localStorageAvailable = function localStorageAvailable(): boolean {
	try {
		return typeof localStorage !== 'undefined' && localStorage !== null;
	} catch {
		return false;
	}
};

/**
 * Read the stored assignment, from localStorage first and the cookie
 * fallback second. Never throws; unreadable storage reads as no record.
 */
export const readStoredExperimentAssignment =
	function readStoredExperimentAssignment(): StoredExperimentAssignment | null {
		if (localStorageAvailable()) {
			try {
				const stored = parseStored(
					localStorage.getItem(EXPERIMENT_STORAGE_KEY)
				);
				if (stored) {
					return stored;
				}
			} catch {
				// Fall through to the cookie.
			}
		}
		const raw = getRawCookieValue(EXPERIMENT_STORAGE_KEY);
		if (!raw) {
			return null;
		}
		try {
			return parseStored(decodeURIComponent(raw));
		} catch {
			return null;
		}
	};

/**
 * Persist an assignment. Writes localStorage when available and falls back
 * to a cookie otherwise. Never throws.
 */
export const writeStoredExperimentAssignment =
	function writeStoredExperimentAssignment(
		record: StoredExperimentAssignment,
		storageConfig?: StorageConfig
	): void {
		const serialized = JSON.stringify(record);
		if (localStorageAvailable()) {
			try {
				localStorage.setItem(EXPERIMENT_STORAGE_KEY, serialized);
				return;
			} catch {
				// Quota or blocked storage: keep the cookie as the fallback.
			}
		}
		setCookie(
			EXPERIMENT_STORAGE_KEY,
			encodeURIComponent(serialized),
			undefined,
			storageConfig
		);
	};

const randomKey = function randomKey(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	let hex = '';
	for (const byte of bytes) {
		hex += byte.toString(16).padStart(2, '0');
	}
	return hex;
};

/** Inputs of {@link resolveExperimentAssignment}. */
export interface ResolveExperimentAssignmentInput {
	experiment: ConsentExperiment;
	/** The assignment this browser already stored, if any. */
	stored: StoredExperimentAssignment | null;
	/** The hydrated subject id, when the visitor already has one. */
	subjectId?: string | null;
	/** Random key factory; injectable for tests. */
	createKey?: () => string;
}

/**
 * Decide the arm for this browser without touching storage.
 *
 * - A host `variant` wins and replaces whatever was stored.
 * - A stored arm for the same experiment id is reused when it still exists
 *   in `variants`, so an arm is sticky across sessions.
 * - Otherwise the arm is hashed from the subject id, or from a fresh random
 *   key that the returned record carries for the next visit.
 *
 * @param input - The experiment, the stored record and the subject id.
 * @returns The assignment plus the record to store.
 * @throws {Error} When `experiment.variant` names an undeclared arm.
 */
export const resolveExperimentAssignment = function resolveExperimentAssignment(
	input: ResolveExperimentAssignmentInput
): { assignment: ExperimentAssignment; record: StoredExperimentAssignment } {
	const { experiment, stored } = input;
	const acknowledgedDiagnostics = experiment.acknowledgeDiagnostics === true;
	if (experiment.variant !== undefined) {
		const assignment = assignExperimentVariant(experiment, '');
		const record: StoredExperimentAssignment = { ...assignment };
		if (stored?.id === experiment.id && stored.key) {
			record.key = stored.key;
		}
		return { assignment, record };
	}
	if (stored?.id === experiment.id && stored.variant in experiment.variants) {
		const assignment: ExperimentAssignment = {
			acknowledgedDiagnostics,
			assignedBy: stored.assignedBy,
			id: stored.id,
			variant: stored.variant,
		};
		return { assignment, record: { ...assignment, key: stored.key } };
	}
	const key =
		input.subjectId ||
		(stored?.id === experiment.id ? stored.key : undefined) ||
		(input.createKey ?? randomKey)();
	const assignment = assignExperimentVariant(experiment, key);
	return { assignment, record: { ...assignment, key } };
};

/** Options of {@link createExperimentController}. */
export interface ExperimentControllerOptions extends ValidateExperimentOptions {
	experiment: ConsentExperiment;
	kernel: ConsentKernel;
	storageConfig?: StorageConfig;
	/**
	 * Receives acknowledged diagnostics, once per policy, and an experiment
	 * rejected by a policy that arrived after construction. Defaults to
	 * `console.warn` / `console.error`.
	 */
	report?: {
		warn?: (message: string, diagnostics: ExperimentDiagnostics) => void;
		error?: (error: Error) => void;
	};
}

/** Owns one experiment's validation and assignment for one kernel. */
export interface ExperimentController {
	/**
	 * Assign the arm for this browser and record it on the kernel. Reads
	 * and writes storage, so call it from a mount hook. Idempotent.
	 */
	assign: () => ExperimentAssignment;
	/** Stop watching the policy. */
	dispose: () => void;
}

/**
 * Validate an experiment and prepare its assignment.
 *
 * Construction validates every arm under the kernel's current policy rule
 * — the safe fallback while nothing is resolved — and throws for an
 * unacknowledged arm with diagnostics, so a misconfiguration fails at
 * provider construction. Every later `init:applied` re-validates once per
 * policy id; a rejection then is reported and the arm is cleared so the
 * base presentation renders. A host-resolved `variant` is recorded on the
 * kernel at once; built-in assignment waits for {@link ExperimentController.assign}.
 *
 * @param options - Experiment, kernel and reporting configuration.
 * @returns The controller.
 * @throws {Error} When `experiment.variant` names an undeclared arm, or an
 * unacknowledged arm trips diagnostics under the current policy.
 */
export const createExperimentController = function createExperimentController(
	options: ExperimentControllerOptions
): ExperimentController {
	const { experiment, kernel } = options;
	const warn =
		options.report?.warn ??
		((message: string, diagnostics: ExperimentDiagnostics) => {
			console.warn(message, diagnostics);
		});
	const error =
		options.report?.error ??
		((failure: Error) => {
			console.error(failure);
		});
	const validateOptions: ValidateExperimentOptions = {
		actionAppearance: options.actionAppearance,
		presentation: options.presentation,
	};
	const validated = new Set<string>();
	let rejected = false;
	const validate = function validate(throwing: boolean): void {
		const { policyRule } = kernel.getSnapshot();
		if (validated.has(policyRule.id)) {
			return;
		}
		validated.add(policyRule.id);
		let diagnostics: ExperimentDiagnostics;
		try {
			diagnostics = validateExperiment(experiment, policyRule, validateOptions);
		} catch (failure) {
			if (throwing) {
				throw failure;
			}
			rejected = true;
			error(failure instanceof Error ? failure : new Error(String(failure)));
			kernel.set.experiment(null);
			return;
		}
		if (Object.keys(diagnostics).length > 0) {
			warn(
				`c15t experiment "${experiment.id}": running with acknowledged presentation diagnostics under policy "${policyRule.id}".`,
				diagnostics
			);
		}
	};

	validate(true);
	if (experiment.variant !== undefined) {
		kernel.set.experiment(assignExperimentVariant(experiment, ''));
	}
	const unsubscribe = kernel.events.on('init:applied', () => {
		validate(false);
	});
	let assigned: ExperimentAssignment | null = null;
	return {
		assign() {
			if (assigned) {
				return assigned;
			}
			const { assignment, record } = resolveExperimentAssignment({
				experiment,
				stored: readStoredExperimentAssignment(),
				subjectId: kernel.getSnapshot().subject?.subjectId ?? null,
			});
			writeStoredExperimentAssignment(record, options.storageConfig);
			assigned = assignment;
			if (!rejected) {
				kernel.set.experiment(assignment);
			}
			return assignment;
		},
		dispose() {
			unsubscribe();
		},
	};
};
