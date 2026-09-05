import type { ConsentSnapshot, KernelEvent, SaveResult } from '@c15t/core';

import { serializeDiagnostic } from './serialization';
import type { DevToolsEvent } from './state-manager';

const EVENT_TYPES = [
	'records:cleared',
	'choice:recorded',
	'permissions:changed',
	'notice:dismissed',
	'privacy:opt-out',
	'overrides:set',
	'user:identified',
	'subject:resolved',
	'iab:set',
	'init:applied',
	'init:failed',
	'save:replayed',
	'command:init:started',
	'command:init:completed',
	'command:save:started',
	'command:save:completed',
	'command:error',
] as const satisfies readonly KernelEvent['type'][];

/** A new kernel event must also be added to the capture list. */
export const KERNEL_EVENT_TYPES: Exclude<
	KernelEvent['type'],
	(typeof EVENT_TYPES)[number]
> extends never
	? typeof EVENT_TYPES
	: never = EVENT_TYPES;

// oxlint-disable-next-line func-style -- Named conversion helpers aid stack traces.
function snapshotData(snapshot: ConsentSnapshot): Record<string, unknown> {
	return {
		activeUI: snapshot.activeUI,
		effectivePermissions: snapshot.effectivePermissions,
		explicitChoice: snapshot.explicitChoice,
		model: snapshot.model,
		noticeDismissal: snapshot.noticeDismissal,
		optOutDirectives: snapshot.optOutDirectives,
		privacySignals: snapshot.privacySignals,
		promptRequirement: snapshot.promptRequirement,
		resolution: snapshot.resolution.status,
		revision: snapshot.revision,
		subject: snapshot.subject,
	};
}

// oxlint-disable-next-line func-style -- Named conversion helpers aid stack traces.
function resultData(
	result: SaveResult | { ok: boolean }
): Record<string, unknown> {
	return { result: JSON.parse(serializeDiagnostic(result)) as unknown };
}

// oxlint-disable-next-line func-style -- Named conversion helpers aid stack traces.
function errorData(command: string, error: unknown): Record<string, unknown> {
	let message = serializeDiagnostic(error);
	try {
		if (error instanceof Error) {
			const errorMessage: unknown = error.message;
			message =
				typeof errorMessage === 'string'
					? errorMessage
					: serializeDiagnostic(errorMessage);
		} else if (typeof error === 'string') {
			message = error;
		}
	} catch {
		// Keep the safe serialized fallback when an error getter throws.
	}
	return {
		command,
		error: message,
	};
}

const outcomeMessage = (
	ok: boolean,
	success: string,
	failure: string
): string => (ok ? success : failure);

/**
 * Converts a kernel event into the stable log shape shown by DevTools.
 *
 * @param event - Event emitted by a consent kernel.
 * @param id - Instance-local event identifier.
 * @param timestamp - Capture time in milliseconds.
 * @returns A serializable DevTools event.
 */
// oxlint-disable-next-line func-style -- Preserve the public conversion function declaration.
export function kernelEventToDevToolsEvent(
	event: KernelEvent,
	id: string,
	timestamp: number
): DevToolsEvent {
	// oxlint-disable-next-line default-case -- KernelEvent is a discriminated union handled exhaustively.
	switch (event.type) {
		case 'records:cleared':
			return {
				id,
				message: 'Stored records cleared',
				timestamp,
				type: event.type,
			};
		case 'choice:recorded':
			return {
				data: {
					...snapshotData(event.snapshot),
					actionAt: event.actionAt,
					confirmed: event.confirmed,
				},
				id,
				message: 'Explicit choice recorded',
				timestamp,
				type: event.type,
			};
		case 'permissions:changed':
			return {
				data: { ...snapshotData(event.snapshot), previous: event.previous },
				id,
				message: 'Effective permissions changed',
				timestamp,
				type: event.type,
			};
		case 'notice:dismissed':
			return {
				data: { ...snapshotData(event.snapshot), dismissal: event.dismissal },
				id,
				message: 'Local notice dismissed',
				timestamp,
				type: event.type,
			};
		case 'privacy:opt-out':
			return {
				data: { ...snapshotData(event.snapshot), directive: event.directive },
				id,
				message: 'Privacy opt-out recorded',
				timestamp,
				type: event.type,
			};
		case 'subject:resolved':
			return {
				data: snapshotData(event.snapshot),
				id,
				message: 'Canonical subject resolved',
				timestamp,
				type: event.type,
			};
		case 'overrides:set':
			return {
				data: snapshotData(event.snapshot),
				id,
				message: 'Location overrides changed',
				timestamp,
				type: event.type,
			};
		case 'user:identified':
			return {
				data: snapshotData(event.snapshot),
				id,
				message: 'User identified',
				timestamp,
				type: event.type,
			};
		case 'iab:set':
			return {
				data: snapshotData(event.snapshot),
				id,
				message: 'IAB state changed',
				timestamp,
				type: event.type,
			};
		case 'init:applied':
			return {
				data: snapshotData(event.snapshot),
				id,
				message: 'Initialization result applied',
				timestamp,
				type: event.type,
			};
		case 'command:init:started':
			return {
				id,
				message: 'Initialization started',
				timestamp,
				type: event.type,
			};
		case 'init:failed':
			return {
				data: {
					...errorData('init', event.error),
					attempt: event.attempt,
					nextRetryMs: event.nextRetryMs,
				},
				id,
				message: 'Initialization failed',
				timestamp,
				type: event.type,
			};
		case 'save:replayed':
			return {
				data: { ok: event.ok, subjectId: event.subjectId },
				id,
				message: outcomeMessage(
					event.ok,
					'Queued consent saved',
					'Queued consent save failed'
				),
				timestamp,
				type: event.type,
			};
		case 'command:init:completed':
			return {
				data: resultData(event.result),
				id,
				message: outcomeMessage(
					event.result.ok,
					'Initialization completed',
					'Initialization failed'
				),
				timestamp,
				type: event.type,
			};
		case 'command:save:started':
			return {
				id,
				message: 'Consent save started',
				timestamp,
				type: event.type,
			};
		case 'command:save:completed':
			return {
				data: resultData(event.result),
				id,
				message: outcomeMessage(
					event.result.ok,
					'Consent save completed',
					'Consent save failed'
				),
				timestamp,
				type: event.type,
			};
		case 'command:error':
			return {
				data: errorData(event.command, event.error),
				id,
				message: `${event.command} command failed`,
				timestamp,
				type: event.type,
			};
	}
}
