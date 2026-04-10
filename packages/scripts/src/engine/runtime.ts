import { type ConsentState, emitScriptDebugEvent, type Script } from 'c15t';
import type { ManifestStep, ResolvedManifest } from '../types';

/**
 * Callback info passed to Script lifecycle hooks.
 * Mirrors the ScriptCallbackInfo type from c15t core
 * (which isn't exported from the public API).
 */
interface CallbackInfo {
	id: string;
	elementId: string;
	hasConsent: boolean;
	consents: ConsentState;
	element?: HTMLScriptElement;
	error?: Error;
}

type ManifestLifecycleCallback = 'onBeforeLoad' | 'onLoad' | 'onConsentChange';

interface StepExecutionContext {
	scriptId: string;
	elementId: string;
	hasConsent: boolean;
	callback: ManifestLifecycleCallback;
	phase: string;
}

function cloneStepValue(value: unknown): unknown {
	if (value instanceof Date) {
		return new Date(value);
	}

	if (Array.isArray(value)) {
		return value.map((item) => cloneStepValue(item));
	}

	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(
				([key, nestedValue]) => [key, cloneStepValue(nestedValue)]
			)
		);
	}

	return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getPathTarget(
	root: Record<string, unknown>,
	path: string[]
): { target: Record<string, unknown>; key: string } | undefined {
	if (path.length === 0) {
		return undefined;
	}

	let target = root;
	for (const segment of path.slice(0, -1)) {
		const next = target[segment];
		if (next === null || typeof next !== 'object') {
			return undefined;
		}

		target = next as Record<string, unknown>;
	}

	return {
		target,
		key: path[path.length - 1] as string,
	};
}

function resolveQueueTarget(
	root: Record<string, unknown>,
	queue:
		| { global: string; property?: never }
		| { global?: never; property: string },
	owner?: Record<string, unknown>
): unknown[] | undefined {
	if ('global' in queue && typeof queue.global === 'string') {
		const queueTarget = root[queue.global];
		return Array.isArray(queueTarget) ? queueTarget : undefined;
	}

	if (!owner) {
		return undefined;
	}

	const queueProperty = queue.property as string;
	const queueTarget = owner[queueProperty];
	return Array.isArray(queueTarget) ? queueTarget : undefined;
}

function executeStep(step: ManifestStep): void {
	const win = window as unknown as Record<string, unknown>;

	switch (step.type) {
		case 'setGlobal': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}

			win[step.name] = cloneStepValue(step.value);
			break;
		}

		case 'defineQueueFunction': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}

			win[step.name] = function queueFunction(
				this: unknown,
				...args: unknown[]
			) {
				const queueTarget = win[step.queue];
				if (!Array.isArray(queueTarget)) {
					return;
				}

				queueTarget.push(step.pushStyle === 'array' ? [...args] : args);
			};
			break;
		}

		case 'defineStubFunction': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}

			const stub = function stubFunction(this: unknown, ...args: unknown[]) {
				const self = win[step.name] as Record<string, unknown> | undefined;
				const dispatcher =
					self && step.dispatchProperty
						? self[step.dispatchProperty]
						: undefined;

				if (typeof dispatcher === 'function') {
					dispatcher.apply(self, args);
					return;
				}

				const queueTarget = resolveQueueTarget(win, step.queue, self);
				if (!queueTarget) {
					return;
				}

				queueTarget.push(
					step.queueFormat === 'array' ? [...args] : (args as unknown)
				);
			};

			win[step.name] = stub;
			const stubRecord = stub as unknown as Record<string, unknown>;

			if ('property' in step.queue && typeof step.queue.property === 'string') {
				const queueProperty = step.queue.property;
				if (stubRecord[queueProperty] === undefined) {
					stubRecord[queueProperty] = [];
				}
			}

			for (const alias of step.aliases ?? []) {
				win[alias] = stub;
			}

			for (const selfReference of step.selfReferences ?? []) {
				stubRecord[selfReference] = stub;
			}

			for (const [key, value] of Object.entries(step.properties ?? {})) {
				stubRecord[key] = cloneStepValue(value);
			}

			break;
		}

		case 'callGlobal': {
			const target = win[step.global];
			if (!target) {
				break;
			}

			const args = (step.args ?? []).map((arg) => cloneStepValue(arg));

			if (step.method) {
				const objectTarget = target as Record<
					string,
					(...args: unknown[]) => unknown
				>;
				const method = objectTarget[step.method];
				if (typeof method === 'function') {
					method(...args);
				}
			} else if (typeof target === 'function') {
				(target as (...args: unknown[]) => unknown)(...args);
			}
			break;
		}

		case 'pushToQueue': {
			const queueTarget = win[step.queue];
			if (Array.isArray(queueTarget)) {
				queueTarget.push(cloneStepValue(step.value));
			}
			break;
		}

		case 'setGlobalPath': {
			const pathTarget = getPathTarget(win, step.path);
			if (!pathTarget) {
				break;
			}

			pathTarget.target[pathTarget.key] = cloneStepValue(step.value);
			break;
		}

		case 'defineQueueMethods': {
			const target = win[step.target];
			if (
				target === null ||
				(typeof target !== 'object' && typeof target !== 'function')
			) {
				break;
			}

			const targetRecord = target as Record<string, unknown>;
			for (const methodName of step.methods) {
				targetRecord[methodName] = (...args: unknown[]) => {
					const queueTarget = resolveQueueTarget(
						win,
						step.queue ?? { global: step.target },
						targetRecord
					);
					if (!queueTarget) {
						return;
					}

					queueTarget.push([methodName, ...args]);
				};
			}
			break;
		}

		case 'defineGlobalMethods': {
			const target = win[step.target];
			if (
				target === null ||
				(typeof target !== 'object' && typeof target !== 'function')
			) {
				break;
			}

			const targetRecord = target as Record<string, unknown>;
			for (const method of step.methods) {
				targetRecord[method.name] =
					method.behavior === 'return'
						? () => cloneStepValue(method.value)
						: () => {};
			}
			break;
		}

		case 'constructGlobal': {
			const Constructor = win[step.constructor];
			if (typeof Constructor !== 'function') {
				break;
			}

			const args = (step.args ?? []).map((arg) => cloneStepValue(arg));
			if (step.copyAssignedValueToArgProperty) {
				const firstArg = args[0];
				const targetOptions = isRecord(firstArg) ? firstArg : {};
				targetOptions[step.copyAssignedValueToArgProperty] = win[step.assignTo];
				if (!isRecord(firstArg)) {
					args.unshift(targetOptions);
				}
			}

			win[step.assignTo] = new (
				Constructor as new (
					...args: unknown[]
				) => unknown
			)(...args);
			break;
		}

		case 'loadScript': {
			break;
		}
	}
}

