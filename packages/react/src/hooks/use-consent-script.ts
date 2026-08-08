'use client';

import type {
	AllConsentNames,
	HasCondition,
	Script,
	ScriptCallbackInfo,
} from '@c15t/core';
import { useContext, useEffect, useRef, useState } from 'react';
import {
	ConsentStateContext,
	type ConsentStateContextValue,
} from '~/context/consent-manager-context';
import { useConsentManager } from './use-consent-manager';

export type ConsentScriptStatus =
	| 'idle'
	| 'blocked'
	| 'loading'
	| 'ready'
	| 'error';

export type ConsentScriptUnmountBehavior = 'keep' | 'remove';

export class ConsentScriptConflictError extends Error {
	readonly scriptId: string;

	constructor(scriptId: string) {
		super(
			`Conflicting consent script options were registered for '${scriptId}'. Reuse the same options for this script id, or choose a different id only when the vendor supports multiple page-level loaders.`
		);
		this.name = 'ConsentScriptConflictError';
		this.scriptId = scriptId;
	}
}

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
	 * The returned cleanup function runs after readiness settles or the registry
	 * entry is released.
	 */
	registerReadyCallback?: (
		controls: ConsentScriptReadyControls<TReady>
	) => undefined | (() => void);

	/**
	 * Semantic key for the SDK readiness contract shared by this script id.
	 *
	 * Consumers of the same script id must use the same key. Set this when the
	 * readiness callbacks are configured differently from the script itself.
	 *
	 * @default script.id
	 */
	readinessKey?: string;

	/**
	 * Optional timeout for SDK readiness after the script is registered.
	 */
	timeoutMs?: number;

	/**
	 * Changing this value retries a failed registration with the same script id.
	 * Successful singleton registrations remain shared.
	 *
	 * @default 0
	 */
	retryKey?: string | number;

	/**
	 * Whether c15t should retain an owned script registration after the final
	 * hook consumer unmounts. Use `keep` for page-level singleton SDKs that
	 * cannot safely be loaded more than once.
	 *
	 * @default 'remove'
	 */
	unmountBehavior?: ConsentScriptUnmountBehavior;
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

type ConsentStore = ConsentStateContextValue['store'];

interface ScriptConsumer<TReady> {
	current: UseConsentScriptOptions<TReady>;
}

interface ScriptRegistryEntry<TReady> {
	refCount: number;
	signature: string;
	readinessKey: string;
	timeoutMs?: number;
	unmountBehavior: ConsentScriptUnmountBehavior;
	registered: boolean;
	ownsRegistration: boolean;
	loaded: boolean;
	started: boolean;
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
	readinessConsumer: ScriptConsumer<TReady>;
	consumers: Set<ScriptConsumer<unknown>>;
}

const managerScriptRegistries = new WeakMap<
	object,
	Map<string, ScriptRegistryEntry<unknown>>
>();

function toError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}

	return new Error(String(error));
}

function normalizeSignatureValue(value: unknown): unknown {
	if (typeof value === 'function' || value === undefined) {
		return undefined;
	}

	if (Array.isArray(value)) {
		return value.map(normalizeSignatureValue);
	}

	if (value && typeof value === 'object') {
		const normalizedEntries = Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entryValue]) => [key, normalizeSignatureValue(entryValue)])
			.filter((entry) => entry[1] !== undefined);

		return Object.fromEntries(normalizedEntries);
	}

	return value;
}

function createScriptSignature(script: Script): string {
	return JSON.stringify(normalizeSignatureValue(script));
}

function normalizeTimeout(timeoutMs: number | undefined): number | undefined {
	if (timeoutMs === undefined || timeoutMs <= 0) {
		return undefined;
	}

	return timeoutMs;
}

function getRegistry(
	store: ConsentStore
): Map<string, ScriptRegistryEntry<unknown>> {
	const existing = managerScriptRegistries.get(store);
	if (existing) {
		return existing;
	}

	const registry = new Map<string, ScriptRegistryEntry<unknown>>();
	managerScriptRegistries.set(store, registry);
	return registry;
}

function cleanupReadiness(entry: ScriptRegistryEntry<unknown>): void {
	if (entry.timeoutId) {
		clearTimeout(entry.timeoutId);
		entry.timeoutId = undefined;
	}

	entry.cleanupReadyCallback?.();
	entry.cleanupReadyCallback = undefined;
}

function callConsumers(
	entry: ScriptRegistryEntry<unknown>,
	callback: 'onBeforeLoad' | 'onLoad' | 'onError' | 'onConsentChange',
	info: ScriptCallbackInfo
): void {
	let callbackError: unknown;

	for (const consumer of entry.consumers) {
		try {
			consumer.current.script[callback]?.(info);
		} catch (error) {
			callbackError ??= error;
		}
	}

	if (callbackError !== undefined) {
		throw callbackError;
	}
}

