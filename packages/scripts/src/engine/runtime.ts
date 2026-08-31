import { emitScriptDebugEvent } from '@c15t/core';
import type {
	ConsentState,
	Script,
	ScriptCallbackInfo,
	ScriptLifecycleCallback,
} from '@c15t/core';

import { RUNTIME_VALUE_KIND } from '../types';
import type { ManifestStep, ResolvedManifest, RuntimeValue } from '../types';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

type ManifestLifecycleCallback = Exclude<ScriptLifecycleCallback, 'onError'>;

interface StepExecutionContext {
	scriptId: string;
	elementId: string;
	hasConsent: boolean;
	callback: ManifestLifecycleCallback;
	phase: string;
}

const isRuntimeValue = function isRuntimeValue(
	value: unknown
): value is RuntimeValue {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const candidate = value as Partial<RuntimeValue>;
	return (
		candidate.kind === RUNTIME_VALUE_KIND &&
		(candidate.value === 'date' || candidate.value === 'timestamp')
	);
};

const resolveRuntimeValue = function resolveRuntimeValue(
	value: RuntimeValue
): Date | number {
	if (value.value === 'date') {
		return new Date();
	}

	return Date.now();
};

const cloneStepValue = function cloneStepValue(value: unknown): unknown {
	if (isRuntimeValue(value)) {
		return resolveRuntimeValue(value);
	}

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
};

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const getPathTarget = function getPathTarget(
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
		key: path[path.length - 1] as string,
		target,
	};
};

const resolveQueueTarget = function resolveQueueTarget(
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
};

// oxlint-disable-next-line complexity -- Preserve established branch order and control flow.
const executeStep = function executeStep(step: ManifestStep): void {
	const win = window as unknown as Record<string, unknown>;

	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
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

			win[step.name] = function queueFunction(this: unknown) {
				const queueTarget = win[step.queue];
				if (!Array.isArray(queueTarget)) {
					return;
				}

				if (step.pushStyle === 'array') {
					// oxlint-disable-next-line prefer-rest-params -- Preserve sequential execution and callback compatibility.
					queueTarget.push(Array.from(arguments));
					return;
				}

				// oxlint-disable-next-line prefer-rest-params -- Preserve sequential execution and callback compatibility.
				queueTarget.push(arguments);
			};
			break;
		}

		case 'defineStubFunction': {
			const shouldSet = step.ifUndefined !== false;
			if (shouldSet && win[step.name] !== undefined) {
				break;
			}

			// oxlint-disable-next-line func-name-matching -- Preserve declaration order, interface shape, and public compatibility.
			const stub = function stubFunction(this: unknown) {
				const self = win[step.name] as Record<string, unknown> | undefined;
				const dispatcher =
					self && step.dispatchProperty
						? self[step.dispatchProperty]
						: undefined;
				// oxlint-disable-next-line prefer-rest-params -- Preserve sequential execution and callback compatibility.
				const runtimeArgs = Array.from(arguments);

				if (typeof dispatcher === 'function') {
					dispatcher.apply(self, runtimeArgs);
					return;
				}

				const queueTarget = resolveQueueTarget(win, step.queue, self);
				if (!queueTarget) {
					return;
				}

				if (step.queueFormat === 'array') {
					queueTarget.push(runtimeArgs);
					return;
				}

				// oxlint-disable-next-line prefer-rest-params -- Preserve sequential execution and callback compatibility.
				queueTarget.push(arguments);
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
					method.apply(objectTarget, args);
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

			// When the queue lives on the target itself, a non-array target means
			// the real SDK already replaced the snippet queue (for example a
			// grant → revoke → grant cycle without a page reload). Redefining the
			// methods would overwrite live SDK methods with dead stubs.
			if (!step.queue && !Array.isArray(target)) {
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

					if (
						step.queueFormat === 'methodCall' ||
						step.queueFormat === 'wrappedMethodCall' ||
						step.queueFormat === 'voidMethodCall'
					) {
						const promise = createDeferredPromise<unknown>((resolve) => {
							queueTarget.push({
								args,
								name: methodName,
								resolve,
							});
						});

						if (step.queueFormat === 'wrappedMethodCall') {
							return { promise };
						}

						if (step.queueFormat === 'voidMethodCall') {
							return undefined;
						}

						return promise;
					}

					if (step.queueFormat === 'callback') {
						queueTarget.push({
							fn: () => {
								const latestTarget = win[step.target];
								if (
									latestTarget === null ||
									(typeof latestTarget !== 'object' &&
										typeof latestTarget !== 'function')
								) {
									return;
								}

								const method = (
									latestTarget as Record<
										string,
										(...methodArgs: unknown[]) => unknown
									>
								)[methodName];
								if (typeof method === 'function') {
									method.apply(latestTarget, args);
								}
							},
							name: methodName,
						});
						return;
					}

					queueTarget.push([methodName, ...args]);
				};
			}
			break;
		}

		case 'defineQueueClass': {
			const target = win[step.target];
			if (
				target === null ||
				(typeof target !== 'object' && typeof target !== 'function')
			) {
				break;
			}

			const queueProperty = step.queueProperty ?? '_q';
			// oxlint-disable-next-line func-name-matching -- Preserve declaration order, interface shape, and public compatibility.
			const QueueClass = function queuedHelperClass(
				this: Record<string, unknown>
			) {
				this[queueProperty] = [];
			};
			const prototype = QueueClass.prototype as Record<string, unknown>;

			for (const methodName of step.methods) {
				prototype[methodName] = function queuedHelperMethod(
					this: Record<string, unknown>,
					...args: unknown[]
				) {
					const queueTarget = this[queueProperty];
					if (Array.isArray(queueTarget)) {
						queueTarget.push({
							args,
							name: methodName,
						});
					}

					return this;
				};
			}

			(target as Record<string, unknown>)[step.name] = QueueClass;
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
						: () => {
								/* empty */
							};
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
				// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
				const firstArg = args[0];
				const targetOptions = isRecord(firstArg) ? firstArg : {};
				targetOptions[step.copyAssignedValueToArgProperty] = win[step.assignTo];
				if (!isRecord(firstArg)) {
					args.unshift(targetOptions);
				}
			}

			win[step.assignTo] = new (Constructor as new (
				...args: unknown[]
			) => unknown)(...args);
			break;
		}

		case 'loadScript': {
			break;
		}
	}
};

