import type {
	ScriptDebugEvent,
	ScriptDebugEventInput,
	ScriptDebugListener,
} from './types';

const REGISTRY_KEY = '__c15tScriptDebugListeners';
let fallbackListeners: Set<ScriptDebugListener> | null = null;

function getListeners(): Set<ScriptDebugListener> {
	if (typeof window === 'undefined') {
		if (!fallbackListeners) {
			fallbackListeners = new Set();
		}
		return fallbackListeners;
	}

	const host = window as unknown as Record<string, unknown>;
	const existing = host[REGISTRY_KEY] as Set<ScriptDebugListener> | undefined;
	if (existing) {
		return existing;
	}

	const listeners = new Set<ScriptDebugListener>();
	host[REGISTRY_KEY] = listeners;
	return listeners;
}

export function emitScriptDebugEvent(
	event: ScriptDebugEventInput
): ScriptDebugEvent {
	const fullEvent: ScriptDebugEvent = {
		...event,
		timestamp: Date.now(),
	};

	for (const listener of getListeners()) {
		listener(fullEvent);
	}

	return fullEvent;
}

export function subscribeToScriptDebugEvents(
	listener: ScriptDebugListener
): () => void {
	const listeners = getListeners();
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}
