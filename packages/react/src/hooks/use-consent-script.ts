'use client';

import type { AllConsentNames, HasCondition, Script } from 'c15t';
import { useEffect, useMemo, useState } from 'react';
import { useConsentManager } from './use-consent-manager';

export type ConsentScriptStatus =
	| 'idle'
	| 'blocked'
	| 'loading'
	| 'ready'
	| 'error';

export interface ConsentScriptReadyControls<TReady> {
	resolve: (value: TReady) => void;
	reject: (error: Error) => void;
}

export interface UseConsentScriptOptions<TReady = unknown> {
	/**
	 * Script configuration registered with c15t's script manager.
	 */
	script: Script;

	/**
	 * Whether this hook should register the script.
	 *
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Returns the SDK object when it is already available.
	 */
	resolveReady?: () => TReady | false | null | undefined;

	/**
	 * Registers callback-based SDK readiness, such as `callback=` query params.
	 * The returned cleanup function runs when the final consumer unmounts.
	 */
	registerReadyCallback?: (
		controls: ConsentScriptReadyControls<TReady>
	) => undefined | (() => void);

	/**
	 * Optional timeout for SDK readiness after the script is registered.
	 */
	timeoutMs?: number;
}

export interface UseConsentScriptResult<TReady = unknown> {
	status: ConsentScriptStatus;
	scriptId: string;
	hasConsent: boolean;
	scriptAppended: boolean;
	readyValue: TReady | null;
	error: Error | null;
	ready: Promise<TReady> | null;
}

interface ScriptRegistryEntry<TReady> {
	refCount: number;
	signature: string;
	registered: boolean;
	loaded: boolean;
	settled: boolean;
	readyValue: TReady | null;
	error: Error | null;
	promise: Promise<TReady>;
	resolve: (value: TReady) => void;
	reject: (error: Error) => void;
	tryResolve: (scriptLoaded?: boolean) => boolean;
	cleanupReadyCallback?: () => void;
	timeoutId?: ReturnType<typeof setTimeout>;
	script: Script;
}

const scriptRegistry = new Map<string, ScriptRegistryEntry<unknown>>();

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(String(error));
}

function createScriptSignature(script: Script): string {
	return JSON.stringify({
		async: script.async,
		category: script.category,
		defer: script.defer,
		id: script.id,
		nonce: script.nonce,
		src: script.src,
	});
}

function createRegistryEntry<TReady>(
	options: UseConsentScriptOptions<TReady>
): ScriptRegistryEntry<TReady> {
	let resolvePromise!: (value: TReady) => void;
	let rejectPromise!: (error: Error) => void;

	const promise = new Promise<TReady>((resolve, reject) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	});

	const entry: ScriptRegistryEntry<TReady> = {
		refCount: 0,
		signature: createScriptSignature(options.script),
		registered: false,
		loaded: false,
		settled: false,
		readyValue: null,
		error: null,
		promise,
		resolve: (value) => {
			if (entry.settled) {
				return;
			}
			entry.settled = true;
			entry.readyValue = value;
			if (entry.timeoutId) {
				clearTimeout(entry.timeoutId);
			}
			resolvePromise(value);
		},
		reject: (error) => {
			if (entry.settled) {
				return;
			}
			entry.settled = true;
			entry.error = error;
			if (entry.timeoutId) {
				clearTimeout(entry.timeoutId);
			}
			rejectPromise(error);
		},
		tryResolve: (scriptLoaded = false) => {
			if (entry.settled) {
				return true;
			}
			if (!options.resolveReady) {
				if (scriptLoaded || entry.loaded) {
					entry.resolve(undefined as TReady);
					return true;
				}
				return false;
			}
			try {
				const readyValue = options.resolveReady();
				if (readyValue) {
					entry.resolve(readyValue);
					return true;
				}
			} catch (error) {
				entry.reject(toError(error));
			}
			return false;
		},
		script: options.script,
	};

	const originalOnLoad = options.script.onLoad;
	const originalOnError = options.script.onError;

	entry.script = {
		...options.script,
		onLoad: (info) => {
			originalOnLoad?.(info);
			entry.loaded = true;
			entry.tryResolve(true);
		},
		onError: (info) => {
			originalOnError?.(info);
			entry.reject(
				info.error ?? new Error(`Failed to load ${options.script.id}`)
			);
		},
	};

	const cleanupReadyCallback = options.registerReadyCallback?.({
		resolve: entry.resolve,
		reject: entry.reject,
	});

	if (cleanupReadyCallback) {
		entry.cleanupReadyCallback = cleanupReadyCallback;
	}

	if (options.timeoutMs && options.timeoutMs > 0) {
		entry.timeoutId = setTimeout(() => {
			entry.reject(
				new Error(
					`Timed out waiting for consent script '${options.script.id}' to become ready`
				)
			);
		}, options.timeoutMs);
	}

	return entry;
}