function executePhaseSteps(
	steps: ManifestStep[],
	context: StepExecutionContext
): void {
	if (steps.length === 0) {
		return;
	}

	emitScriptDebugEvent({
		source: 'manifest-runtime',
		scope: 'phase',
		action: 'phase_start',
		message: `Manifest phase ${context.phase} started`,
		scriptId: context.scriptId,
		elementId: context.elementId,
		hasConsent: context.hasConsent,
		callback: context.callback,
		phase: context.phase,
		data: {
			stepCount: steps.length,
		},
	});

	for (const [stepIndex, step] of steps.entries()) {
		try {
			executeStep(step);
			emitScriptDebugEvent({
				source: 'manifest-runtime',
				scope: 'step',
				action: 'step_executed',
				message: `Executed ${step.type}`,
				scriptId: context.scriptId,
				elementId: context.elementId,
				hasConsent: context.hasConsent,
				callback: context.callback,
				phase: context.phase,
				stepType: step.type,
				stepIndex,
			});
		} catch (error) {
			emitScriptDebugEvent({
				source: 'manifest-runtime',
				scope: 'step',
				action: 'step_error',
				message: `Failed to execute ${step.type}`,
				scriptId: context.scriptId,
				elementId: context.elementId,
				hasConsent: context.hasConsent,
				callback: context.callback,
				phase: context.phase,
				stepType: step.type,
				stepIndex,
				data: {
					error:
						error instanceof Error
							? error.message
							: typeof error === 'string'
								? error
								: 'Unknown error',
				},
			});
			throw error;
		}
	}

	emitScriptDebugEvent({
		source: 'manifest-runtime',
		scope: 'phase',
		action: 'phase_complete',
		message: `Manifest phase ${context.phase} completed`,
		scriptId: context.scriptId,
		elementId: context.elementId,
		hasConsent: context.hasConsent,
		callback: context.callback,
		phase: context.phase,
		data: {
			stepCount: steps.length,
		},
	});
}

function mapConsentState(
	mapping: Record<string, string[]>,
	consents: ConsentState
): Record<string, 'granted' | 'denied'> {
	const result: Record<string, 'granted' | 'denied'> = {};

	for (const [c15tCategory, vendorTypes] of Object.entries(mapping)) {
		const isGranted = (consents as Record<string, boolean>)[c15tCategory];
		for (const vendorType of vendorTypes) {
			result[vendorType] = isGranted ? 'granted' : 'denied';
		}
	}

	return result;
}

function getConsentSignalSteps(
	resolvedManifest: ResolvedManifest,
	mode: 'default' | 'update',
	consents: ConsentState
): ManifestStep[] {
	if (!resolvedManifest.consentMapping || !resolvedManifest.consentSignal) {
		return [];
	}

	const mapped = mapConsentState(resolvedManifest.consentMapping, consents);

	switch (resolvedManifest.consentSignal) {
		case 'gtag': {
			return [
				{
					type: 'callGlobal',
					global: resolvedManifest.consentSignalTarget ?? 'gtag',
					args: ['consent', mode, mapped],
				},
			];
		}
	}
}

