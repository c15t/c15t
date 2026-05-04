/**
 * Async commands exposed at `kernel.commands.*`.
 *
 * Commands are the I/O boundary of the kernel: each one optionally
 * delegates to a transport for network I/O, but otherwise operates on
 * snapshot data only. Commands are responsible for emitting their
 * lifecycle events (`*:started`, `*:completed`, `command:error`).
 *
 * The save command's input ladder (`'all' | 'none' | partial | undefined`)
 * is extracted into the pure helper `resolveSavePatch` so each branch
 * can be unit-tested without standing up a full kernel.
 */
import { generateSubjectId } from '../../libs/generate-subject-id';
import { allConsentNames } from '../../types/consent-types';
import type {
	ConsentSnapshot,
	ConsentState,
	InitContext,
	InitResult,
	KernelEvent,
	KernelTransport,
	KernelUser,
	SavePayload,
	SaveResult,
} from '../types';
import { applyInitResponse } from './apply-init-response';
import type { SnapshotPatch } from './patch';

/**
 * Result of resolving a `save()` input against the current snapshot.
 * The patch is what the kernel should advance through; `consentAction`
 * is the audit-log shape sent to the backend in the save payload.
 */
export interface ResolvedSave {
	patch: SnapshotPatch;
	consentAction: SavePayload['consentAction'];
}

/**
 * Pure: derive the snapshot patch and consent-action from a `save()`
 * input. Called by the save command before any transport I/O.
 *
 * Branches:
 * - `'all'` — every category becomes `true`, action is `all`.
 * - `'none'` — only `necessary` stays `true`, action is `necessary`.
 * - object — applied as a partial consent merge; if no category
 *   changed, only metadata (subjectId / hasConsented / activeUI)
 *   is updated. Action is `custom`.
 * - `undefined` — finalize the current consents in place. Action
 *   is `custom`.
 */
export function resolveSavePatch(
	current: ConsentSnapshot,
	subjectId: string,
	input: Partial<ConsentState> | 'all' | 'none' | undefined
): ResolvedSave {
	if (input === 'all') {
		const all: ConsentState = { ...current.consents };
		for (const name of allConsentNames) all[name] = true;
		return {
			patch: {
				consents: all,
				subjectId,
				hasConsented: true,
				activeUI: 'none',
			},
			consentAction: 'all',
		};
	}

	if (input === 'none') {
		const none: ConsentState = { ...current.consents };
		for (const name of allConsentNames) {
			none[name] = name === 'necessary';
		}
		return {
			patch: {
				consents: none,
				subjectId,
				hasConsented: true,
				activeUI: 'none',
			},
			consentAction: 'necessary',
		};
	}

	if (input && typeof input === 'object') {
		const next: ConsentState = { ...current.consents };
		let changed = false;
		for (const name of allConsentNames) {
			if (
				name in input &&
				typeof input[name] === 'boolean' &&
				next[name] !== input[name]
			) {
				next[name] = input[name] as boolean;
				changed = true;
			}
		}
		if (changed) {
			return {
				patch: {
					consents: next,
					subjectId,
					hasConsented: true,
					activeUI: 'none',
				},
				consentAction: 'custom',
			};
		}
		// No category changed — finalize metadata only. Pick the
		// minimal patch that still reflects intent (consent finalized,
		// UI dismissed, subject ID assigned).
		if (!current.hasConsented) {
			return {
				patch: { subjectId, hasConsented: true, activeUI: 'none' },
				consentAction: 'custom',
			};
		}
		if (current.activeUI !== 'none') {
			return {
				patch: { subjectId, activeUI: 'none' },
				consentAction: 'custom',
			};
		}
		if (current.subjectId !== subjectId) {
			return { patch: { subjectId }, consentAction: 'custom' };
		}
		return { patch: {}, consentAction: 'custom' };
	}

	return {
		patch: { subjectId, hasConsented: true, activeUI: 'none' },
		consentAction: 'custom',
	};
}

/**
 * Dependencies required by `buildCommands`. The kernel index supplies
 * a getter for the live snapshot, the `advance` function, the event
 * emitter, and the optional transport.
 */
export interface CommandDeps {
	getSnapshot: () => ConsentSnapshot;
	advance: (patch: SnapshotPatch) => void;
	emit: (event: KernelEvent) => void;
	transport: KernelTransport | undefined;
}

/**
 * Build the `kernel.commands.*` object given the kernel's runtime deps.
 */
export function buildCommands(deps: CommandDeps) {
	const { getSnapshot, advance, emit, transport } = deps;

	return {
		async init(): Promise<InitResult> {
			emit({ type: 'command:init:started' });

			if (!transport?.init) {
				const result: InitResult = { ok: true };
				emit({ type: 'command:init:completed', result });
				return result;
			}

			try {
				const snapshot = getSnapshot();
				const ctx: InitContext = {
					overrides: snapshot.overrides,
					user: snapshot.user,
				};
				const response = await transport.init(ctx);
				const patch = applyInitResponse(getSnapshot(), response);
				if (patch) {
					advance(patch);
					emit({ type: 'init:applied', snapshot: getSnapshot() });
				}
				const result: InitResult = { ok: true };
				emit({ type: 'command:init:completed', result });
				return result;
			} catch (error) {
				emit({ type: 'command:error', command: 'init', error });
				const result: InitResult = { ok: false, error };
				emit({ type: 'command:init:completed', result });
				return result;
			}
		},

		async save(
			input?: Partial<ConsentState> | 'all' | 'none'
		): Promise<SaveResult> {
			emit({ type: 'command:save:started' });

			const beforeSnapshot = getSnapshot();
			const subjectId = beforeSnapshot.subjectId ?? generateSubjectId();
			const uiSource = beforeSnapshot.activeUI;

			const { patch, consentAction } = resolveSavePatch(
				beforeSnapshot,
				subjectId,
				input
			);
			if (Object.keys(patch).length > 0) {
				advance(patch);
			}

			const after = getSnapshot();

			if (!transport?.save) {
				const result: SaveResult = { ok: true, subjectId };
				emit({ type: 'command:save:completed', result });
				return result;
			}

			try {
				const payload: SavePayload = {
					subjectId,
					consents: after.consents,
					overrides: after.overrides,
					user: after.user,
					model: after.model,
					uiSource,
					consentAction,
					policySnapshotToken: after.policySnapshotToken,
					tcString: after.iab?.tcString ?? null,
				};
				const result = await transport.save(payload);
				if (result.subjectId && result.subjectId !== getSnapshot().subjectId) {
					advance({ subjectId: result.subjectId });
				}
				emit({ type: 'command:save:completed', result });
				return result;
			} catch (error) {
				emit({ type: 'command:error', command: 'save', error });
				const result: SaveResult = { ok: false };
				emit({ type: 'command:save:completed', result });
				return result;
			}
		},

		async identify(user: KernelUser): Promise<void> {
			advance({ user: { ...user } });
			emit({ type: 'user:identified', snapshot: getSnapshot() });
			if (transport?.identify) {
				try {
					await transport.identify({ ...user });
				} catch (error) {
					emit({ type: 'command:error', command: 'identify', error });
				}
			}
		},
	};
}
