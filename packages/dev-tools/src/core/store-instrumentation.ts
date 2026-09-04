/**
 * Kernel Instrumentation
 * Mirrors kernel events into the devtools event log. One subscription per
 * kernel is shared by every devtools instance on the page.
 */

import type { ConsentKernel, KernelEvent } from '@c15t/core';

import type { EventLogEntry } from './state-manager';

type InstrumentationEvent = Omit<EventLogEntry, 'id' | 'timestamp'>;
type InstrumentationListener = (event: InstrumentationEvent) => void;

interface InstrumentationEntry {
	kernel: ConsentKernel;
	listeners: Set<InstrumentationListener>;
	unsubscribe: () => void;
}

type InstrumentationRegistry = Map<string, InstrumentationEntry>;

const REGISTRY_KEY = '__c15tDevToolsInstrumentationRegistry';
let fallbackRegistry: InstrumentationRegistry | null = null;

const getRegistry = function getRegistry(): InstrumentationRegistry {
	if (typeof window === 'undefined') {
		if (!fallbackRegistry) {
			fallbackRegistry = new Map();
		}
		return fallbackRegistry;
	}

	const host = window as unknown as Record<string, unknown>;
	const existing = host[REGISTRY_KEY] as InstrumentationRegistry | undefined;
	if (existing) {
		return existing;
	}
	const registry: InstrumentationRegistry = new Map();
	host[REGISTRY_KEY] = registry;
	return registry;
};

const describeError = function describeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
};

/**
 * Maps a kernel event to a devtools log entry. Returns `null` for events
 * that add no signal on their own (command start markers).
 */
// oxlint-disable-next-line complexity -- The exhaustive event switch keeps each kernel event mapping explicit.
export const kernelEventToLogEntry = function kernelEventToLogEntry(
	event: KernelEvent
): InstrumentationEvent | null {
	switch (event.type) {
		case 'consent:set':
			return {
				data: { consents: event.snapshot.consents },
				message: 'Consent preferences updated',
				type: 'consent_set',
			};
		case 'overrides:set':
			return {
				data: { overrides: event.snapshot.overrides },
				message: 'Overrides updated',
				type: 'info',
			};
		case 'user:identified':
			return {
				data: { user: event.snapshot.user },
				message: 'User identified',
				type: 'info',
			};
		case 'iab:set':
			return {
				data: {
					enabled: event.snapshot.iab?.enabled ?? false,
					tcString: event.snapshot.iab?.tcString ?? null,
				},
				message: 'IAB state updated',
				type: 'iab',
			};
		case 'init:applied':
			return {
				data: {
					location: event.snapshot.location,
					model: event.snapshot.model,
					policyId: event.snapshot.policy?.id ?? null,
				},
				message: `Init applied: ${event.snapshot.policy?.id ?? 'no policy'}`,
				type: 'info',
			};
		case 'init:failed':
			return {
				data: {
					attempt: event.attempt,
					error: describeError(event.error),
					nextRetryMs: event.nextRetryMs,
				},
				message: `Init failed (attempt ${event.attempt}): ${describeError(event.error)}`,
				type: 'error',
			};
		case 'save:replayed':
			return {
				data: { ok: event.ok, subjectId: event.subjectId },
				message: event.ok
					? 'Queued consent save replayed'
					: 'Queued consent save replay failed',
				type: event.ok ? 'info' : 'error',
			};
		case 'command:save:completed':
			return {
				data: { ...event.result },
				message: event.result.ok
					? 'Consent preferences saved'
					: 'Consent save did not complete',
				type: event.result.ok ? 'consent_save' : 'error',
			};
		case 'command:init:completed':
			return event.result.ok
				? null
				: {
						data: { error: describeError(event.result.error) },
						message: `Init command failed: ${describeError(event.result.error)}`,
						type: 'error',
					};
		case 'command:error':
			return {
				data: { command: event.command, error: describeError(event.error) },
				message: `Error in ${event.command}: ${describeError(event.error)}`,
				type: 'error',
			};
		default:
			return null;
	}
};

const OBSERVED_EVENTS: KernelEvent['type'][] = [
	'consent:set',
	'overrides:set',
	'user:identified',
	'iab:set',
	'init:applied',
	'init:failed',
	'save:replayed',
	'command:save:completed',
	'command:init:completed',
	'command:error',
];

const createInstrumentationEntry = function createInstrumentationEntry(
	kernel: ConsentKernel
): InstrumentationEntry {
	const listeners = new Set<InstrumentationListener>();
	const unsubscribes = OBSERVED_EVENTS.map((type) =>
		kernel.events.on(type, (event) => {
			const entry = kernelEventToLogEntry(event);
			if (!entry) {
				return;
			}
			for (const listener of listeners) {
				listener(entry);
			}
		})
	);

	return {
		kernel,
		listeners,
		unsubscribe: () => {
			for (const unsubscribe of unsubscribes) {
				unsubscribe();
			}
		},
	};
};

interface InstrumentationOptions {
	namespace: string;
	kernel: ConsentKernel;
	onEvent: InstrumentationListener;
}

export const registerKernelInstrumentation =
	function registerKernelInstrumentation(
		options: InstrumentationOptions
	): () => void {
		const { namespace, kernel, onEvent } = options;
		const registry = getRegistry();
		let entry = registry.get(namespace);

		if (!entry || entry.kernel !== kernel) {
			entry?.unsubscribe();
			entry = createInstrumentationEntry(kernel);
			registry.set(namespace, entry);
		}

		entry.listeners.add(onEvent);

		return () => {
			const current = registry.get(namespace);
			if (!current) {
				return;
			}

			current.listeners.delete(onEvent);
			if (current.listeners.size === 0) {
				current.unsubscribe();
				registry.delete(namespace);
			}
		};
	};