export function resolvedManifestToScript(
	resolvedManifest: ResolvedManifest
): Script {
	const hasConsentMapping = !!(
		resolvedManifest.consentMapping && resolvedManifest.consentSignal
	);
	const hasLoadConsentBranches = !!(
		resolvedManifest.onLoadGrantedSteps.length > 0 ||
		resolvedManifest.onLoadDeniedSteps.length > 0
	);
	const hasConsentLifecycle = !!(
		resolvedManifest.onConsentChangeSteps.length > 0 ||
		resolvedManifest.onConsentGrantedSteps.length > 0 ||
		resolvedManifest.onConsentDeniedSteps.length > 0 ||
		hasConsentMapping
	);

	const script: Script = {
		id: resolvedManifest.vendor,
		category: resolvedManifest.category as Script['category'],
		alwaysLoad: resolvedManifest.alwaysLoad,
		persistAfterConsentRevoked: resolvedManifest.persistAfterConsentRevoked,
		callbackOnly: !resolvedManifest.loadScript ? true : undefined,
		src: resolvedManifest.loadScript?.src,
		async: resolvedManifest.loadScript?.async,
		defer: resolvedManifest.loadScript?.defer,
		attributes: resolvedManifest.loadScript?.attributes,
	};

	if (
		resolvedManifest.bootstrapSteps.length > 0 ||
		resolvedManifest.setupSteps.length > 0 ||
		resolvedManifest.onBeforeLoadGrantedSteps.length > 0 ||
		resolvedManifest.onBeforeLoadDeniedSteps.length > 0 ||
		hasConsentMapping
	) {
		script.onBeforeLoad = (info: CallbackInfo) => {
			const baseContext = {
				scriptId: resolvedManifest.vendor,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				callback: 'onBeforeLoad' as const,
			};

			executePhaseSteps(resolvedManifest.bootstrapSteps, {
				...baseContext,
				phase: 'bootstrap',
			});
			executePhaseSteps(
				getConsentSignalSteps(resolvedManifest, 'default', info.consents),
				{
					...baseContext,
					phase: 'consent-default',
				}
			);
			executePhaseSteps(resolvedManifest.setupSteps, {
				...baseContext,
				phase: 'setup',
			});
			executePhaseSteps(
				info.hasConsent
					? resolvedManifest.onBeforeLoadGrantedSteps
					: resolvedManifest.onBeforeLoadDeniedSteps,
				{
					...baseContext,
					phase: info.hasConsent ? 'onBeforeLoadGranted' : 'onBeforeLoadDenied',
				}
			);
		};
	}

	if (resolvedManifest.afterLoadSteps.length > 0) {
		script.onLoad = (info: CallbackInfo) => {
			const baseContext = {
				scriptId: resolvedManifest.vendor,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				callback: 'onLoad' as const,
			};
			executePhaseSteps(resolvedManifest.afterLoadSteps, {
				...baseContext,
				phase: 'afterLoad',
			});

			if (info.hasConsent && resolvedManifest.onLoadGrantedSteps.length > 0) {
				executePhaseSteps(resolvedManifest.onLoadGrantedSteps, {
					...baseContext,
					phase: 'onLoadGranted',
				});
			} else if (
				!info.hasConsent &&
				resolvedManifest.onLoadDeniedSteps.length > 0
			) {
				executePhaseSteps(resolvedManifest.onLoadDeniedSteps, {
					...baseContext,
					phase: 'onLoadDenied',
				});
			}
		};
	} else if (hasLoadConsentBranches) {
		script.onLoad = (info: CallbackInfo) => {
			const baseContext = {
				scriptId: resolvedManifest.vendor,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				callback: 'onLoad' as const,
			};
			if (info.hasConsent && resolvedManifest.onLoadGrantedSteps.length > 0) {
				executePhaseSteps(resolvedManifest.onLoadGrantedSteps, {
					...baseContext,
					phase: 'onLoadGranted',
				});
			} else if (
				!info.hasConsent &&
				resolvedManifest.onLoadDeniedSteps.length > 0
			) {
				executePhaseSteps(resolvedManifest.onLoadDeniedSteps, {
					...baseContext,
					phase: 'onLoadDenied',
				});
			}
		};
	}

	if (hasConsentLifecycle) {
		script.onConsentChange = (info: CallbackInfo) => {
			const baseContext = {
				scriptId: resolvedManifest.vendor,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				callback: 'onConsentChange' as const,
			};
			executePhaseSteps(
				getConsentSignalSteps(resolvedManifest, 'update', info.consents),
				{
					...baseContext,
					phase: 'consent-update',
				}
			);

			if (resolvedManifest.onConsentChangeSteps.length > 0) {
				executePhaseSteps(resolvedManifest.onConsentChangeSteps, {
					...baseContext,
					phase: 'onConsentChange',
				});
			}

			if (
				info.hasConsent &&
				resolvedManifest.onConsentGrantedSteps.length > 0
			) {
				executePhaseSteps(resolvedManifest.onConsentGrantedSteps, {
					...baseContext,
					phase: 'onConsentGranted',
				});
			} else if (
				!info.hasConsent &&
				resolvedManifest.onConsentDeniedSteps.length > 0
			) {
				executePhaseSteps(resolvedManifest.onConsentDeniedSteps, {
					...baseContext,
					phase: 'onConsentDenied',
				});
			}
		};
	}

	return script;
}