function createRegistryEntry<TReady>({
	options,
	readinessConsumer,
	readinessKey,
	timeoutMs,
	unmountBehavior,
}: {
	options: UseConsentScriptOptions<TReady>;
	readinessConsumer: ScriptConsumer<TReady>;
	readinessKey: string;
	timeoutMs?: number;
	unmountBehavior: ConsentScriptUnmountBehavior;
}): ScriptRegistryEntry<TReady> {
	let resolvePromise!: (value: TReady) => void;
	let rejectPromise!: (error: Error) => void;

	const promise = new Promise<TReady>((resolve, reject) => {
		resolvePromise = resolve;
		rejectPromise = reject;
	});

	const entry: ScriptRegistryEntry<TReady> = {
		refCount: 0,
		signature: createScriptSignature(options.script),
		readinessKey,
		timeoutMs,
		unmountBehavior,
		registered: false,
		ownsRegistration: false,
		loaded: false,
		started: false,
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
			cleanupReadiness(entry as unknown as ScriptRegistryEntry<unknown>);
			resolvePromise(value);
		},
		reject: (error) => {
			if (entry.settled) {
				return;
			}

			entry.settled = true;
			entry.error = error;
			cleanupReadiness(entry as unknown as ScriptRegistryEntry<unknown>);
			rejectPromise(error);
		},
		tryResolve: (scriptLoaded = false) => {
			if (entry.settled) {
				return true;
			}

			const resolver = entry.readinessConsumer.current.resolveReady;
			if (!resolver) {
				if (scriptLoaded || entry.loaded) {
					entry.resolve(undefined as TReady);
					return true;
				}

				return false;
			}

			try {
				const readyValue = resolver();
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
		readinessConsumer,
		consumers: new Set(),
	};

	entry.script = {
		...options.script,
		onBeforeLoad: (info) => {
			callConsumers(
				entry as unknown as ScriptRegistryEntry<unknown>,
				'onBeforeLoad',
				info
			);
		},
		onLoad: (info) => {
			entry.loaded = true;
			entry.tryResolve(true);
			callConsumers(
				entry as unknown as ScriptRegistryEntry<unknown>,
				'onLoad',
				info
			);
		},
		onError: (info) => {
			entry.reject(
				info.error ?? new Error(`Failed to load ${options.script.id}`)
			);
			callConsumers(
				entry as unknown as ScriptRegistryEntry<unknown>,
				'onError',
				info
			);
		},
		onConsentChange: (info) => {
			callConsumers(
				entry as unknown as ScriptRegistryEntry<unknown>,
				'onConsentChange',
				info
			);
		},
	};

	return entry;
}

function getOrCreateRegistryEntry<TReady>({
	store,
	options,
	consumer,
	signature,
	readinessKey,
	retryFailed,
	timeoutMs,
	unmountBehavior,
}: {
	store: ConsentStore;
	options: UseConsentScriptOptions<TReady>;
	consumer: ScriptConsumer<TReady>;
	signature: string;
	readinessKey: string;
	retryFailed: boolean;
	timeoutMs?: number;
	unmountBehavior: ConsentScriptUnmountBehavior;
}): ScriptRegistryEntry<TReady> {
	const registry = getRegistry(store);
	let existing = registry.get(options.script.id);

	if (existing?.error && retryFailed) {
		cleanupReadiness(existing);
		if (registry.get(existing.script.id) === existing) {
			registry.delete(existing.script.id);
		}

		if (existing.ownsRegistration && existing.registered) {
			store.getState().removeScript(existing.script.id);
			existing.ownsRegistration = false;
			existing.registered = false;
		}

		existing = undefined;
	}

	if (existing) {
		if (
			existing.signature !== signature ||
			existing.readinessKey !== readinessKey ||
			existing.timeoutMs !== timeoutMs ||
			existing.unmountBehavior !== unmountBehavior
		) {
			throw new ConsentScriptConflictError(options.script.id);
		}

		return existing as ScriptRegistryEntry<TReady>;
	}

	const managerScripts = store
		.getState()
		.scripts.filter((candidate) => candidate.id === options.script.id);
	for (const managerScript of managerScripts) {
		if (createScriptSignature(managerScript) !== signature) {
			throw new ConsentScriptConflictError(options.script.id);
		}
	}

	const entry = createRegistryEntry({
		options,
		readinessConsumer: consumer,
		readinessKey,
		timeoutMs,
		unmountBehavior,
	});

	if (managerScripts.length > 0) {
		entry.registered = true;
		entry.loaded = store.getState().loadedScripts[options.script.id] === true;
	}

	registry.set(
		options.script.id,
		entry as unknown as ScriptRegistryEntry<unknown>
	);
	return entry;
}

function startReadiness<TReady>(entry: ScriptRegistryEntry<TReady>): void {
	if (entry.started) {
		return;
	}

	entry.started = true;
	const registerReadyCallback =
		entry.readinessConsumer.current.registerReadyCallback;

	if (registerReadyCallback) {
		try {
			const cleanup = registerReadyCallback({
				resolve: entry.resolve,
				reject: entry.reject,
			});
			if (cleanup) {
				entry.cleanupReadyCallback = cleanup;
				if (entry.settled) {
					cleanupReadiness(entry as unknown as ScriptRegistryEntry<unknown>);
				}
			}
		} catch (error) {
			entry.reject(toError(error));
		}
	}

	if (!entry.settled && entry.timeoutMs) {
		entry.timeoutId = setTimeout(() => {
			entry.reject(
				new Error(
					`Timed out waiting for consent script '${entry.script.id}' to become ready`
				)
			);
		}, entry.timeoutMs);
	}

	entry.tryResolve(false);
}

function releaseRegistryEntry<TReady>({
	store,
	entry,
	consumer,
}: {
	store: ConsentStore;
	entry: ScriptRegistryEntry<TReady>;
	consumer: ScriptConsumer<TReady>;
}): void {
	const unknownConsumer = consumer as unknown as ScriptConsumer<unknown>;
	if (!entry.consumers.delete(unknownConsumer)) {
		return;
	}

	entry.refCount -= 1;
	if (entry.refCount > 0) {
		return;
	}

	if (entry.unmountBehavior === 'keep' && !entry.error) {
		return;
	}

	cleanupReadiness(entry as unknown as ScriptRegistryEntry<unknown>);
	const registry = getRegistry(store);
	if (registry.get(entry.script.id) === entry) {
		registry.delete(entry.script.id);
	}

	if (entry.ownsRegistration && entry.registered) {
		store.getState().removeScript(entry.script.id);
	}
}

/**
 * Registers a consent-gated script through c15t and exposes SDK readiness as a promise.
 *
 * @remarks
 * Registrations are shared within one ConsentManagerProvider. The hook adopts
 * compatible scripts already registered with that manager and never removes
 * registrations it does not own. Inline script objects and callbacks are safe:
 * lifecycle callbacks are read from the latest render without re-registering.
 */
export function useConsentScript<TReady = unknown>(
	options: UseConsentScriptOptions<TReady>
): UseConsentScriptResult<TReady> {
	const {
		script,
		enabled = true,
		readinessKey = script.id,
		retryKey = 0,
		unmountBehavior = 'remove',
	} = options;
	const context = useContext(ConsentStateContext);
	if (context === undefined) {
		throw new Error(
			'useConsentScript must be used within a ConsentManagerProvider'
		);
	}

	const { has, loadedScripts } = useConsentManager();
	const hasConsent =
		enabled && has(script.category as HasCondition<AllConsentNames>);
	const scriptAppended = loadedScripts[script.id] === true;
	const signature = createScriptSignature(script);
	const timeoutMs = normalizeTimeout(options.timeoutMs);
	const latestOptionsRef = useRef<UseConsentScriptOptions<TReady>>(options);
	const previousRetryKeyRef = useRef(retryKey);
	const activeEntryRef = useRef<ScriptRegistryEntry<TReady> | null>(null);
	const [readyValue, setReadyValue] = useState<TReady | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [ready, setReady] = useState<Promise<TReady> | null>(null);

	useEffect(() => {
		latestOptionsRef.current = options;
	}, [options]);

	useEffect(() => {
		const retryFailed = previousRetryKeyRef.current !== retryKey;
		previousRetryKeyRef.current = retryKey;

		if (!enabled || !hasConsent) {
			activeEntryRef.current = null;
			setReadyValue(null);
			setIsReady(false);
			setError(null);
			setReady(null);
			return;
		}

		const consumer = latestOptionsRef as unknown as ScriptConsumer<TReady>;
		let entry: ScriptRegistryEntry<TReady>;

		try {
			entry = getOrCreateRegistryEntry({
				store: context.store,
				options: latestOptionsRef.current,
				consumer,
				signature,
				readinessKey,
				retryFailed,
				timeoutMs,
				unmountBehavior,
			});
		} catch (nextError) {
			activeEntryRef.current = null;
			setReadyValue(null);
			setIsReady(false);
			setError(toError(nextError));
			setReady(null);
			return;
		}

		entry.refCount += 1;
		entry.consumers.add(consumer as unknown as ScriptConsumer<unknown>);
		activeEntryRef.current = entry;

		setReadyValue(entry.readyValue);
		setIsReady(entry.settled && !entry.error);
		setError(entry.error);
		setReady(entry.promise);

		startReadiness(entry);

		if (!entry.registered && !entry.settled) {
			entry.registered = true;
			entry.ownsRegistration = true;

			try {
				context.store.getState().setScripts([entry.script]);
			} catch (registrationError) {
				entry.registered = false;
				entry.ownsRegistration = false;
				entry.reject(toError(registrationError));
			}
		}

		if (entry.settled && !entry.error) {
			setReadyValue(entry.readyValue);
			setIsReady(true);
		} else if (entry.error) {
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
			if (activeEntryRef.current === entry) {
				activeEntryRef.current = null;
			}
			releaseRegistryEntry({
				store: context.store,
				entry,
				consumer,
			});
		};
	}, [
		context.store,
		enabled,
		hasConsent,
		readinessKey,
		retryKey,
		signature,
		timeoutMs,
		unmountBehavior,
	]);

	useEffect(() => {
		const entry = activeEntryRef.current;
		if (!entry || !scriptAppended) {
			return;
		}

		entry.loaded = true;
		entry.tryResolve(true);
	}, [scriptAppended]);

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