function getOrCreateRegistryEntry<TReady>(
	options: UseConsentScriptOptions<TReady>
): ScriptRegistryEntry<TReady> {
	const existing = scriptRegistry.get(options.script.id);
	if (existing) {
		const nextSignature = createScriptSignature(options.script);
		if (existing.signature !== nextSignature) {
			throw new Error(
				`Conflicting consent script options were registered for '${options.script.id}'. Use a unique script id for each vendor configuration.`
			);
		}
		return existing as ScriptRegistryEntry<TReady>;
	}

	const entry = createRegistryEntry(options);
	scriptRegistry.set(options.script.id, entry as ScriptRegistryEntry<unknown>);
	return entry;
}

function releaseRegistryEntry(scriptId: string): void {
	const entry = scriptRegistry.get(scriptId);
	if (!entry) {
		return;
	}

	entry.refCount -= 1;

	if (entry.refCount > 0) {
		return;
	}

	if (entry.timeoutId) {
		clearTimeout(entry.timeoutId);
	}
	entry.cleanupReadyCallback?.();
	scriptRegistry.delete(scriptId);
}

/**
 * Registers a consent-gated script through c15t and exposes SDK readiness as a promise.
 *
 * @remarks
 * The script manager remains the source of truth for script registration and loaded
 * script state. This hook adds a thin promise contract for SDKs that signal readiness
 * through callbacks after the script element is appended.
 */
export function useConsentScript<TReady = unknown>({
	script,
	enabled = true,
	resolveReady,
	registerReadyCallback,
	timeoutMs,
}: UseConsentScriptOptions<TReady>): UseConsentScriptResult<TReady> {
	const { has, loadedScripts, setScripts, removeScript } = useConsentManager();
	let hasConsent = false;
	if (enabled) {
		hasConsent = has(script.category as HasCondition<AllConsentNames>);
	}
	const scriptAppended = loadedScripts[script.id] === true;
	const [readyValue, setReadyValue] = useState<TReady | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [ready, setReady] = useState<Promise<TReady> | null>(null);

	const registryOptions = useMemo(
		() => ({
			script,
			enabled,
			resolveReady,
			registerReadyCallback,
			timeoutMs,
		}),
		[script, enabled, resolveReady, registerReadyCallback, timeoutMs]
	);

	useEffect(() => {
		if (!enabled || !hasConsent) {
			setReadyValue(null);
			setIsReady(false);
			setError(null);
			setReady(null);
			return;
		}

		let entry: ScriptRegistryEntry<TReady>;
		try {
			entry = getOrCreateRegistryEntry(registryOptions);
		} catch (nextError) {
			setReadyValue(null);
			setIsReady(false);
			setError(toError(nextError));
			setReady(null);
			return;
		}
		entry.refCount += 1;

		setReadyValue(null);
		setIsReady(false);
		setError(null);
		setReady(entry.promise);

		if (!entry.registered) {
			setScripts([entry.script]);
			entry.registered = true;
		}

		entry.tryResolve(false);

		if (entry.settled && !entry.error) {
			setReadyValue(entry.readyValue);
			setIsReady(true);
		}
		if (entry.error) {
			setError(entry.error);
			setIsReady(false);
		}

		let active = true;
		entry.promise.then(
			(value) => {
				if (active) {
					setReadyValue(value);
					setIsReady(true);
					setError(null);
				}
			},
			(nextError) => {
				if (active) {
					setError(toError(nextError));
					setReadyValue(null);
					setIsReady(false);
				}
			}
		);

		return () => {
			active = false;
			releaseRegistryEntry(script.id);

			const entryAfterRelease = scriptRegistry.get(script.id);
			if (!entryAfterRelease) {
				removeScript(script.id);
			}
		};
	}, [
		enabled,
		hasConsent,
		registryOptions,
		removeScript,
		script.id,
		setScripts,
	]);

	let status: ConsentScriptStatus = 'loading';
	if (!enabled) {
		status = 'idle';
	} else if (!hasConsent) {
		status = 'blocked';
	} else if (error) {
		status = 'error';
	} else if (isReady) {
		status = 'ready';
	}

	return {
		status,
		scriptId: script.id,
		hasConsent,
		scriptAppended,
		readyValue,
		error,
		ready,
	};
}
