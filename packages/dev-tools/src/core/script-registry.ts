/**
 * Script Registry
 * The kernel does not hold script configuration — the script loader is a
 * module bound to it. The devtools rebuild the list of known scripts from
 * the loader's debug events instead.
 */

import type { ScriptDebugEvent } from '@c15t/core';

/**
 * What the devtools know about one script, reconstructed from debug events.
 */
export interface DevToolsScriptRecord {
	/** Script ID as configured by the app */
	id: string;
	/** DOM element ID the loader resolved for this script */
	elementId?: string;
	/** Whether the loader currently reports the script as mounted */
	loaded: boolean;
	/** Consent outcome from the most recent lifecycle event */
	hasConsent?: boolean;
	/** Most recent lifecycle action */
	lastAction?: string;
	/** Most recent lifecycle message */
	lastMessage?: string;
}

/**
 * Script record enriched with the `src` the mounted element points at.
 */
export interface ManagedScript {
	id: string;
	src?: string;
}

export interface ScriptRegistry {
	/** Apply one debug event to the registry */
	record: (event: ScriptDebugEvent) => void;
	/** Known scripts in first-seen order */
	getScripts: () => DevToolsScriptRecord[];
	/** Known scripts with the `src` of their mounted element, when present */
	getManagedScripts: () => ManagedScript[];
	/** Forget everything */
	clear: () => void;
}

const LOADED_ACTIONS = new Set<string>([
	'loaded',
	'already_loaded',
	'element_appended',
]);
const UNLOADED_ACTIONS = new Set<string>(['unloaded', 'skipped', 'error']);

const readElementSrc = function readElementSrc(
	elementId: string | undefined
): string | undefined {
	if (!elementId || typeof document === 'undefined') {
		return undefined;
	}
	const element = document.getElementById(elementId);
	if (element instanceof HTMLScriptElement && element.src) {
		return element.src;
	}
	return undefined;
};

export const createScriptRegistry = function createScriptRegistry(
	initial: DevToolsScriptRecord[] = []
): ScriptRegistry {
	const scripts = new Map<string, DevToolsScriptRecord>(
		initial.map((script) => [script.id, { ...script }])
	);

	return {
		clear: () => {
			scripts.clear();
		},
		getManagedScripts: () =>
			[...scripts.values()].map((script) => ({
				id: script.id,
				src: readElementSrc(script.elementId),
			})),
		getScripts: () => [...scripts.values()].map((script) => ({ ...script })),
		record: (event) => {
			if (event.scope !== 'lifecycle' && event.scope !== 'step') {
				return;
			}
			const existing = scripts.get(event.scriptId) ?? {
				id: event.scriptId,
				loaded: false,
			};
			const next: DevToolsScriptRecord = {
				...existing,
				elementId: event.elementId ?? existing.elementId,
				hasConsent:
					typeof event.hasConsent === 'boolean'
						? event.hasConsent
						: existing.hasConsent,
				lastAction: event.action,
				lastMessage: event.message,
			};
			if (LOADED_ACTIONS.has(event.action)) {
				next.loaded = true;
			} else if (UNLOADED_ACTIONS.has(event.action)) {
				next.loaded = false;
			}
			scripts.set(event.scriptId, next);
		},
	};
};