const executePhaseSteps = function executePhaseSteps(
	steps: ManifestStep[],
	context: StepExecutionContext
): void {
	if (steps.length === 0) {
		return;
	}

	emitScriptDebugEvent({
		action: 'phase_start',
		callback: context.callback,
		data: {
			stepCount: steps.length,
		},
		elementId: context.elementId,
		hasConsent: context.hasConsent,
		message: `Manifest phase ${context.phase} started`,
		phase: context.phase,
		scope: 'phase',
		scriptId: context.scriptId,
		source: 'manifest-runtime',
	});

	for (const [stepIndex, step] of steps.entries()) {
		try {
			executeStep(step);
			emitScriptDebugEvent({
				action: 'step_executed',
				callback: context.callback,
				elementId: context.elementId,
				hasConsent: context.hasConsent,
				message: `Executed ${step.type}`,
				phase: context.phase,
				scope: 'step',
				scriptId: context.scriptId,
				source: 'manifest-runtime',
				stepIndex,
				stepType: step.type,
			});
		} catch (error) {
			emitScriptDebugEvent({
				action: 'step_error',
				callback: context.callback,
				data: {
					error:
						// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
						error instanceof Error
							? error.message
							: typeof error === 'string'
								? error
								: 'Unknown error',
				},
				elementId: context.elementId,
				hasConsent: context.hasConsent,
				message: `Failed to execute ${step.type}`,
				phase: context.phase,
				scope: 'step',
				scriptId: context.scriptId,
				source: 'manifest-runtime',
				stepIndex,
				stepType: step.type,
			});
			throw error;
		}
	}

	emitScriptDebugEvent({
		action: 'phase_complete',
		callback: context.callback,
		data: {
			stepCount: steps.length,
		},
		elementId: context.elementId,
		hasConsent: context.hasConsent,
		message: `Manifest phase ${context.phase} completed`,
		phase: context.phase,
		scope: 'phase',
		scriptId: context.scriptId,
		source: 'manifest-runtime',
	});
};

const mapConsentState = function mapConsentState(
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
};

const partitionConsentIds = function partitionConsentIds(
	mapping: Record<string, string[]>,
	consents: ConsentState
): { allowedConsentIds: string[]; deniedConsentIds: string[] } {
	const allowedConsentIds: string[] = [];
	const deniedConsentIds: string[] = [];

	for (const [c15tCategory, consentIds] of Object.entries(mapping)) {
		const isGranted = (consents as Record<string, boolean>)[c15tCategory];
		for (const consentId of consentIds) {
			(isGranted ? allowedConsentIds : deniedConsentIds).push(consentId);
		}
	}

	return { allowedConsentIds, deniedConsentIds };
};

const getConsentSignalSteps = function getConsentSignalSteps(
	resolvedManifest: ResolvedManifest,
	mode: 'default' | 'update',
	consents: ConsentState
): ManifestStep[] {
	if (!resolvedManifest.consentMapping || !resolvedManifest.consentSignal) {
		return [];
	}

	// oxlint-disable-next-line default-case -- Preserve established branch order and control flow.
	switch (resolvedManifest.consentSignal) {
		case 'gtag': {
			const mapped = mapConsentState(resolvedManifest.consentMapping, consents);

			return [
				{
					args: ['consent', mode, mapped],
					global: resolvedManifest.consentSignalTarget ?? 'gtag',
					type: 'callGlobal',
				},
			];
		}

		case 'rudderstack': {
			// RudderStack's consent() call carries the full allow/deny partition
			// each time, so the default and update modes share one shape. The
			// pre-load call is captured by the snippet queue and replayed by the
			// SDK as its initial consent state. c15t is the CMP, so the provider
			// is always 'custom'.
			const partition = partitionConsentIds(
				resolvedManifest.consentMapping,
				consents
			);

			return [
				{
					args: [
						{
							consentManagement: {
								allowedConsentIds: partition.allowedConsentIds,
								deniedConsentIds: partition.deniedConsentIds,
								enabled: true,
								provider: 'custom',
							},
						},
					],
					global: resolvedManifest.consentSignalTarget ?? 'rudderanalytics',
					method: 'consent',
					type: 'callGlobal',
				},
			];
		}
	}
};

export const resolvedManifestToScript = function resolvedManifestToScript(
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
		alwaysLoad: resolvedManifest.alwaysLoad,
		async: resolvedManifest.loadScript?.async,
		attributes: resolvedManifest.loadScript?.attributes,
		callbackOnly: resolvedManifest.loadScript ? undefined : true,
		category: resolvedManifest.category as Script['category'],
		defer: resolvedManifest.loadScript?.defer,
		id: resolvedManifest.vendor,
		persistAfterConsentRevoked: resolvedManifest.persistAfterConsentRevoked,
		src: resolvedManifest.loadScript?.src,
	};

	if (
		resolvedManifest.bootstrapSteps.length > 0 ||
		resolvedManifest.setupSteps.length > 0 ||
		resolvedManifest.onBeforeLoadGrantedSteps.length > 0 ||
		resolvedManifest.onBeforeLoadDeniedSteps.length > 0 ||
		hasConsentMapping
	) {
		script.onBeforeLoad = (info: ScriptCallbackInfo) => {
			const baseContext = {
				callback: 'onBeforeLoad' as const,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				scriptId: resolvedManifest.vendor,
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
		script.onLoad = (info: ScriptCallbackInfo) => {
			const baseContext = {
				callback: 'onLoad' as const,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				scriptId: resolvedManifest.vendor,
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
		script.onLoad = (info: ScriptCallbackInfo) => {
			const baseContext = {
				callback: 'onLoad' as const,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				scriptId: resolvedManifest.vendor,
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
		script.onConsentChange = (info: ScriptCallbackInfo) => {
			const baseContext = {
				callback: 'onConsentChange' as const,
				elementId: info.elementId,
				hasConsent: info.hasConsent,
				scriptId: resolvedManifest.vendor,
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
};
